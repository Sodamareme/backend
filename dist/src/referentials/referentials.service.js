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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferentialsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReferentialsService = class ReferentialsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const { numberOfSessions, sessionLength, ...referentialData } = data;
        return this.prisma.$transaction(async (prisma) => {
            const referential = await prisma.referential.create({
                data: {
                    ...referentialData,
                    numberOfSessions,
                    sessionLength: numberOfSessions > 1 ? sessionLength : null,
                },
            });
            if (numberOfSessions > 1) {
                await prisma.session.create({
                    data: {
                        name: 'Session 1',
                        capacity: data.capacity,
                        referentialId: referential.id,
                    },
                });
                await prisma.session.create({
                    data: {
                        name: 'Session 2',
                        capacity: data.capacity,
                        referentialId: referential.id,
                    },
                });
            }
            return prisma.referential.findUnique({
                where: { id: referential.id },
                include: {
                    sessions: true,
                    learners: true,
                    coaches: true,
                    modules: true,
                },
            });
        });
    }
    async findAll() {
        return this.prisma.referential.findMany({
            include: {
                learners: true,
                coaches: true,
                modules: true,
            },
        });
    }
    async findAllReferentials() {
        return this.prisma.referential.findMany({});
    }
    async findOne(id) {
        const referential = await this.prisma.referential.findUnique({
            where: { id },
            include: {
                sessions: {
                    include: {
                        learners: true,
                        modules: true,
                    }
                },
                learners: true,
                coaches: true,
                modules: true,
            },
        });
        if (!referential) {
            throw new common_1.NotFoundException('Référentiel non trouvé');
        }
        return referential;
    }
    async update(id, data) {
        const referential = await this.findOne(id);
        return this.prisma.referential.update({
            where: { id },
            data,
            include: {
                learners: true,
                coaches: true,
                modules: true,
            },
        });
    }
    async getStatistics(id) {
        const referential = await this.findOne(id);
        const stats = {
            totalLearners: 0,
            activeModules: 0,
            totalCoaches: await this.prisma.coach.count({
                where: { refId: id },
            }),
            capacity: referential.capacity,
            availableSpots: 0,
            sessions: [],
        };
        if (referential.numberOfSessions > 1 && referential.sessions) {
            for (const session of referential.sessions) {
                const sessionStats = {
                    sessionId: session.id,
                    name: session.name,
                    totalLearners: await this.prisma.learner.count({
                        where: { sessionId: session.id },
                    }),
                    activeModules: await this.prisma.module.count({
                        where: {
                            sessionId: session.id,
                            endDate: { gte: new Date() },
                            startDate: { lte: new Date() },
                        },
                    }),
                };
                stats.sessions.push(sessionStats);
                stats.totalLearners += sessionStats.totalLearners;
                stats.activeModules += sessionStats.activeModules;
            }
        }
        else {
            stats.totalLearners = await this.prisma.learner.count({
                where: { refId: id },
            });
            stats.activeModules = await this.prisma.module.count({
                where: {
                    refId: id,
                    endDate: { gte: new Date() },
                    startDate: { lte: new Date() },
                },
            });
        }
        stats.availableSpots = stats.capacity - stats.totalLearners;
        return stats;
    }
    async getSessionStatistics(sessionId) {
        const totalLearners = await this.prisma.learner.count({
            where: { sessionId },
        });
        const activeModules = await this.prisma.module.count({
            where: {
                sessionId,
                endDate: { gte: new Date() },
                startDate: { lte: new Date() },
            },
        });
        return {
            sessionId,
            totalLearners,
            activeModules,
        };
    }
    async assignToPromotion(referentialIds, promotionId) {
        return this.prisma.promotion.update({
            where: { id: promotionId },
            data: {
                referentials: {
                    connect: referentialIds.map(id => ({ id })),
                },
            },
            include: {
                referentials: true,
            },
        });
    }
};
exports.ReferentialsService = ReferentialsService;
exports.ReferentialsService = ReferentialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferentialsService);
//# sourceMappingURL=referentials.service.js.map