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
var CoachesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("./email/email.service");
const bcrypt = require("bcrypt");
const QRCode = require("qrcode");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let CoachesService = CoachesService_1 = class CoachesService {
    constructor(prisma, emailService, cloudinary) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.cloudinary = cloudinary;
        this.logger = new common_1.Logger(CoachesService_1.name);
    }
    async findAll() {
        return this.prisma.coach.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                referential: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id) {
        const coach = await this.prisma.coach.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                referential: true,
                modules: true,
            },
        });
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        return coach;
    }
    async create(createCoachDto, photoFile) {
        this.logger.log('🔄 Creating coach:', createCoachDto);
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createCoachDto.email.toLowerCase().trim() },
        });
        if (existingUser) {
            throw new common_1.ConflictException(`Un utilisateur avec l'email ${createCoachDto.email} existe déjà`);
        }
        if (createCoachDto.refId) {
            const referentialExists = await this.prisma.referential.findUnique({
                where: { id: createCoachDto.refId },
            });
            if (!referentialExists) {
                throw new common_1.BadRequestException('Le référentiel spécifié n\'existe pas');
            }
        }
        try {
            const matricule = await this.generateMatricule();
            const defaultPassword = this.generateRandomPassword();
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            let photoUrl = null;
            if (photoFile) {
                try {
                    this.logger.log('Uploading coach photo to Cloudinary...');
                    const result = await this.cloudinary.uploadFile(photoFile, 'coaches');
                    photoUrl = result.url;
                    this.logger.log('✅ Photo uploaded:', photoUrl);
                }
                catch (error) {
                    this.logger.error('Failed to upload photo:', error);
                }
            }
            const qrCodeData = JSON.stringify({
                matricule,
                firstName: createCoachDto.firstName,
                lastName: createCoachDto.lastName,
                email: createCoachDto.email,
                type: 'COACH',
            });
            const qrCode = await QRCode.toDataURL(qrCodeData);
            const coach = await this.prisma.$transaction(async (prisma) => {
                const user = await prisma.user.create({
                    data: {
                        email: createCoachDto.email.toLowerCase().trim(),
                        password: hashedPassword,
                        role: 'COACH',
                    },
                });
                console.log('✅ User created with ID:', user.id);
                const newCoach = await prisma.coach.create({
                    data: {
                        matricule,
                        firstName: createCoachDto.firstName,
                        lastName: createCoachDto.lastName,
                        phone: createCoachDto.phone,
                        photoUrl,
                        qrCode,
                        userId: user.id,
                        refId: createCoachDto.refId || null,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                            },
                        },
                        referential: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                });
                console.log('✅ Coach created:', {
                    id: newCoach.id,
                    userId: newCoach.userId,
                    name: `${newCoach.firstName} ${newCoach.lastName}`
                });
                return newCoach;
            });
            try {
                await this.emailService.sendCoachCredentials(createCoachDto.email, createCoachDto.firstName, createCoachDto.lastName, defaultPassword, matricule);
            }
            catch (emailError) {
                this.logger.error('❌ Erreur envoi email:', emailError);
            }
            return coach;
        }
        catch (error) {
            this.logger.error('❌ Erreur création coach:', error);
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('Un coach avec ces informations existe déjà');
            }
            throw new common_1.BadRequestException(error.message || 'Erreur lors de la création du coach');
        }
    }
    async update(id, updateCoachDto, photoFile) {
        const coach = await this.findOne(id);
        const cleanedData = {};
        for (const [key, value] of Object.entries(updateCoachDto)) {
            if (value !== '' && value !== 'null' && value !== 'undefined' && value !== null) {
                cleanedData[key] = value;
            }
        }
        let photoUrl = coach.photoUrl;
        if (photoFile) {
            try {
                const result = await this.cloudinary.uploadFile(photoFile, 'coaches');
                photoUrl = result.url;
            }
            catch (error) {
                this.logger.error('Failed to upload photo:', error);
            }
        }
        return this.prisma.coach.update({
            where: { id },
            data: {
                ...cleanedData,
                photoUrl,
            },
            include: {
                user: { select: { id: true, email: true, role: true } },
                referential: true,
            },
        });
    }
    async remove(id) {
        const coach = await this.findOne(id);
        await this.prisma.$transaction(async (prisma) => {
            await prisma.coach.delete({ where: { id } });
            await prisma.user.delete({ where: { id: coach.userId } });
        });
        return {
            success: true,
            message: 'Coach supprimé avec succès'
        };
    }
    async scanAttendance(qrData) {
        try {
            console.log('🔍 QR Data received:', qrData);
            const data = JSON.parse(qrData);
            console.log('📋 Parsed data:', data);
            if (!data.matricule || data.type !== 'COACH') {
                throw new common_1.BadRequestException('QR Code invalide');
            }
            const coach = await this.prisma.coach.findUnique({
                where: { matricule: data.matricule },
                include: {
                    user: true,
                    referential: true,
                },
            });
            console.log('👤 Coach found:', coach ? `${coach.firstName} ${coach.lastName}` : 'NOT FOUND');
            if (!coach) {
                throw new common_1.NotFoundException('Coach non trouvé');
            }
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            console.log('📅 Today date:', today);
            console.log('⏰ Current time:', now);
            const existingAttendance = await this.prisma.coachAttendance.findFirst({
                where: {
                    coachId: coach.id,
                    date: today,
                },
            });
            console.log('📊 Existing attendance:', existingAttendance ? 'YES' : 'NO');
            const workStartTime = new Date(today);
            workStartTime.setHours(8, 15, 0, 0);
            const isLate = now > workStartTime;
            if (!existingAttendance) {
                console.log('➕ Creating new attendance record...');
                const newAttendance = await this.prisma.coachAttendance.create({
                    data: {
                        coachId: coach.id,
                        date: today,
                        checkIn: now,
                        isPresent: true,
                        isLate,
                    },
                });
                console.log('✅ Attendance created:', newAttendance.id);
                return {
                    action: 'checkin',
                    coach: {
                        id: coach.id,
                        firstName: coach.firstName,
                        lastName: coach.lastName,
                        matricule: coach.matricule,
                        photoUrl: coach.photoUrl,
                    },
                    isLate,
                    message: `${coach.firstName} ${coach.lastName} a pointé${isLate ? ' (en retard)' : ''}`,
                    time: now.toLocaleTimeString('fr-FR'),
                };
            }
            else {
                throw new common_1.ConflictException(`${coach.firstName} ${coach.lastName} a déjà effectué son pointage de sortie aujourd'hui`);
            }
        }
        catch (error) {
            this.logger.error('❌ Erreur scan attendance:', error);
            throw error;
        }
    }
    async getTodayAttendance() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const attendances = await this.prisma.coachAttendance.findMany({
                where: {
                    date: today,
                },
                include: {
                    coach: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                            photoUrl: true,
                            referential: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    checkIn: 'desc',
                },
            });
            return attendances.map((attendance) => ({
                id: attendance.id,
                date: attendance.date,
                coach: {
                    id: attendance.coach.id,
                    matricule: attendance.coach.matricule,
                    firstName: attendance.coach.firstName,
                    lastName: attendance.coach.lastName,
                    photoUrl: attendance.coach.photoUrl,
                    referential: attendance.coach.referential?.name || null,
                },
                checkIn: attendance.checkIn ? {
                    time: attendance.checkIn,
                    isLate: attendance.isLate,
                } : null,
                checkOut: attendance.checkOut ? {
                    time: attendance.checkOut,
                } : null,
                isPresent: attendance.isPresent,
                isLate: attendance.isLate,
            }));
        }
        catch (error) {
            this.logger.error('❌ Error getting today attendances:', error);
            throw new common_1.BadRequestException('Erreur lors de la récupération des pointages');
        }
    }
    async getAttendanceHistory(coachId, startDate, endDate) {
        const where = { coachId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                where.date.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }
        return this.prisma.coachAttendance.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                coach: {
                    select: {
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        photoUrl: true,
                    },
                },
            },
        });
    }
    async findByUserId(userId) {
        this.logger.log(`🔍 Searching coach with userId: ${userId}`);
        const coach = await this.prisma.coach.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    }
                },
                referential: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
            }
        });
        if (!coach) {
            this.logger.error(`❌ Coach not found for userId: ${userId}`);
            throw new common_1.NotFoundException('Coach non trouvé pour cet utilisateur');
        }
        this.logger.log(`✅ Coach found: ${coach.firstName} ${coach.lastName} - QR Code: ${coach.qrCode ? 'Present' : 'Missing'}`);
        return coach;
    }
    async getCoachAttendanceHistory(coachId, startDate, endDate) {
        this.logger.log(`Fetching attendance history for coach ${coachId} from ${startDate} to ${endDate}`);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const attendances = await this.prisma.coachAttendance.findMany({
            where: {
                coachId,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: {
                date: 'desc'
            },
            select: {
                id: true,
                date: true,
                checkIn: true,
                checkOut: true,
                isPresent: true,
                isLate: true,
            }
        });
        return attendances.map(attendance => ({
            id: attendance.id,
            date: attendance.date.toISOString(),
            checkIn: attendance.checkIn ? {
                time: attendance.checkIn.toISOString(),
                isLate: attendance.isLate
            } : null,
            checkOut: attendance.checkOut ? {
                time: attendance.checkOut.toISOString()
            } : null,
            isPresent: attendance.isPresent,
            isLate: attendance.isLate,
            duration: this.calculateDuration(attendance.checkIn, attendance.checkOut)
        }));
    }
    async getCoachAttendanceStats(coachId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);
        const attendances = await this.prisma.coachAttendance.findMany({
            where: {
                coachId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        const totalDays = attendances.length;
        const presentDays = attendances.filter(a => a.isPresent).length;
        const lateDays = attendances.filter(a => a.isLate).length;
        const completedDays = attendances.filter(a => a.checkIn && a.checkOut).length;
        const absentDays = attendances.filter(a => !a.isPresent).length;
        let totalMinutes = 0;
        attendances.forEach(a => {
            if (a.checkIn && a.checkOut) {
                const diff = a.checkOut.getTime() - a.checkIn.getTime();
                totalMinutes += Math.floor(diff / (1000 * 60));
            }
        });
        const averageHoursPerDay = completedDays > 0
            ? (totalMinutes / completedDays / 60).toFixed(2)
            : '0';
        return {
            month,
            year,
            totalDays,
            presentDays,
            lateDays,
            completedDays,
            absentDays,
            attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0',
            totalHoursWorked: (totalMinutes / 60).toFixed(2),
            averageHoursPerDay,
            attendances: attendances.map(a => ({
                date: a.date.toISOString().split('T')[0],
                checkIn: a.checkIn?.toISOString(),
                checkOut: a.checkOut?.toISOString(),
                isLate: a.isLate,
                isPresent: a.isPresent
            }))
        };
    }
    async getTodayAttendanceForCoach(coachId, today) {
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        return this.prisma.coachAttendance.findFirst({
            where: {
                coachId,
                date: todayStart
            },
            select: {
                id: true,
                date: true,
                checkIn: true,
                checkOut: true,
                isPresent: true,
                isLate: true,
            }
        });
    }
    async generateMatricule() {
        const prefix = 'COACH';
        const year = new Date().getFullYear();
        const count = await this.prisma.coach.count({
            where: {
                createdAt: {
                    gte: new Date(`${year}-01-01`),
                },
            },
        });
        const number = (count + 1).toString().padStart(4, '0');
        return `${prefix}-${year}-${number}`;
    }
    generateRandomPassword(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    calculateDuration(checkIn, checkOut) {
        if (!checkIn || !checkOut)
            return null;
        const diff = checkOut.getTime() - checkIn.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}min`;
    }
};
exports.CoachesService = CoachesService;
exports.CoachesService = CoachesService = CoachesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        cloudinary_service_1.CloudinaryService])
], CoachesService);
//# sourceMappingURL=coaches.service.js.map