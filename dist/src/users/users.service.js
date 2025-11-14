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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    async create(data) {
        const existingUser = await this.findByEmail(data.email);
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }
    async update(id, data) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }
    async getUserPhotoByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                learner: {
                    select: { photoUrl: true }
                },
                coach: {
                    select: { photoUrl: true }
                },
                vigil: {
                    select: { photoUrl: true }
                },
                restaurateur: {
                    select: { photoUrl: true }
                }
            }
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        let photoUrl = null;
        switch (user.role) {
            case client_1.UserRole.APPRENANT:
                photoUrl = user.learner?.photoUrl || null;
                break;
            case client_1.UserRole.COACH:
                photoUrl = user.coach?.photoUrl || null;
                break;
            case client_1.UserRole.VIGIL:
                photoUrl = user.vigil?.photoUrl || null;
                break;
            case client_1.UserRole.RESTAURATEUR:
                photoUrl = user.restaurateur?.photoUrl || null;
                break;
        }
        return { photoUrl };
    }
    async getUserDetailsByRole(user) {
        switch (user.role) {
            case client_1.UserRole.APPRENANT:
                return this.prisma.learner.findFirst({
                    where: { userId: user.id },
                    include: {
                        promotion: true,
                        referential: true
                    }
                });
            case client_1.UserRole.COACH:
                return this.prisma.coach.findFirst({
                    where: { userId: user.id },
                    include: {
                        referential: true,
                        modules: true
                    }
                });
            case client_1.UserRole.VIGIL:
                return this.prisma.vigil.findFirst({
                    where: { userId: user.id }
                });
            case client_1.UserRole.RESTAURATEUR:
                return this.prisma.restaurateur.findFirst({
                    where: { userId: user.id }
                });
            default:
                return null;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map