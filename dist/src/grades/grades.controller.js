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
var GradesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const grades_service_1 = require("./grades.service");
const create_grade_dto_1 = require("./dto/create-grade.dto");
const update_grade_dto_1 = require("./dto/update-grade.dto");
let GradesController = GradesController_1 = class GradesController {
    constructor(gradesService) {
        this.gradesService = gradesService;
        this.logger = new common_1.Logger(GradesController_1.name);
    }
    async create(createGradeDto) {
        console.log('\n========================================');
        console.log('🎯 POST /grades ENDPOINT HIT');
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('📦 Body received:', JSON.stringify(createGradeDto, null, 2));
        console.log('========================================\n');
        try {
            const result = await this.gradesService.create(createGradeDto);
            console.log('✅ Grade created successfully:', result.id);
            return result;
        }
        catch (error) {
            console.error('❌ Error in create grade:', error);
            throw error;
        }
    }
    async findAll() {
        this.logger.log('Fetching all grades');
        const result = await this.gradesService.findAll();
        this.logger.log(`Found ${result.length} grades`);
        return result;
    }
    async getGradesByLearner(learnerId) {
        this.logger.log(`Fetching grades for learner: ${learnerId}`);
        return this.gradesService.getGradesByLearner(learnerId);
    }
    async getGradesByModule(moduleId) {
        this.logger.log(`Fetching grades for module: ${moduleId}`);
        return this.gradesService.getGradesByModule(moduleId);
    }
    async findOne(id) {
        this.logger.log(`Fetching grade with ID: ${id}`);
        return this.gradesService.findOne(id);
    }
    async update(id, updateGradeDto) {
        this.logger.log(`Updating grade with ID: ${id}`);
        return this.gradesService.update(id, updateGradeDto);
    }
    async remove(id) {
        this.logger.log(`Deleting grade with ID: ${id}`);
        return this.gradesService.remove(id);
    }
};
exports.GradesController = GradesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new grade' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_grade_dto_1.CreateGradeDto]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all grades' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('learner/:learnerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all grades for a specific learner' }),
    (0, swagger_1.ApiParam)({ name: 'learnerId', description: 'Learner ID (UUID format)' }),
    __param(0, (0, common_1.Param)('learnerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "getGradesByLearner", null);
__decorate([
    (0, common_1.Get)('module/:moduleId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all grades for a specific module' }),
    (0, swagger_1.ApiParam)({ name: 'moduleId', description: 'Module ID (UUID format)' }),
    __param(0, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "getGradesByModule", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a grade by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Grade ID (UUID format)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a grade' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Grade ID (UUID format)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_grade_dto_1.UpdateGradeDto]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a grade' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Grade ID (UUID format)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GradesController.prototype, "remove", null);
exports.GradesController = GradesController = GradesController_1 = __decorate([
    (0, swagger_1.ApiTags)('grades'),
    (0, common_1.Controller)('grades'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __metadata("design:paramtypes", [grades_service_1.GradesService])
], GradesController);
//# sourceMappingURL=grades.controller.js.map