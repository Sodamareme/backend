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
exports.PendingLearnersController = void 0;
const common_1 = require("@nestjs/common");
const pending_learners_service_1 = require("../../src/pending-learners/pending-learners.service");
const create_pending_learner_dto_1 = require("./dto/create-pending-learner.dto");
let PendingLearnersController = class PendingLearnersController {
    constructor(pendingLearnersService) {
        this.pendingLearnersService = pendingLearnersService;
    }
    async createPendingLearner(dto) {
        return this.pendingLearnersService.createPendingLearner(dto);
    }
};
exports.PendingLearnersController = PendingLearnersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pending_learner_dto_1.CreatePendingLearnerDto]),
    __metadata("design:returntype", Promise)
], PendingLearnersController.prototype, "createPendingLearner", null);
exports.PendingLearnersController = PendingLearnersController = __decorate([
    (0, common_1.Controller)('pending-learners'),
    __metadata("design:paramtypes", [pending_learners_service_1.PendingLearnersService])
], PendingLearnersController);
//# sourceMappingURL=pending-learners.controller.js.map