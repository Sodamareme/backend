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
exports.CoachesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const coaches_service_1 = require("./coaches.service");
const create_coach_dto_1 = require("./dto/create-coach.dto");
const update_coach_dto_1 = require("./dto/update-coach.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let CoachesController = class CoachesController {
    constructor(coachesService) {
        this.coachesService = coachesService;
    }
    getUserId(req) {
        const userId = req.user?.id || req.user?.sub || req.user?.userId;
        if (!userId) {
            console.error('❌ No userId found in request. User object:', req.user);
            throw new common_1.BadRequestException('User ID not found in token');
        }
        console.log('✅ Extracted userId:', userId);
        return userId;
    }
    async getMyProfile(req) {
        const userId = this.getUserId(req);
        console.log('👤 GET /coaches/me - userId:', userId);
        const coach = await this.coachesService.findByUserId(userId);
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        return coach;
    }
    async getMyAttendance(req, startDate, endDate) {
        const userId = this.getUserId(req);
        console.log('📊 GET /coaches/me/attendance - userId:', userId);
        const coach = await this.coachesService.findByUserId(userId);
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        console.log('✅ Coach found for attendance:', coach.id);
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
            ? new Date(startDate)
            : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
        return this.coachesService.getCoachAttendanceHistory(coach.id, start, end);
    }
    async getMyAttendanceStats(req, month, year) {
        const userId = this.getUserId(req);
        console.log('📈 GET /coaches/me/attendance/stats - userId:', userId);
        const coach = await this.coachesService.findByUserId(userId);
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        console.log('📊 Fetching stats for:', { month: targetMonth, year: targetYear });
        return this.coachesService.getCoachAttendanceStats(coach.id, targetYear, targetMonth);
    }
    async getMyTodayAttendance(req) {
        const userId = this.getUserId(req);
        console.log('📅 GET /coaches/me/attendance/today - userId:', userId);
        const coach = await this.coachesService.findByUserId(userId);
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await this.coachesService.getTodayAttendanceForCoach(coach.id, today);
        if (!attendance) {
            console.log('ℹ️ No attendance found for today');
            return null;
        }
        return {
            id: attendance.id,
            date: attendance.date.toISOString(),
            checkIn: attendance.checkIn?.toISOString() || null,
            checkOut: attendance.checkOut?.toISOString() || null,
            isPresent: attendance.isPresent,
            isLate: attendance.isLate,
        };
    }
    async selfCheckIn(req) {
        const userId = this.getUserId(req);
        console.log('➕ POST /coaches/me/self-checkin - userId:', userId);
        const coach = await this.coachesService.findByUserId(userId);
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        const qrData = JSON.stringify({
            matricule: coach.matricule,
            firstName: coach.firstName,
            lastName: coach.lastName,
            email: coach.user.email,
            type: 'COACH'
        });
        return this.coachesService.scanAttendance(qrData);
    }
    async findAll() {
        return await this.coachesService.findAll();
    }
    async getTodayAttendance() {
        return await this.coachesService.getTodayAttendance();
    }
    async scanAttendance(qrData) {
        if (!qrData) {
            throw new common_1.BadRequestException('QR Data manquant');
        }
        return await this.coachesService.scanAttendance(qrData);
    }
    async create(createCoachDto, photo) {
        return await this.coachesService.create(createCoachDto, photo);
    }
    async findOne(id) {
        return await this.coachesService.findOne(id);
    }
    async getAttendanceHistory(coachId, startDate, endDate) {
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
            ? new Date(startDate)
            : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
        return await this.coachesService.getCoachAttendanceHistory(coachId, start, end);
    }
    async update(id, updateCoachDto, photo) {
        return await this.coachesService.update(id, updateCoachDto, photo);
    }
    async remove(id) {
        return await this.coachesService.remove(id);
    }
};
exports.CoachesController = CoachesController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('COACH'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/attendance'),
    (0, roles_decorator_1.Roles)('COACH'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getMyAttendance", null);
__decorate([
    (0, common_1.Get)('me/attendance/stats'),
    (0, roles_decorator_1.Roles)('COACH'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getMyAttendanceStats", null);
__decorate([
    (0, common_1.Get)('me/attendance/today'),
    (0, roles_decorator_1.Roles)('COACH'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getMyTodayAttendance", null);
__decorate([
    (0, common_1.Post)('me/self-checkin'),
    (0, roles_decorator_1.Roles)('COACH'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "selfCheckIn", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIGIL'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('attendance/today'),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIGIL'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getTodayAttendance", null);
__decorate([
    (0, common_1.Post)('scan-attendance'),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIGIL'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('qrData')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "scanAttendance", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_coach_dto_1.CreateCoachDto, Object]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'COACH', 'VIGIL'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/attendance'),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIGIL', 'COACH'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "getAttendanceHistory", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_coach_dto_1.UpdateCoachDto, Object]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoachesController.prototype, "remove", null);
exports.CoachesController = CoachesController = __decorate([
    (0, common_1.Controller)('coaches'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [coaches_service_1.CoachesService])
], CoachesController);
//# sourceMappingURL=coaches.controller.js.map