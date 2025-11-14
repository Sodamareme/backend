"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearnersModule = void 0;
const common_1 = require("@nestjs/common");
const learners_service_1 = require("./learners.service");
const learners_controller_1 = require("./learners.controller");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
const email_module_1 = require("../../src/email/email.module");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let LearnersModule = class LearnersModule {
};
exports.LearnersModule = LearnersModule;
exports.LearnersModule = LearnersModule = __decorate([
    (0, common_1.Module)({
        imports: [cloudinary_module_1.CloudinaryModule, email_module_1.EmailModule],
        providers: [learners_service_1.LearnersService, prisma_service_1.PrismaService, cloudinary_service_1.CloudinaryService],
        controllers: [learners_controller_1.LearnersController],
        exports: [learners_service_1.LearnersService],
    })
], LearnersModule);
//# sourceMappingURL=learners.module.js.map