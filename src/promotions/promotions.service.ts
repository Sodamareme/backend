import { Injectable, ConflictException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Promotion, PromotionStatus } from '@prisma/client';
import * as fs from 'fs';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(data: CreatePromotionDto, photoFile?: Express.Multer.File): Promise<Promotion> {
    try {
      // 1. Handle photo upload first, with optimized settings
      let photoUrl: string | undefined;
      if (photoFile) {
        try {
          // Compress image if needed
          if (photoFile.size > 1024 * 1024) { // If larger than 1MB
            this.logger.log('Large file detected, compression might be needed');
          }

          const uploadResult = await this.cloudinary.uploadFile(photoFile, 'promotions');
          photoUrl = uploadResult.url;
        } catch (error) {
          this.logger.error('Photo upload failed:', error);
          if (error.http_code === 499) {
            throw new Error('Photo upload timed out. Please try with a smaller file or better connection.');
          }
          throw new Error('Failed to upload photo. Please try again.');
        }
      }

      // 2. Process referential IDs
      const referentialIds = Array.isArray(data.referentialIds) 
        ? data.referentialIds 
        : data.referentialIds?.split(',').map(id => id.trim()) ?? [];

      // 3. Create promotion in transaction
      const newPromotion = await this.prisma.$transaction(async (prisma) => {
        // Check active promotion
        const activePromotion = await prisma.promotion.findFirst({
          where: { status: PromotionStatus.ACTIVE }
        });

        // Verify all referentials exist
        if (referentialIds.length > 0) {
          const existingRefs = await prisma.referential.findMany({
            where: { id: { in: referentialIds } },
            select: { id: true }
          });

          if (existingRefs.length !== referentialIds.length) {
            const foundIds = new Set(existingRefs.map(ref => ref.id));
            const missingIds = referentialIds.filter(id => !foundIds.has(id));
            throw new NotFoundException(`Referentials not found: ${missingIds.join(', ')}`);
          }
        }

        // Create the promotion
        return prisma.promotion.create({
          data: {
            name: data.name,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            photoUrl,
            status: activePromotion ? PromotionStatus.INACTIVE : PromotionStatus.ACTIVE,
            referentials: referentialIds.length > 0 
              ? { connect: referentialIds.map(id => ({ id })) }
              : undefined
          },
          include: {
            referentials: true,
            learners: true
          }
        });
      }, {
        timeout: 30000, // 30 second timeout for the transaction
        maxWait: 35000  // Maximum time to wait for transaction
      });

      // 4. Update session dates after promotion creation
      if (referentialIds.length > 0) {
        await this.updateSessionDatesInBatches(newPromotion.id, referentialIds);
      }

      return newPromotion;
    } catch (error) {
      this.logger.error('Failed to create promotion:', error);
      
      if (error.message.includes('upload')) {
        throw new BadRequestException(error.message);
      }
      
      throw error;
    }
  }

  // New helper method to update session dates in batches
  private async updateSessionDatesInBatches(promotionId: string, referentialIds: string[]) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    // Process referentials in batches of 5
    const batchSize = 5;
    for (let i = 0; i < referentialIds.length; i += batchSize) {
      const batch = referentialIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (refId) => {
          const referential = await this.prisma.referential.findUnique({
            where: { id: refId },
            include: { sessions: true },
          });

          if (referential?.numberOfSessions > 1 && referential.sessions?.length === 2) {
            const sessionLength = referential.sessionLength || 4;
            const session1EndDate = new Date(promotion.startDate);
            session1EndDate.setMonth(session1EndDate.getMonth() + sessionLength);

            await this.prisma.$transaction([
              this.prisma.session.update({
                where: { id: referential.sessions[0].id },
                data: {
                  startDate: promotion.startDate,
                  endDate: session1EndDate,
                },
              }),
              this.prisma.session.update({
                where: { id: referential.sessions[1].id },
                data: {
                  startDate: session1EndDate,
                  endDate: promotion.endDate,
                },
              }),
            ]);
          }
        })
      );
    }
  }

  async findAll(): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      include: {
        learners: true,
        referentials: true,
      },
    });
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        referentials: true,
        learners: true,
        events: true,
      }
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }

    return promotion;
  }

  async update(id: string, data: Partial<Promotion>): Promise<Promotion> {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        // First check if promotion exists
        const promotion = await prisma.promotion.findUnique({
          where: { id },
          include: {
            referentials: true,
            learners: true,
          }
        });

        if (!promotion) {
          throw new NotFoundException(`Promotion with ID ${id} not found`);
        }

        // Handle status change
        if (data.status !== undefined) {
          if (data.status === PromotionStatus.ACTIVE) {
            // Find any currently active promotion
            const activePromotion = await prisma.promotion.findFirst({
              where: {
                status: PromotionStatus.ACTIVE,
                id: { not: id }, // Exclude current promotion
              },
            });

            if (activePromotion) {
              this.logger.log(`Deactivating current active promotion: ${activePromotion.id}`);
              // Deactivate the currently active promotion
              await prisma.promotion.update({
                where: { id: activePromotion.id },
                data: { status: PromotionStatus.INACTIVE }
              });
            }
          }
        }

        // Update the target promotion
        const updatedPromotion = await prisma.promotion.update({
          where: { id },
          data,
          include: {
            learners: true,
            referentials: true,
          },
        });

        this.logger.log(`Successfully updated promotion ${id} status to ${updatedPromotion.status}`);
        return updatedPromotion;
      }, {
        timeout: 30000, // 30 second timeout
        maxWait: 35000  // Maximum time to wait
      });
    } catch (error) {
      this.logger.error(`Error updating promotion ${id}:`, error);
      throw error;
    }
  }

  async getActivePromotion(): Promise<Promotion> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { status: PromotionStatus.ACTIVE },
      include: {
        learners: true,
        referentials: true,
        events: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException('Aucune promotion active trouvée');
    }

    return promotion;
  }

  async getStatistics(id: string) {
    const promotion = await this.findOne(id);
    const learners = await this.prisma.learner.findMany({
      where: { promotionId: id },
    });

    const totalLearners = learners.length;
    const femaleLearners = learners.filter(l => l.gender === 'FEMALE').length;
    const feminizationRate = totalLearners > 0 ? (femaleLearners / totalLearners) * 100 : 0;

    const activeModules = await this.prisma.module.count({
      where: {
        referential: {
          promotions: { some: { id } },
        },
        endDate: {
          gte: new Date(),
        },
        startDate: {
          lte: new Date(),
        },
      },
    });

    const upcomingEvents = await this.prisma.event.count({
      where: {
        promotionId: id,
        startDate: {
          gte: new Date(),
        },
      },
    });

    return {
      totalLearners,
      feminizationRate,
      activeModules,
      upcomingEvents,
    };
  }

  // Add method to handle adding referentials to an existing promotion
  async addReferentials(promotionId: string, referentialIds: string[]) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        referentials: true
      }
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      // Connect referentials to promotion
      const updatedPromotion = await prisma.promotion.update({
        where: { id: promotionId },
        data: {
          referentials: {
            connect: referentialIds.map(id => ({ id })),
          },
        },
        include: {
          referentials: true,
          learners: true,
        },
      });

      // Update session dates for each referential
      for (const refId of referentialIds) {
        const referential = await prisma.referential.findUnique({
          where: { id: refId },
          include: { sessions: true },
        });

        if (referential?.numberOfSessions > 1 && referential.sessions?.length === 2) {
          const sessionLength = referential.sessionLength || 4;
          const session1EndDate = new Date(promotion.startDate);
          session1EndDate.setMonth(session1EndDate.getMonth() + sessionLength);

          await this.prisma.$transaction([
            prisma.session.update({
              where: { id: referential.sessions[0].id },
              data: {
                startDate: promotion.startDate,
                endDate: session1EndDate,
              },
            }),
            prisma.session.update({
              where: { id: referential.sessions[1].id },
              data: {
                startDate: session1EndDate,
                endDate: promotion.endDate,
              },
            }),
          ]);
        }
      }

      return updatedPromotion;
    });
  }
}