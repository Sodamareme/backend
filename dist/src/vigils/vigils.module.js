"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VigilsModule = void 0;
const common_1 = require("@nestjs/common");
const vigils_service_1 = require("./vigils.service");
const vigils_controller_1 = require("./vigils.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
let VigilsModule = class VigilsModule {
};
exports.VigilsModule = VigilsModule;
exports.VigilsModule = VigilsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, cloudinary_module_1.CloudinaryModule],
        controllers: [vigils_controller_1.VigilsController],
        providers: [vigils_service_1.VigilsService],
        exports: [vigils_service_1.VigilsService],
    })
], VigilsModule);
//# sourceMappingURL=vigils.module.js.map