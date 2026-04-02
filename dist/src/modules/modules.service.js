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
var ModulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let ModulesService = ModulesService_1 = class ModulesService {
    constructor(prisma, cloudinary) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
        this.logger = new common_1.Logger(ModulesService_1.name);
    }
    async create(data, photoFile) {
        this.logger.log(`Création d’un module : ${data.name}`);
        let photoUrl;
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw new common_1.BadRequestException('Dates de module invalides');
        }
        if (startDate > endDate) {
            throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
        }
        if (photoFile) {
            try {
                const uploadResult = await this.cloudinary.uploadFile(photoFile, 'modules');
                photoUrl = uploadResult.url;
            }
            catch (error) {
                this.logger.error('Erreur upload Cloudinary', error);
                throw new common_1.BadRequestException('Échec de l’upload de la photo');
            }
        }
        return this.prisma.module.create({
            data: {
                name: data.name,
                description: data.description,
                startDate,
                endDate,
                photoUrl,
                coach: { connect: { id: data.coachId } },
                referential: { connect: { id: data.refId } },
            },
        });
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return this.prisma.module.findMany({
            skip,
            take: limit,
            orderBy: { startDate: 'desc' },
            include: {
                coach: {
                    select: { id: true, firstName: true, lastName: true },
                },
                referential: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    async findOne(id) {
        const module = await this.prisma.module.findUnique({
            where: { id },
            include: {
                coach: {
                    select: { id: true, firstName: true, lastName: true },
                },
                referential: {
                    select: { id: true, name: true },
                },
                grades: {
                    select: { id: true, value: true },
                },
            },
        });
        if (!module) {
            throw new common_1.NotFoundException('Module non trouvé');
        }
        return module;
    }
    async update(id, data) {
        const existingModule = await this.findOne(id);
        const updateData = {};
        if (data.name !== undefined) {
            updateData.name = data.name;
        }
        if (data.description !== undefined) {
            updateData.description = data.description;
        }
        if (data.photoUrl !== undefined) {
            updateData.photoUrl = data.photoUrl;
        }
        if (data.startDate !== undefined) {
            const startDate = new Date(data.startDate);
            if (Number.isNaN(startDate.getTime())) {
                throw new common_1.BadRequestException('Date de début invalide');
            }
            updateData.startDate = startDate;
        }
        if (data.endDate !== undefined) {
            const endDate = new Date(data.endDate);
            if (Number.isNaN(endDate.getTime())) {
                throw new common_1.BadRequestException('Date de fin invalide');
            }
            updateData.endDate = endDate;
        }
        const effectiveStartDate = updateData.startDate instanceof Date ? updateData.startDate : existingModule.startDate;
        const effectiveEndDate = updateData.endDate instanceof Date ? updateData.endDate : existingModule.endDate;
        if (effectiveStartDate > effectiveEndDate) {
            throw new common_1.BadRequestException('La date de début doit être antérieure à la date de fin');
        }
        if (data.coachId !== undefined) {
            updateData.coach = { connect: { id: data.coachId } };
        }
        if (data.refId !== undefined) {
            updateData.referential = { connect: { id: data.refId } };
        }
        if (data.sessionId !== undefined) {
            updateData.session = data.sessionId ? { connect: { id: data.sessionId } } : { disconnect: true };
        }
        return this.prisma.module.update({
            where: { id },
            data: updateData,
            include: {
                coach: {
                    select: { id: true, firstName: true, lastName: true },
                },
                referential: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    async addGrade(data) {
        await this.findOne(data.moduleId);
        return this.prisma.grade.create({
            data: {
                value: data.value,
                comment: data.comment,
                moduleId: data.moduleId,
                learnerId: data.learnerId,
            },
            include: {
                learner: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async updateGrade(moduleId, gradeId, data) {
        await this.findOne(moduleId);
        const existingGrade = await this.prisma.grade.findFirst({
            where: {
                id: gradeId,
                moduleId,
            },
            select: { id: true },
        });
        if (!existingGrade) {
            throw new common_1.NotFoundException('Note introuvable pour ce module');
        }
        return this.prisma.grade.update({
            where: { id: gradeId },
            data,
            include: {
                learner: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getActiveModules() {
        const now = new Date();
        return this.prisma.module.findMany({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                referential: { select: { id: true, name: true } },
                coach: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async getModulesByReferential(refId) {
        return this.prisma.module.findMany({
            where: { refId },
            include: {
                coach: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getGradesByModule(moduleId) {
        const module = await this.prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                grades: {
                    include: {
                        learner: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                matricule: true,
                                photoUrl: true,
                                referential: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!module)
            throw new common_1.NotFoundException(`Module ${moduleId} introuvable`);
        return module.grades.map((grade) => ({
            id: grade.id,
            value: grade.value,
            comment: grade.comment,
            createdAt: grade.createdAt,
            learner: grade.learner,
        }));
    }
};
exports.ModulesService = ModulesService;
exports.ModulesService = ModulesService = ModulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService])
], ModulesService);
//# sourceMappingURL=modules.service.js.map