"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingLearnersModule = void 0;
const common_1 = require("@nestjs/common");
const pending_learners_controller_1 = require("./pending-learners.controller");
const pending_learners_service_1 = require("./pending-learners.service");
const prisma_service_1 = require("../prisma/prisma.service");
let PendingLearnersModule = class PendingLearnersModule {
};
exports.PendingLearnersModule = PendingLearnersModule;
exports.PendingLearnersModule = PendingLearnersModule = __decorate([
    (0, common_1.Module)({
        controllers: [pending_learners_controller_1.PendingLearnersController],
        providers: [pending_learners_service_1.PendingLearnersService, prisma_service_1.PrismaService],
        exports: [pending_learners_service_1.PendingLearnersService],
    })
], PendingLearnersModule);
//# sourceMappingURL=pending-learners.module.js.map