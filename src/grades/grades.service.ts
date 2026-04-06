// grades.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

type GradeUpdateData = Pick<Prisma.GradeUncheckedUpdateInput, 'value' | 'comment'>;

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createGradeDto: CreateGradeDto) {
    const { moduleId, learnerId, value, comment } = createGradeDto;

    try {
      // ✅ Verify module exists
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Module non trouvé');
      }

      // ✅ Verify learner exists in the Learner table
      const learner = await this.prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        this.logger.error(`❌ Learner not found with ID: ${learnerId}`);
        throw new NotFoundException('Apprenant non trouvé');
      }

      // ✅ Check if grade already exists
      const existingGrade = await this.prisma.grade.findFirst({
        where: {
          moduleId,
          learnerId,
        },
      });

      if (existingGrade) {
        throw new ConflictException('Une note existe déjà pour cet apprenant dans ce module');
      }

      // ✅ Create the grade
      const grade = await this.prisma.grade.create({
        data: {
          moduleId,
          learnerId,
          value,
          comment: comment || '',
        },
        include: {
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
              status: true,
              refId: true,
            },
          },
          module: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
              refId: true,
            },
          },
        },
      });

      this.logger.log(`✅ Grade created successfully: ${grade.id}`);
      return grade;
    } catch (error) {
      this.logger.error('❌ Error creating grade:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.grade.findMany({
        include: {
          module: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
            },
          },
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.logger.error('❌ Error fetching all grades:', error);
      throw new BadRequestException('Erreur lors de la récupération des notes');
    }
  }

  async findOne(id: string) {
    try {
      const grade = await this.prisma.grade.findUnique({
        where: { id },
        include: {
          module: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
            },
          },
        },
      });

      if (!grade) {
        throw new NotFoundException('Note non trouvée');
      }

      return grade;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Error fetching grade:', error);
      throw new BadRequestException('Erreur lors de la récupération de la note');
    }
  }

  async update(id: string, updateGradeDto: UpdateGradeDto) {
    try {
      const grade = await this.prisma.grade.findUnique({
        where: { id },
      });

      if (!grade) {
        throw new NotFoundException('Note non trouvée');
      }

      const data: GradeUpdateData = {};

      if (updateGradeDto.value !== undefined) {
        data.value = updateGradeDto.value;
      }

      if (updateGradeDto.comment !== undefined) {
        data.comment = updateGradeDto.comment;
      }

      const updated = await this.prisma.grade.update({
        where: { id },
        data,
        include: {
          module: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
            },
          },
        },
      });

      this.logger.log(`✅ Grade updated successfully: ${id}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Error updating grade:', error);
      throw new BadRequestException('Erreur lors de la mise à jour de la note');
    }
  }

  async remove(id: string) {
    try {
      const grade = await this.prisma.grade.findUnique({
        where: { id },
      });

      if (!grade) {
        throw new NotFoundException('Note non trouvée');
      }

      await this.prisma.grade.delete({
        where: { id },
      });

      this.logger.log(`✅ Grade deleted successfully: ${id}`);
      return { message: 'Note supprimée avec succès' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Error deleting grade:', error);
      throw new BadRequestException('Erreur lors de la suppression de la note');
    }
  }

  async getGradesByLearner(learnerId: string) {
    try {
      this.logger.log(`🔍 Fetching grades for learner: ${learnerId}`);

      // Vérifier que l'apprenant existe
      const learner = await this.prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        throw new NotFoundException('Apprenant non trouvé');
      }

      const grades = await this.prisma.grade.findMany({
        where: { learnerId },
        include: {
          module: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
            },
          },
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`✅ Found ${grades.length} grades for learner ${learnerId}`);
      return grades;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Error fetching learner grades:', error);
      throw new BadRequestException('Erreur lors de la récupération des notes de l\'apprenant');
    }
  }

  // ✅ CORRECTION PRINCIPALE ICI
  async getGradesByModule(moduleId: string) {
    try {
      this.logger.log(`🔍 Fetching grades for module: ${moduleId}`);
      
      // Vérifier que le module existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        this.logger.warn(`⚠️ Module not found: ${moduleId}`);
        throw new NotFoundException('Module non trouvé');
      }

      // ✅ Récupérer les notes SANS inclure les relations profondes qui causent l'erreur
      const grades = await this.prisma.grade.findMany({
        where: { moduleId },
        include: {
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              photoUrl: true,
              status: true,
              refId: true,
            },
          },
          module: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
              photoUrl: true,
              refId: true,
              coachId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`✅ Found ${grades.length} grades for module ${moduleId}`);
      return grades;
      
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`❌ Error fetching grades for module ${moduleId}:`, error);
      
      // Log détaillé pour déboguer
      if (error instanceof Error) {
        this.logger.error(`Error name: ${error.name}`);
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
      }
      
      throw new BadRequestException(
        `Erreur lors de la récupération des notes du module: ${error.message}`
      );
    }
  }
}
