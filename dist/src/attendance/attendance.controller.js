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
var AttendanceController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("./attendance.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let AttendanceController = AttendanceController_1 = class AttendanceController {
    constructor(attendanceService, cloudinaryService) {
        this.attendanceService = attendanceService;
        this.cloudinaryService = cloudinaryService;
        this.logger = new common_1.Logger(AttendanceController_1.name);
    }
    async scan(matricule) {
        return this.attendanceService.scan(matricule);
    }
    async scanLearner(body) {
        return this.attendanceService.scanLearner(body.matricule);
    }
    async scanCoach(body) {
        return this.attendanceService.scanCoach(body.matricule);
    }
    async submitJustification(id, justification, document) {
        let documentUrl;
        if (document) {
            try {
                const uploadResult = await this.cloudinaryService.uploadFile(document, 'justifications');
                documentUrl = uploadResult.url;
            }
            catch (error) {
                this.logger.error(`Failed to upload justification document: ${error.message}`);
                throw new common_1.InternalServerErrorException('Failed to upload document');
            }
        }
        return this.attendanceService.submitAbsenceJustification(id, justification, documentUrl);
    }
    async updateAbsenceStatus(id, updateStatusDto) {
        return this.attendanceService.updateAbsenceStatus(id, updateStatusDto.status, updateStatusDto.comment);
    }
    async getLatestScans() {
        return this.attendanceService.getLatestScans();
    }
    async getAbsentsByReferential(referentialId, date) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.attendanceService.getAbsentsByReferential(targetDate, referentialId);
    }
    async getDailyStats(date, referentialId) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.attendanceService.getDailyStats(targetDate, referentialId);
    }
    async getMonthlyStats(year, month) {
        return this.attendanceService.getMonthlyStats(parseInt(year, 10), parseInt(month, 10));
    }
    async getYearlyStats(year) {
        return this.attendanceService.getYearlyStats(parseInt(year, 10));
    }
    async getWeeklyStats(year) {
        return this.attendanceService.getWeeklyStats(parseInt(year, 10));
    }
    async manualMarkAbsences() {
        this.logger.log('Manually triggering markAbsentees');
        return this.attendanceService.markAbsentees();
    }
    async getPromotionAttendance(promotionId, startDate, endDate) {
        return this.attendanceService.getPromotionAttendance(promotionId, new Date(startDate), new Date(endDate));
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('scan'),
    (0, swagger_1.ApiOperation)({ summary: 'Scan QR code for attendance' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully scanned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already scanned today' }),
    __param(0, (0, common_1.Body)('matricule')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "scan", null);
__decorate([
    (0, common_1.Post)('scan/learner'),
    (0, roles_decorator_1.Roles)('VIGIL'),
    (0, swagger_1.ApiOperation)({ summary: 'Scan a learner attendance' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance recorded successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Learner not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "scanLearner", null);
__decorate([
    (0, common_1.Post)('scan/coach'),
    (0, roles_decorator_1.Roles)('VIGIL'),
    (0, swagger_1.ApiOperation)({ summary: 'Scan a coach attendance' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance recorded successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Coach not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "scanCoach", null);
__decorate([
    (0, common_1.Post)('absence/:id/justify'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.APPRENANT),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('document')),
    (0, swagger_1.ApiOperation)({ summary: 'Soumettre une justification d\'absence' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('justification')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "submitJustification", null);
__decorate([
    (0, common_1.Put)('absence/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.COACH),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "updateAbsenceStatus", null);
__decorate([
    (0, common_1.Get)('scans/latest'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VIGIL),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les derniers scans' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getLatestScans", null);
__decorate([
    (0, common_1.Get)('absents/:referentialId'),
    __param(0, (0, common_1.Param)('referentialId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getAbsentsByReferential", null);
__decorate([
    (0, common_1.Get)('stats/daily'),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Query)('referentialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getDailyStats", null);
__decorate([
    (0, common_1.Get)('stats/monthly'),
    (0, swagger_1.ApiOperation)({ summary: 'Get monthly attendance statistics' }),
    (0, swagger_1.ApiQuery)({ name: 'year', description: 'Year (YYYY)', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', description: 'Month (1-12)', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Monthly attendance statistics' }),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getMonthlyStats", null);
__decorate([
    (0, common_1.Get)('stats/yearly'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getYearlyStats", null);
__decorate([
    (0, common_1.Get)('stats/weekly'),
    (0, swagger_1.ApiOperation)({ summary: 'Get weekly attendance statistics for a year' }),
    (0, swagger_1.ApiQuery)({ name: 'year', description: 'Year (YYYY)', required: true }),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getWeeklyStats", null);
__decorate([
    (0, common_1.Post)('mark-absences'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger absence marking' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "manualMarkAbsences", null);
__decorate([
    (0, common_1.Get)('promotion/:promotionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get promotion attendance stats between dates' }),
    (0, swagger_1.ApiParam)({ name: 'promotionId', description: 'ID of the promotion' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', description: 'End date (YYYY-MM-DD)' }),
    __param(0, (0, common_1.Param)('promotionId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getPromotionAttendance", null);
exports.AttendanceController = AttendanceController = AttendanceController_1 = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, common_1.Controller)('attendance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService,
        cloudinary_service_1.CloudinaryService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map