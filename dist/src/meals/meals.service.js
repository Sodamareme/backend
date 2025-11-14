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
exports.MealsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MealsService = class MealsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findLearnerByMatricule(matricule) {
        const learner = await this.prisma.learner.findUnique({
            where: { matricule },
            include: {
                user: true,
            },
        });
        if (!learner) {
            throw new common_1.NotFoundException('Apprenant non trouvé');
        }
        return learner;
    }
    async scanMeal(matricule, type) {
        const learner = await this.findLearnerByMatricule(matricule);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingMeal = await this.prisma.meal.findFirst({
            where: {
                learnerId: learner.id,
                date: today,
                type,
            },
        });
        if (existingMeal) {
            throw new Error('Le repas a déjà été scanné aujourd\'hui');
        }
        return this.prisma.meal.create({
            data: {
                date: today,
                type,
                learnerId: learner.id,
            },
            include: {
                learner: true,
            },
        });
    }
    async getDailyStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const breakfastCount = await this.prisma.meal.count({
            where: {
                date: today,
                type: 'BREAKFAST',
            },
        });
        const lunchCount = await this.prisma.meal.count({
            where: {
                date: today,
                type: 'LUNCH',
            },
        });
        return {
            date: today,
            breakfast: breakfastCount,
            lunch: lunchCount,
            total: breakfastCount + lunchCount,
        };
    }
    async getMonthlyStats(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const meals = await this.prisma.meal.groupBy({
            by: ['date', 'type'],
            _count: {
                _all: true,
            },
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const stats = meals.reduce((acc, curr) => {
            const date = curr.date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { breakfast: 0, lunch: 0 };
            }
            acc[date][curr.type.toLowerCase()] = curr._count._all;
            return acc;
        }, {});
        return {
            year,
            month,
            dailyStats: stats,
        };
    }
    async getLearnerMealHistory(learnerId) {
        const learner = await this.prisma.learner.findUnique({
            where: { id: learnerId },
        });
        if (!learner) {
            throw new common_1.NotFoundException('Apprenant non trouvé');
        }
        return this.prisma.meal.findMany({
            where: {
                learnerId,
            },
            orderBy: {
                date: 'desc',
            },
            include: {
                learner: true,
            },
        });
    }
    async getLatestScans() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return this.prisma.meal.findMany({
            where: {
                date: today,
            },
            include: {
                learner: {
                    include: {
                        referential: true,
                        promotion: true
                    }
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: 10,
        });
    }
};
exports.MealsService = MealsService;
exports.MealsService = MealsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MealsService);
//# sourceMappingURL=meals.service.js.map