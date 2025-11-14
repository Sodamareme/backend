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
exports.MealScansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MealScansService = class MealScansService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, restaurateurId) {
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const existing = await this.prisma.mealScan.findFirst({
            where: {
                learnerId: dto.learnerId,
                type: dto.type,
                scannedAt: { gte: startOfDay },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`L'apprenant a déjà pris le ${dto.type === 'BREAKFAST' ? 'petit déjeuner' : 'déjeuner'} aujourd'hui.`);
        }
        return this.prisma.mealScan.create({
            data: {
                learnerId: dto.learnerId,
                type: dto.type,
                restaurateurId,
            },
            include: {
                learner: true,
                restaurateur: true,
            },
        });
    }
    async findToday() {
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        return this.prisma.mealScan.findMany({
            where: { scannedAt: { gte: startOfDay } },
            include: {
                learner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        photoUrl: true,
                    }
                },
                restaurateur: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            },
            orderBy: { scannedAt: 'desc' },
        });
    }
    async findByLearner(learnerId) {
        return this.prisma.meal.findMany({
            where: {
                learnerId: learnerId
            }
        });
    }
    async findByMatricule(learnerMatricule) {
        return this.prisma.meal.findFirst({
            where: {
                learner: {
                    matricule: learnerMatricule
                }
            }
        });
    }
};
exports.MealScansService = MealScansService;
exports.MealScansService = MealScansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MealScansService);
//# sourceMappingURL=meal-scans.service.js.map