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
var GradesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GradesService = GradesService_1 = class GradesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GradesService_1.name);
    }
    async create(createGradeDto) {
        const { moduleId, learnerId, value, comment } = createGradeDto;
        try {
            const module = await this.prisma.module.findUnique({
                where: { id: moduleId },
            });
            if (!module) {
                throw new common_1.NotFoundException('Module non trouvé');
            }
            const learner = await this.prisma.learner.findUnique({
                where: { id: learnerId },
            });
            if (!learner) {
                this.logger.error(`❌ Learner not found with ID: ${learnerId}`);
                throw new common_1.NotFoundException('Apprenant non trouvé');
            }
            const existingGrade = await this.prisma.grade.findFirst({
                where: {
                    moduleId,
                    learnerId,
                },
            });
            if (existingGrade) {
                throw new common_1.ConflictException('Une note existe déjà pour cet apprenant dans ce module');
            }
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
        }
        catch (error) {
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
        }
        catch (error) {
            this.logger.error('❌ Error fetching all grades:', error);
            throw new common_1.BadRequestException('Erreur lors de la récupération des notes');
        }
    }
    async findOne(id) {
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
                throw new common_1.NotFoundException('Note non trouvée');
            }
            return grade;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('❌ Error fetching grade:', error);
            throw new common_1.BadRequestException('Erreur lors de la récupération de la note');
        }
    }
    async update(id, updateGradeDto) {
        try {
            const grade = await this.prisma.grade.findUnique({
                where: { id },
            });
            if (!grade) {
                throw new common_1.NotFoundException('Note non trouvée');
            }
            const data = {};
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('❌ Error updating grade:', error);
            throw new common_1.BadRequestException('Erreur lors de la mise à jour de la note');
        }
    }
    async remove(id) {
        try {
            const grade = await this.prisma.grade.findUnique({
                where: { id },
            });
            if (!grade) {
                throw new common_1.NotFoundException('Note non trouvée');
            }
            await this.prisma.grade.delete({
                where: { id },
            });
            this.logger.log(`✅ Grade deleted successfully: ${id}`);
            return { message: 'Note supprimée avec succès' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('❌ Error deleting grade:', error);
            throw new common_1.BadRequestException('Erreur lors de la suppression de la note');
        }
    }
    async getGradesByLearner(learnerId) {
        try {
            this.logger.log(`🔍 Fetching grades for learner: ${learnerId}`);
            const learner = await this.prisma.learner.findUnique({
                where: { id: learnerId },
            });
            if (!learner) {
                throw new common_1.NotFoundException('Apprenant non trouvé');
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('❌ Error fetching learner grades:', error);
            throw new common_1.BadRequestException('Erreur lors de la récupération des notes de l\'apprenant');
        }
    }
    async getGradesByModule(moduleId) {
        try {
            this.logger.log(`🔍 Fetching grades for module: ${moduleId}`);
            const module = await this.prisma.module.findUnique({
                where: { id: moduleId },
            });
            if (!module) {
                this.logger.warn(`⚠️ Module not found: ${moduleId}`);
                throw new common_1.NotFoundException('Module non trouvé');
            }
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`❌ Error fetching grades for module ${moduleId}:`, error);
            if (error instanceof Error) {
                this.logger.error(`Error name: ${error.name}`);
                this.logger.error(`Error message: ${error.message}`);
                this.logger.error(`Error stack: ${error.stack}`);
            }
            throw new common_1.BadRequestException(`Erreur lors de la récupération des notes du module: ${error.message}`);
        }
    }
};
exports.GradesService = GradesService;
exports.GradesService = GradesService = GradesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GradesService);
//# sourceMappingURL=grades.service.js.map