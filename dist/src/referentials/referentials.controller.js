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
var ReferentialsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferentialsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const referentials_service_1 = require("./referentials.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let ReferentialsController = ReferentialsController_1 = class ReferentialsController {
    constructor(referentialsService, cloudinaryService) {
        this.referentialsService = referentialsService;
        this.cloudinaryService = cloudinaryService;
        this.logger = new common_1.Logger(ReferentialsController_1.name);
    }
    async create(formData, photoFile) {
        const { name, capacity, description, numberOfSessions, sessionLength } = formData;
        if (!name) {
            throw new common_1.BadRequestException('Name is required');
        }
        if (isNaN(capacity)) {
            throw new common_1.BadRequestException('Capacity must be a number');
        }
        if (isNaN(numberOfSessions)) {
            throw new common_1.BadRequestException('Number of sessions must be a number');
        }
        const createData = {
            name,
            description,
            capacity: parseInt(capacity, 10),
            numberOfSessions: parseInt(numberOfSessions, 10),
            sessionLength: sessionLength ? parseInt(sessionLength, 10) : undefined,
        };
        if (photoFile) {
            try {
                const uploadResult = await this.cloudinaryService.uploadFile(photoFile, 'referentials');
                createData.photoUrl = uploadResult.url;
            }
            catch (error) {
                this.logger.error(`Error uploading photo: ${error.message}`);
            }
        }
        if (createData.numberOfSessions > 1 && !createData.sessionLength) {
            throw new common_1.BadRequestException('Session length is required when creating multiple sessions');
        }
        this.logger.log(`Creating referential with data: ${JSON.stringify(createData)}`);
        return this.referentialsService.create(createData);
    }
    async assignToPromotion(data) {
        return this.referentialsService.assignToPromotion(data.referentialIds, data.promotionId);
    }
    async findAll() {
        return this.referentialsService.findAll();
    }
    async findAllReferentials() {
        return this.referentialsService.findAllReferentials();
    }
    async findOne(id) {
        return this.referentialsService.findOne(id);
    }
    async getStatistics(id) {
        return this.referentialsService.getStatistics(id);
    }
    async update(id, data) {
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('Aucune donnée fournie pour la mise à jour');
        }
        return this.referentialsService.update(id, data);
    }
};
exports.ReferentialsController = ReferentialsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new referential' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Referential created' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photoUrl')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('assign-to-promotion'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Assign referentials to a promotion' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "assignToPromotion", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les référentiels' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)("all"),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les référentiels' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "findAllReferentials", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer un référentiel par ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/statistics'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les statistiques d\'un référentiel' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour un référentiel' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferentialsController.prototype, "update", null);
exports.ReferentialsController = ReferentialsController = ReferentialsController_1 = __decorate([
    (0, swagger_1.ApiTags)('referentials'),
    (0, common_1.Controller)('referentials'),
    __metadata("design:paramtypes", [referentials_service_1.ReferentialsService,
        cloudinary_service_1.CloudinaryService])
], ReferentialsController);
//# sourceMappingURL=referentials.controller.js.map