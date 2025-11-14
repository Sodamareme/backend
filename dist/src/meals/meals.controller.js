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
exports.MealsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const meals_service_1 = require("./meals.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let MealsController = class MealsController {
    constructor(mealsService) {
        this.mealsService = mealsService;
    }
    async scanMeal(learnerId, type) {
        return this.mealsService.scanMeal(learnerId, type);
    }
    async getDailyStats() {
        return this.mealsService.getDailyStats();
    }
    async getMonthlyStats(year, month) {
        return this.mealsService.getMonthlyStats(parseInt(year, 10), parseInt(month, 10));
    }
    async getLearnerMealHistory(learnerId) {
        return this.mealsService.getLearnerMealHistory(learnerId);
    }
    async getLatestScans() {
        return this.mealsService.getLatestScans();
    }
};
exports.MealsController = MealsController;
__decorate([
    (0, common_1.Post)('scan/:learnerId/:type'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.RESTAURATEUR),
    (0, swagger_1.ApiOperation)({ summary: 'Scanner un repas pour un apprenant' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Repas scanné' }),
    __param(0, (0, common_1.Param)('learnerId')),
    __param(1, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "scanMeal", null);
__decorate([
    (0, common_1.Get)('stats/daily'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.RESTAURATEUR),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir les statistiques journalières des repas' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getDailyStats", null);
__decorate([
    (0, common_1.Get)('stats/monthly'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.RESTAURATEUR),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir les statistiques mensuelles des repas' }),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getMonthlyStats", null);
__decorate([
    (0, common_1.Get)('learner/:learnerId'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.RESTAURATEUR),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir l\'historique des repas d\'un apprenant' }),
    __param(0, (0, common_1.Param)('learnerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getLearnerMealHistory", null);
__decorate([
    (0, common_1.Get)('scans/latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir les derniers scans de repas' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getLatestScans", null);
exports.MealsController = MealsController = __decorate([
    (0, swagger_1.ApiTags)('meals'),
    (0, common_1.Controller)('meals'),
    __metadata("design:paramtypes", [meals_service_1.MealsService])
], MealsController);
//# sourceMappingURL=meals.controller.js.map