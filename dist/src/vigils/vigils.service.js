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
var VigilsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VigilsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const auth_utils_1 = require("../utils/auth.utils");
let VigilsService = VigilsService_1 = class VigilsService {
    constructor(prisma, cloudinary) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
        this.logger = new common_1.Logger(VigilsService_1.name);
    }
    async create(createVigilDto, photoFile) {
        this.logger.log('Creating vigil with data:', {
            firstName: createVigilDto.firstName,
            lastName: createVigilDto.lastName,
            email: createVigilDto.email,
        });
        const existingVigil = await this.prisma.vigil.findFirst({
            where: {
                OR: [
                    { phone: createVigilDto.phone },
                    { user: { email: createVigilDto.email } },
                ],
            },
        });
        if (existingVigil) {
            throw new common_1.ConflictException('Un vigil avec cet email ou ce téléphone existe déjà');
        }
        let photoUrl;
        if (photoFile) {
            this.logger.log('Photo file received, processing...');
            try {
                const result = await this.cloudinary.uploadFile(photoFile, 'vigils');
                photoUrl = result.url;
                this.logger.log('Successfully uploaded to Cloudinary:', photoUrl);
            }
            catch (error) {
                this.logger.error('Failed to upload photo to Cloudinary:', error);
            }
        }
        const password = auth_utils_1.AuthUtils.generatePassword();
        const hashedPassword = await auth_utils_1.AuthUtils.hashPassword(password);
        try {
            const vigil = await this.prisma.vigil.create({
                data: {
                    firstName: createVigilDto.firstName,
                    lastName: createVigilDto.lastName,
                    phone: createVigilDto.phone,
                    photoUrl,
                    user: {
                        create: {
                            email: createVigilDto.email,
                            password: hashedPassword,
                            role: 'VIGIL',
                        },
                    },
                },
                include: {
                    user: true,
                },
            });
            await auth_utils_1.AuthUtils.sendPasswordEmail(createVigilDto.email, password, 'Vigil');
            this.logger.log('Vigil created successfully:', vigil.id);
            return vigil;
        }
        catch (error) {
            this.logger.error('Failed to create vigil:', error);
            throw error;
        }
    }
    async findAll() {
        return this.prisma.vigil.findMany({
            include: {
                user: true,
            },
        });
    }
    async findOne(id) {
        const vigil = await this.prisma.vigil.findUnique({
            where: { id },
            include: {
                user: true,
            },
        });
        if (!vigil) {
            throw new common_1.NotFoundException('Vigil non trouvé');
        }
        return vigil;
    }
    async update(id, updateData) {
        const vigil = await this.findOne(id);
        return this.prisma.vigil.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
            },
        });
    }
    async remove(id) {
        const vigil = await this.findOne(id);
        return this.prisma.vigil.delete({
            where: { id },
        });
    }
};
exports.VigilsService = VigilsService;
exports.VigilsService = VigilsService = VigilsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService])
], VigilsService);
//# sourceMappingURL=vigils.service.js.map