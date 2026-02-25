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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearnersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const learners_service_1 = require("./learners.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const update_status_dto_1 = require("./dto/update-status.dto");
const BulkCreateLearnerDto_1 = require("./dto/BulkCreateLearnerDto");
const BulkImportResponseDto_1 = require("./dto/BulkImportResponseDto");
const ValidationResponseDto_1 = require("./dto/ValidationResponseDto ");
const public_decorators_1 = require("../auth/decorators/public.decorators");
let LearnersController = class LearnersController {
    constructor(learnersService) {
        this.learnersService = learnersService;
    }
    async create(data, photoFile) {
        console.log('=== BODY BRUT REÇU ===', JSON.stringify(data, null, 2));
        let tutor = {};
        if (data.tutor && typeof data.tutor === 'object' && data.tutor.firstName) {
            tutor = data.tutor;
        }
        else {
            tutor = {
                firstName: data['tutor[firstName]'] ||
                    data['tutor.firstName'] ||
                    data?.tutor?.firstName ||
                    '',
                lastName: data['tutor[lastName]'] ||
                    data['tutor.lastName'] ||
                    data?.tutor?.lastName ||
                    '',
                phone: data['tutor[phone]'] ||
                    data['tutor.phone'] ||
                    data?.tutor?.phone ||
                    '',
                email: data['tutor[email]'] ||
                    data['tutor.email'] ||
                    data?.tutor?.email ||
                    '',
                address: data['tutor[address]'] ||
                    data['tutor.address'] ||
                    data?.tutor?.address ||
                    '',
            };
        }
        console.log('=== TUTOR RECONSTRUIT ===', tutor);
        if (!tutor.firstName || !tutor.lastName || !tutor.phone) {
            throw new common_1.BadRequestException('Les informations du tuteur sont incomplètes (firstName, lastName, phone requis)');
        }
        const cleanDto = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            gender: data.gender,
            birthDate: data.birthDate,
            birthPlace: data.birthPlace,
            promotionId: data.promotionId,
            refId: data.refId || undefined,
            sessionId: data.sessionId || undefined,
            status: data.status || undefined,
            tutor,
        };
        console.log('=== DTO PROPRE ENVOYÉ AU SERVICE ===', JSON.stringify(cleanDto, null, 2));
        return this.learnersService.create(cleanDto, photoFile);
    }
    async validateBulkImport(file) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier fourni');
        }
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
            throw new common_1.BadRequestException('Le fichier doit être au format CSV');
        }
        try {
            const csvContent = file.buffer.toString('utf-8');
            return await this.learnersService.validateBulkCSV(csvContent);
        }
        catch (error) {
            throw new common_1.BadRequestException(`Erreur lors de la validation: ${error.message}`);
        }
    }
    async bulkImport(file, dryRun) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier fourni');
        }
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
            throw new common_1.BadRequestException('Le fichier doit être au format CSV');
        }
        try {
            const csvContent = file.buffer.toString('utf-8');
            const isDryRun = dryRun === 'true';
            return await this.learnersService.processBulkImport(csvContent, isDryRun);
        }
        catch (error) {
            throw new common_1.BadRequestException(`Erreur lors de l'import: ${error.message}`);
        }
    }
    async bulkCreate(bulkCreateDto) {
        return await this.learnersService.bulkCreateLearners(bulkCreateDto.learners);
    }
    async downloadCSVTemplate(req) {
        const csvTemplate = this.learnersService.generateCSVTemplate();
        req.res.setHeader('Content-Type', 'text/csv');
        req.res.setHeader('Content-Disposition', 'attachment; filename="template_import_apprenants.csv"');
        return csvTemplate;
    }
    async findAll() {
        return this.learnersService.findAll();
    }
    async uploadDocument(id, file, type, name) {
        return this.learnersService.uploadDocument(id, file, type, name);
    }
    async getWaitingList(promotionId) {
        return this.learnersService.getWaitingList(promotionId);
    }
    async findOne(id) {
        return this.learnersService.findOne(id);
    }
    async update(id, data) {
        return this.learnersService.update(id, data);
    }
    async updateStatus(id, status) {
        return this.learnersService.updateStatus(id, status);
    }
    async updateKit(id, kitData) {
        return this.learnersService.updateKit(id, kitData);
    }
    async getAttendanceStats(id) {
        return this.learnersService.getAttendanceStats(id);
    }
    async findByEmail(email, req) {
        console.log('Hitting findByEmail endpoint with email:', email);
        if (req.user.role !== client_1.UserRole.ADMIN && req.user.email !== email) {
            throw new common_1.ForbiddenException('You can only access your own data');
        }
        return this.learnersService.findByEmail(email);
    }
    async patchUpdateStatus(id, updateStatusDto) {
        return this.learnersService.updateLearnerStatus(id, updateStatusDto);
    }
    async replaceLearner(replacementDto) {
        return this.learnersService.replaceLearner(replacementDto);
    }
    async getStatusHistory(id) {
        return this.learnersService.getStatusHistory(id);
    }
    async getDocuments(id) {
        return this.learnersService.getDocuments(id);
    }
    async getAttendance(id) {
        return this.learnersService.getAttendanceByLearner(id);
    }
    async findByMatricule(identifier) {
        return this.learnersService.findByMatricule(identifier);
    }
};
exports.LearnersController = LearnersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photoFile')),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouvel apprenant' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Apprenant créé' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk-validate'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Valider un fichier CSV pour import en masse' }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Validation du fichier terminée',
        type: ValidationResponseDto_1.ValidationResponseDto,
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "validateBulkImport", null);
__decorate([
    (0, common_1.Post)('bulk-import'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Importer des apprenants en masse depuis un fichier CSV' }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Import en masse terminé',
        type: BulkImportResponseDto_1.BulkImportResponseDto
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('dryRun')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Post)('bulk-create'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Créer des apprenants en masse depuis des données JSON' }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Création en masse terminée',
        type: BulkImportResponseDto_1.BulkImportResponseDto
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BulkCreateLearnerDto_1.BulkCreateLearnersDto]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)('csv-template'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Télécharger le template CSV pour import en masse' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Template CSV' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "downloadCSVTemplate", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les apprenants' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.APPRENANT),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Télécharger un document pour un apprenant' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('type')),
    __param(3, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('waiting-list'),
    (0, swagger_1.ApiOperation)({ summary: 'Get waiting list learners' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns list of waiting learners' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Promotion not found' }),
    (0, swagger_1.ApiQuery)({ name: 'promotionId', required: false }),
    __param(0, (0, common_1.Query)('promotionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "getWaitingList", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer un apprenant par ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour un apprenant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour le statut d\'un apprenant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':id/kit'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour le kit d\'un apprenant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "updateKit", null);
__decorate([
    (0, common_1.Get)(':id/attendance-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les statistiques de présence d\'un apprenant' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "getAttendanceStats", null);
__decorate([
    (0, common_1.Get)('email/:email'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Find a learner by email' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the learner' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Learner not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Can only access own data' }),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "findByEmail", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "patchUpdateStatus", null);
__decorate([
    (0, common_1.Post)('replace'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_status_dto_1.ReplaceLearnerDto]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "replaceLearner", null);
__decorate([
    (0, common_1.Get)(':id/status-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "getStatusHistory", null);
__decorate([
    (0, common_1.Get)(':id/documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Get learner documents' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Documents retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Learner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Get)(':id/attendance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get learner attendance history' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the learner\'s attendance records ordered by date'
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Learner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "getAttendance", null);
__decorate([
    (0, public_decorators_1.Public)(),
    (0, common_1.Get)('matricule/:identifier'),
    (0, swagger_1.ApiOperation)({ summary: 'Trouver un apprenant par matricule (public pour scanner QR)' }),
    __param(0, (0, common_1.Param)('identifier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearnersController.prototype, "findByMatricule", null);
exports.LearnersController = LearnersController = __decorate([
    (0, swagger_1.ApiTags)('learners'),
    (0, common_1.Controller)('learners'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [learners_service_1.LearnersService])
], LearnersController);
//# sourceMappingURL=learners.controller.js.map