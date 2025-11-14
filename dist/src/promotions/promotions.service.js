"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PromotionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const client_1 = require("@prisma/client");
let PromotionsService = PromotionsService_1 = class PromotionsService {
    constructor(prisma, cloudinary) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
        this.logger = new common_1.Logger(PromotionsService_1.name);
    }
    async create(data, photoFile) {
        try {
            let photoUrl;
            if (photoFile) {
                try {
                    if (photoFile.size > 1024 * 1024) {
                        this.logger.log('Large file detected, compression might be needed');
                    }
                    const uploadResult = await this.cloudinary.uploadFile(photoFile, 'promotions');
                    photoUrl = uploadResult.url;
                }
                catch (error) {
                    this.logger.error('Photo upload failed:', error);
                    if (error.http_code === 499) {
                        throw new Error('Photo upload timed out. Please try with a smaller file or better connection.');
                    }
                    throw new Error('Failed to upload photo. Please try again.');
                }
            }
            const referentialIds = Array.isArray(data.referentialIds)
                ? data.referentialIds
                : data.referentialIds?.split(',').map(id => id.trim()) ?? [];
            const newPromotion = await this.prisma.$transaction(async (prisma) => {
                const activePromotion = await prisma.promotion.findFirst({
                    where: { status: client_1.PromotionStatus.ACTIVE }
                });
                if (referentialIds.length > 0) {
                    const existingRefs = await prisma.referential.findMany({
                        where: { id: { in: referentialIds } },
                        select: { id: true }
                    });
                    if (existingRefs.length !== referentialIds.length) {
                        const foundIds = new Set(existingRefs.map(ref => ref.id));
                        const missingIds = referentialIds.filter(id => !foundIds.has(id));
                        throw new common_1.NotFoundException(`Referentials not found: ${missingIds.join(', ')}`);
                    }
                }
                return prisma.promotion.create({
                    data: {
                        name: data.name,
                        startDate: new Date(data.startDate),
                        endDate: new Date(data.endDate),
                        photoUrl,
                        status: activePromotion ? client_1.PromotionStatus.INACTIVE : client_1.PromotionStatus.ACTIVE,
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
                timeout: 30000,
                maxWait: 35000
            });
            if (referentialIds.length > 0) {
                await this.updateSessionDatesInBatches(newPromotion.id, referentialIds);
            }
            return newPromotion;
        }
        catch (error) {
            this.logger.error('Failed to create promotion:', error);
            if (error.message.includes('upload')) {
                throw new common_1.BadRequestException(error.message);
            }
            throw error;
        }
    }
    async updateSessionDatesInBatches(promotionId, referentialIds) {
        const promotion = await this.prisma.promotion.findUnique({
            where: { id: promotionId },
        });
        const batchSize = 5;
        for (let i = 0; i < referentialIds.length; i += batchSize) {
            const batch = referentialIds.slice(i, i + batchSize);
            await Promise.all(batch.map(async (refId) => {
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
            }));
        }
    }
    async findAll() {
        return this.prisma.promotion.findMany({
            include: {
                learners: true,
                referentials: true,
            },
        });
    }
    async findOne(id) {
        const promotion = await this.prisma.promotion.findUnique({
            where: { id },
            include: {
                referentials: true,
                learners: true,
                events: true,
            }
        });
        if (!promotion) {
            throw new common_1.NotFoundException(`Promotion with ID ${id} not found`);
        }
        return promotion;
    }
    async update(id, data) {
        try {
            return await this.prisma.$transaction(async (prisma) => {
                const promotion = await prisma.promotion.findUnique({
                    where: { id },
                    include: {
                        referentials: true,
                        learners: true,
                    }
                });
                if (!promotion) {
                    throw new common_1.NotFoundException(`Promotion with ID ${id} not found`);
                }
                if (data.status !== undefined) {
                    if (data.status === client_1.PromotionStatus.ACTIVE) {
                        const activePromotion = await prisma.promotion.findFirst({
                            where: {
                                status: client_1.PromotionStatus.ACTIVE,
                                id: { not: id },
                            },
                        });
                        if (activePromotion) {
                            this.logger.log(`Deactivating current active promotion: ${activePromotion.id}`);
                            await prisma.promotion.update({
                                where: { id: activePromotion.id },
                                data: { status: client_1.PromotionStatus.INACTIVE }
                            });
                        }
                    }
                }
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
                timeout: 30000,
                maxWait: 35000
            });
        }
        catch (error) {
            this.logger.error(`Error updating promotion ${id}:`, error);
            throw error;
        }
    }
    async getActivePromotion() {
        const promotion = await this.prisma.promotion.findFirst({
            where: { status: client_1.PromotionStatus.ACTIVE },
            include: {
                learners: true,
                referentials: true,
                events: true,
            },
        });
        if (!promotion) {
            throw new common_1.NotFoundException('Aucune promotion active trouvée');
        }
        return promotion;
    }
    async getStatistics(id) {
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
    async addReferentials(promotionId, referentialIds) {
        const promotion = await this.prisma.promotion.findUnique({
            where: { id: promotionId },
            include: {
                referentials: true
            }
        });
        if (!promotion) {
            throw new common_1.NotFoundException('Promotion not found');
        }
        return this.prisma.$transaction(async (prisma) => {
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
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = PromotionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map