"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferentialsModule = void 0;
const common_1 = require("@nestjs/common");
const referentials_service_1 = require("./referentials.service");
const referentials_controller_1 = require("./referentials.controller");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
const prisma_module_1 = require("../prisma/prisma.module");
let ReferentialsModule = class ReferentialsModule {
};
exports.ReferentialsModule = ReferentialsModule;
exports.ReferentialsModule = ReferentialsModule = __decorate([
    (0, common_1.Module)({
        imports: [cloudinary_module_1.CloudinaryModule, prisma_module_1.PrismaModule],
        providers: [referentials_service_1.ReferentialsService],
        controllers: [referentials_controller_1.ReferentialsController],
        exports: [referentials_service_1.ReferentialsService],
    })
], ReferentialsModule);
//# sourceMappingURL=referentials.module.js.map