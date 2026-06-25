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
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    constructor(prisma, notificationsService, cloudinaryService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.cloudinaryService = cloudinaryService;
        this.logger = new common_1.Logger(AttendanceService_1.name);
    }
    getAnalyticsDateRange(period = 'month') {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 6);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                startDate.setDate(1);
                break;
            case 'month':
            default:
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setDate(1);
                break;
        }
        return { startDate, endDate };
    }
    getAttendanceDayKey(date) {
        return date.toISOString().split('T')[0];
    }
    isPastOrCurrentAttendanceDay(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const comparedDate = new Date(date);
        comparedDate.setHours(0, 0, 0, 0);
        return comparedDate.getTime() <= today.getTime();
    }
    isInstructionDay(date) {
        const day = date.getDay();
        return day !== 0 && day !== 6 && this.isPastOrCurrentAttendanceDay(date);
    }
    normalizeAttendanceBoundary(date) {
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);
        return normalizedDate;
    }
    isAttendanceOnOrAfterStart(date, startDate) {
        if (!startDate) {
            return true;
        }
        return this.normalizeAttendanceBoundary(date).getTime() >= startDate.getTime();
    }
    getTodayStart() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }
    assertNotFutureAttendanceDate(date) {
        if (date.getTime() > this.getTodayStart().getTime()) {
            throw new common_1.BadRequestException('Future attendance dates are not allowed');
        }
    }
    normalizeAttendanceDate(date) {
        const attendanceDate = new Date(date);
        if (Number.isNaN(attendanceDate.getTime())) {
            throw new common_1.BadRequestException('Invalid attendance date');
        }
        attendanceDate.setHours(0, 0, 0, 0);
        this.assertNotFutureAttendanceDate(attendanceDate);
        return attendanceDate;
    }
    async resolveLearnerAttendanceRecord(attendanceId, date) {
        if (!attendanceId.startsWith('absent-')) {
            const attendance = await this.prisma.learnerAttendance.findUnique({
                where: { id: attendanceId },
                include: {
                    learner: {
                        include: { referential: true },
                    },
                },
            });
            if (!attendance) {
                throw new common_1.NotFoundException('Attendance record not found');
            }
            this.assertNotFutureAttendanceDate(attendance.date);
            return attendance;
        }
        if (!date) {
            throw new common_1.BadRequestException('A date is required to update a generated absence record');
        }
        const generatedAbsenceMatch = attendanceId.match(/^absent-(.+)-(\d{4}-\d{2}-\d{2})$/);
        const learnerId = generatedAbsenceMatch
            ? generatedAbsenceMatch[1]
            : attendanceId.replace('absent-', '');
        const attendanceDate = this.normalizeAttendanceDate(date);
        const existingAttendance = await this.prisma.learnerAttendance.findFirst({
            where: {
                learnerId,
                date: attendanceDate,
            },
            include: {
                learner: {
                    include: { referential: true },
                },
            },
        });
        if (existingAttendance) {
            return existingAttendance;
        }
        return this.prisma.learnerAttendance.create({
            data: {
                learnerId,
                date: attendanceDate,
                isPresent: false,
                isLate: false,
                status: client_1.AbsenceStatus.TO_JUSTIFY,
                scanTime: null,
            },
            include: {
                learner: {
                    include: { referential: true },
                },
            },
        });
    }
    isWithinScanTime(scanTime) {
        const cutoffTime = new Date(scanTime.getFullYear(), scanTime.getMonth(), scanTime.getDate(), 8, 15);
        return scanTime <= cutoffTime;
    }
    async scan(matricule) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isLate = !this.isWithinScanTime(now);
        const [learner, coach] = await Promise.all([
            this.prisma.learner.findUnique({
                where: { matricule },
                include: {
                    user: true,
                    referential: true,
                    promotion: true,
                    attendances: {
                        where: { date: today },
                        take: 1
                    }
                },
            }),
            this.prisma.coach.findUnique({
                where: { matricule },
                include: {
                    user: true,
                    referentials: true,
                    attendances: {
                        where: { date: today },
                        take: 1,
                        select: {
                            id: true,
                            checkIn: true,
                            checkOut: true,
                            isLate: true,
                        }
                    }
                },
            })
        ]);
        if (learner) {
            if (learner.attendances && learner.attendances.length > 0) {
                const existingAttendance = learner.attendances[0];
                throw new common_1.ConflictException(`${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || 'heure inconnue'}`);
            }
            const attendance = await this.prisma.learnerAttendance.create({
                data: {
                    date: today,
                    isPresent: true,
                    scanTime: now,
                    isLate,
                    learnerId: learner.id,
                    status: isLate ? 'TO_JUSTIFY' : 'PENDING'
                }
            });
            return {
                type: 'LEARNER',
                scanTime: attendance.scanTime,
                attendanceStatus: isLate ? 'LATE' : 'PRESENT',
                isAlreadyScanned: false,
                learner: {
                    id: learner.id,
                    matricule: learner.matricule,
                    firstName: learner.firstName,
                    lastName: learner.lastName,
                    photoUrl: learner.photoUrl,
                    referential: learner.referential,
                    promotion: learner.promotion
                }
            };
        }
        if (coach) {
            const existingAttendance = coach.attendances?.[0];
            if (existingAttendance?.checkIn && !existingAttendance?.checkOut) {
                const updated = await this.prisma.coachAttendance.update({
                    where: { id: existingAttendance.id },
                    data: { checkOut: now }
                });
                return {
                    type: 'COACH',
                    scanTime: updated.checkOut,
                    attendanceStatus: 'CHECKOUT',
                    isAlreadyScanned: false,
                    coach: {
                        id: coach.id,
                        matricule: coach.matricule,
                        firstName: coach.firstName,
                        lastName: coach.lastName,
                        photoUrl: coach.photoUrl,
                        referential: coach.referentials?.[0] || null
                    }
                };
            }
            if (existingAttendance?.checkIn && existingAttendance?.checkOut) {
                throw new common_1.ConflictException(`${coach.firstName} ${coach.lastName} a déjà effectué son pointage de sortie aujourd'hui`);
            }
            const attendance = await this.prisma.coachAttendance.create({
                data: {
                    date: today,
                    isPresent: true,
                    checkIn: now,
                    isLate,
                    coachId: coach.id,
                }
            });
            return {
                type: 'COACH',
                scanTime: attendance.checkIn,
                attendanceStatus: isLate ? 'LATE' : 'PRESENT',
                isAlreadyScanned: false,
                coach: {
                    id: coach.id,
                    matricule: coach.matricule,
                    firstName: coach.firstName,
                    lastName: coach.lastName,
                    photoUrl: coach.photoUrl,
                    referential: coach.referentials?.[0] || null
                }
            };
        }
        throw new common_1.NotFoundException('Aucun utilisateur trouvé avec ce matricule');
    }
    async findLearnerByMatricule(matricule) {
        const learner = await this.prisma.learner.findUnique({
            where: { matricule },
            include: {
                user: true,
                referential: true,
                promotion: true,
            },
        });
        if (!learner) {
            throw new common_1.NotFoundException('Apprenant non trouvé');
        }
        return learner;
    }
    async findCoachByMatricule(matricule) {
        const coach = await this.prisma.coach.findUnique({
            where: { matricule },
            include: {
                user: true,
                referentials: true,
            },
        });
        if (!coach) {
            throw new common_1.NotFoundException('Coach non trouvé');
        }
        return coach;
    }
    async scanLearner(matricule) {
        const learner = await this.findLearnerByMatricule(matricule);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingAttendance = await this.prisma.learnerAttendance.findFirst({
            where: {
                learnerId: learner.id,
                date: today,
            },
        });
        if (existingAttendance) {
            throw new common_1.ConflictException(`${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || 'heure inconnue'}`);
        }
        const isLate = !this.isWithinScanTime(now);
        const attendance = await this.prisma.learnerAttendance.create({
            data: {
                date: today,
                isPresent: true,
                scanTime: now,
                isLate,
                learnerId: learner.id,
                status: isLate ? 'TO_JUSTIFY' : 'PENDING'
            }
        });
        return {
            type: 'LEARNER',
            scanTime: attendance.scanTime,
            attendanceStatus: isLate ? 'LATE' : 'PRESENT',
            isAlreadyScanned: false,
            learner: {
                id: learner.id,
                matricule: learner.matricule,
                firstName: learner.firstName,
                lastName: learner.lastName,
                photoUrl: learner.photoUrl,
                referential: learner.referential,
                promotion: learner.promotion
            }
        };
    }
    async scanCoach(matricule) {
        const coach = await this.findCoachByMatricule(matricule);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingAttendance = await this.prisma.coachAttendance.findFirst({
            where: {
                coachId: coach.id,
                date: today,
            },
        });
        if (existingAttendance) {
            throw new common_1.ConflictException(`${coach.firstName} ${coach.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.checkIn?.toLocaleTimeString() || 'heure inconnue'}`);
        }
        const isLate = !this.isWithinScanTime(now);
        const attendance = await this.prisma.coachAttendance.create({
            data: {
                date: today,
                isPresent: true,
                checkIn: now,
                isLate,
                coachId: coach.id,
            }
        });
        return {
            type: 'COACH',
            scanTime: attendance.checkIn,
            attendanceStatus: isLate ? 'LATE' : 'PRESENT',
            isAlreadyScanned: false,
            coach: {
                id: coach.id,
                matricule: coach.matricule,
                firstName: coach.firstName,
                lastName: coach.lastName,
                photoUrl: coach.photoUrl,
                referential: coach.referentials?.[0] || null
            }
        };
    }
    async submitAbsenceJustification(attendanceId, justification, date, documentUrl) {
        const attendanceRecord = await this.resolveLearnerAttendanceRecord(attendanceId, date);
        this.assertNotFutureAttendanceDate(attendanceRecord.date);
        const attendance = await this.prisma.learnerAttendance.update({
            where: { id: attendanceRecord.id },
            data: {
                justification,
                documentUrl,
                status: 'PENDING'
            },
            include: {
                learner: true
            }
        });
        await this.notificationsService.createJustificationNotification(attendance.id, attendance.learnerId, `${attendance.learner.firstName} ${attendance.learner.lastName} a soumis une justification ${attendance.isLate ? 'de retard' : 'd\'absence'}`);
        return attendance;
    }
    async updateAbsenceJustification(attendanceId, justification, date, documentUrl, removeExistingDocument = false) {
        const attendanceRecord = await this.resolveLearnerAttendanceRecord(attendanceId, date);
        this.assertNotFutureAttendanceDate(attendanceRecord.date);
        if (attendanceRecord.status === client_1.AbsenceStatus.APPROVED) {
            throw new common_1.BadRequestException('An approved justification cannot be modified');
        }
        if (!justification.trim() && !documentUrl && !attendanceRecord.documentUrl) {
            throw new common_1.BadRequestException('A justification or a document is required');
        }
        const shouldDeleteExistingDocument = Boolean(attendanceRecord.documentUrl) &&
            (removeExistingDocument || Boolean(documentUrl && documentUrl !== attendanceRecord.documentUrl));
        if (shouldDeleteExistingDocument && attendanceRecord.documentUrl) {
            try {
                await this.cloudinaryService.deleteFileByUrl(attendanceRecord.documentUrl);
            }
            catch (error) {
                this.logger.warn(`Failed to delete existing justification document for attendance ${attendanceRecord.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const updatedAttendance = await this.prisma.learnerAttendance.update({
            where: { id: attendanceRecord.id },
            data: {
                justification: justification.trim(),
                documentUrl: removeExistingDocument
                    ? (documentUrl ?? null)
                    : (documentUrl ?? attendanceRecord.documentUrl ?? null),
                justificationComment: null,
                status: client_1.AbsenceStatus.PENDING,
            },
            include: {
                learner: true,
            },
        });
        return updatedAttendance;
    }
    async deleteAbsenceJustification(attendanceId, date) {
        const attendanceRecord = await this.resolveLearnerAttendanceRecord(attendanceId, date);
        this.assertNotFutureAttendanceDate(attendanceRecord.date);
        if (attendanceRecord.status === client_1.AbsenceStatus.APPROVED) {
            throw new common_1.BadRequestException('An approved justification cannot be deleted');
        }
        if (attendanceRecord.documentUrl) {
            try {
                await this.cloudinaryService.deleteFileByUrl(attendanceRecord.documentUrl);
            }
            catch (error) {
                this.logger.warn(`Failed to delete justification document for attendance ${attendanceRecord.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return this.prisma.learnerAttendance.update({
            where: { id: attendanceRecord.id },
            data: {
                justification: null,
                documentUrl: null,
                justificationComment: null,
                status: client_1.AbsenceStatus.TO_JUSTIFY,
            },
            include: {
                learner: true,
            },
        });
    }
    async updateAbsenceStatus(attendanceId, status, comment, date) {
        const attendance = await this.resolveLearnerAttendanceRecord(attendanceId, date);
        this.assertNotFutureAttendanceDate(attendance.date);
        if (attendance.status === client_1.AbsenceStatus.APPROVED && status === client_1.AbsenceStatus.APPROVED) {
            throw new common_1.BadRequestException('This justification is already approved');
        }
        if (!attendance.justification && !attendance.documentUrl) {
            throw new common_1.BadRequestException('No justification has been submitted for this absence/tardiness');
        }
        const updatedAttendance = await this.prisma.learnerAttendance.update({
            where: { id: attendance.id },
            data: {
                status,
                justificationComment: comment
            },
            include: {
                learner: {
                    include: {
                        referential: true
                    }
                }
            }
        });
        return updatedAttendance;
    }
    async forceApprove(attendanceId, date) {
        const attendance = await this.resolveLearnerAttendanceRecord(attendanceId, date);
        this.assertNotFutureAttendanceDate(attendance.date);
        const updated = await this.prisma.learnerAttendance.update({
            where: { id: attendance.id },
            data: {
                status: client_1.AbsenceStatus.APPROVED,
                justificationComment: 'Autorisé par l\'administrateur',
            },
            include: {
                learner: {
                    include: { referential: true },
                },
            },
        });
        return updated;
    }
    async getLatestScans(limit = 10) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        this.logger.log(`Fetching latest scans for today: ${today.toISOString()}`);
        const [learnerScans, coachScans] = await Promise.all([
            this.prisma.learnerAttendance.findMany({
                where: {
                    date: today,
                    isPresent: true,
                    scanTime: { not: null }
                },
                select: {
                    id: true,
                    scanTime: true,
                    isLate: true,
                    learner: {
                        select: {
                            id: true,
                            matricule: true,
                            firstName: true,
                            lastName: true,
                            photoUrl: true,
                            referential: {
                                select: { id: true, name: true }
                            },
                            promotion: {
                                select: { id: true, name: true }
                            }
                        }
                    }
                },
                orderBy: { scanTime: 'desc' },
                take: limit,
            }),
            this.prisma.coachAttendance.findMany({
                where: {
                    date: today,
                    isPresent: true,
                    checkIn: { not: null }
                },
                include: {
                    coach: {
                        select: {
                            id: true,
                            matricule: true,
                            firstName: true,
                            lastName: true,
                            photoUrl: true,
                            referentials: {
                                select: { id: true, name: true }
                            }
                        }
                    }
                },
                orderBy: { checkIn: 'desc' },
                take: limit,
            }),
        ]);
        this.logger.log(`Found ${learnerScans.length} learner scans and ${coachScans.length} coach scans`);
        return {
            learnerScans: learnerScans.map(scan => ({
                id: scan.id,
                type: 'LEARNER',
                scanTime: scan.scanTime.toISOString(),
                isLate: scan.isLate,
                attendanceStatus: scan.isLate ? 'LATE' : 'PRESENT',
                learner: scan.learner
            })),
            coachScans: coachScans.map(scan => ({
                id: scan.id,
                type: 'COACH',
                scanTime: scan.checkIn.toISOString(),
                isLate: scan.isLate,
                attendanceStatus: scan.isLate ? 'LATE' : 'PRESENT',
                coach: {
                    ...scan.coach,
                    referential: scan.coach.referentials?.[0] || null
                }
            }))
        };
    }
    async getAbsentsByReferential(date, referentialId) {
        try {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(targetDate.getDate() + 1);
            this.logger.log(`Getting absents for referential ${referentialId} on ${date}`);
            const learners = await this.prisma.learner.findMany({
                where: {
                    refId: referentialId,
                    status: 'ACTIVE'
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    matricule: true,
                    photoUrl: true,
                    address: true,
                    refId: true,
                    referential: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                }
            });
            if (!learners.length) {
                this.logger.log(`No active learners found in referential ${referentialId}`);
                return {
                    date: targetDate.toISOString(),
                    referentialId,
                    totalAbsents: 0,
                    absents: [],
                    message: 'Aucun apprenant actif dans ce référentiel.'
                };
            }
            this.logger.log(`Found ${learners.length} active learners in referential ${referentialId}`);
            const attendances = await this.prisma.learnerAttendance.findMany({
                where: {
                    learnerId: { in: learners.map(l => l.id) },
                    date: { gte: targetDate, lt: nextDay }
                },
                select: {
                    learnerId: true,
                    isPresent: true,
                    isLate: true
                }
            });
            this.logger.log(`Found ${attendances.length} attendance records for today`);
            const presentIds = new Set(attendances
                .filter(a => a.isPresent)
                .map(a => a.learnerId));
            const absents = learners.filter(l => !presentIds.has(l.id));
            this.logger.log(`Total absents for referential ${referentialId}: ${absents.length}`);
            return {
                date: targetDate.toISOString(),
                referentialId,
                totalAbsents: absents.length,
                absents: absents.map(l => ({
                    id: l.id,
                    firstName: l.firstName,
                    lastName: l.lastName,
                    matricule: l.matricule,
                    photoUrl: l.photoUrl,
                    address: l.address,
                    referentialId: l.refId,
                    referential: l.referential
                }))
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de la récupération des absents :', error);
            throw new Error('Impossible de récupérer les absents pour ce référentiel');
        }
    }
    async getDailyStats(date, referentialId) {
        try {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const learnersWhere = { status: 'ACTIVE' };
            if (referentialId)
                learnersWhere.refId = referentialId;
            const allLearners = await this.prisma.learner.findMany({
                where: learnersWhere,
                include: { referential: true }
            });
            const whereClause = { date: targetDate };
            if (referentialId)
                whereClause.learner = { refId: referentialId };
            const attendanceRecords = await this.prisma.learnerAttendance.findMany({
                where: whereClause,
                include: { learner: { include: { referential: true } } }
            });
            const attendanceMap = new Map(attendanceRecords.map(r => [r.learnerId, r]));
            const absentRecords = allLearners
                .filter(l => !attendanceMap.has(l.id))
                .map(l => ({
                id: `absent-${l.id}`,
                date: targetDate.toISOString(),
                scanTime: null,
                isPresent: false,
                isLate: false,
                status: 'TO_JUSTIFY',
                justification: null,
                documentUrl: null,
                justificationComment: null,
                learner: {
                    id: l.id,
                    firstName: l.firstName,
                    lastName: l.lastName,
                    matricule: l.matricule,
                    photoUrl: l.photoUrl,
                    address: l.address,
                    referential: l.referential ? { id: l.referential.id, name: l.referential.name } : undefined
                }
            }));
            const allRecords = [
                ...attendanceRecords.map(record => ({
                    id: record.id,
                    date: record.date.toISOString(),
                    scanTime: record.scanTime?.toISOString() || null,
                    isPresent: record.isPresent,
                    isLate: record.isLate,
                    status: record.status || 'PENDING',
                    justification: record.justification || null,
                    documentUrl: record.documentUrl || null,
                    justificationComment: record.justificationComment || null,
                    learner: {
                        id: record.learner.id,
                        firstName: record.learner.firstName,
                        lastName: record.learner.lastName,
                        matricule: record.learner.matricule,
                        photoUrl: record.learner.photoUrl,
                        address: record.learner.address,
                        referential: record.learner.referential
                            ? { id: record.learner.referential.id, name: record.learner.referential.name }
                            : undefined
                    }
                })),
                ...absentRecords
            ];
            const present = allRecords.filter(r => r.isPresent && !r.isLate).length;
            const late = allRecords.filter(r => r.isPresent && r.isLate).length;
            const absent = allRecords.filter(r => !r.isPresent).length;
            const total = allLearners.length;
            return { present, late, absent, total, attendance: allRecords };
        }
        catch (error) {
            this.logger.error('Error getting daily stats:', error);
            throw error;
        }
    }
    async getMonthlyStats(year, month) {
        const startDate = new Date(year, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);
        const attendanceRecords = await this.prisma.learnerAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                date: 'asc',
            },
        });
        const days = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayRecords = attendanceRecords.filter(record => record.date.getDate() === currentDate.getDate());
            days.push({
                date: currentDate.getDate(),
                present: dayRecords.filter(r => r.isPresent && !r.isLate).length,
                late: dayRecords.filter(r => r.isPresent && r.isLate).length,
                absent: dayRecords.filter(r => !r.isPresent).length,
            });
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }
        return { days };
    }
    async getYearlyStats(year) {
        const startDate = new Date(year, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        const attendanceRecords = await this.prisma.learnerAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const months = [];
        for (let month = 0; month < 12; month++) {
            const monthRecords = attendanceRecords.filter(record => record.date.getMonth() === month);
            months.push({
                month: month + 1,
                present: monthRecords.filter(r => r.isPresent && !r.isLate).length,
                late: monthRecords.filter(r => r.isPresent && r.isLate).length,
                absent: monthRecords.filter(r => !r.isPresent).length,
            });
        }
        return { months };
    }
    async getAtRiskLearners(params) {
        const period = params.period || 'month';
        const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 20) : 5;
        const { startDate, endDate } = this.getAnalyticsDateRange(period);
        const learners = await this.prisma.learner.findMany({
            where: {
                status: {
                    in: ['ACTIVE', 'REPLACEMENT'],
                },
                ...(params.promotionId ? { promotionId: params.promotionId } : {}),
                ...(params.referentialId ? { refId: params.referentialId } : {}),
            },
            include: {
                promotion: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                referential: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (learners.length === 0) {
            return {
                period,
                range: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                },
                filters: {
                    promotionId: params.promotionId || null,
                    referentialId: params.referentialId || null,
                    limit,
                },
                expectedDays: 0,
                mostAbsent: [],
                mostLate: [],
            };
        }
        const attendanceRecords = await this.prisma.learnerAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                learnerId: {
                    in: learners.map((learner) => learner.id),
                },
            },
        });
        const replacementLearnerIds = learners
            .filter((learner) => learner.status === client_1.LearnerStatus.REPLACEMENT)
            .map((learner) => learner.id);
        const firstReplacementScans = replacementLearnerIds.length > 0
            ? await this.prisma.learnerAttendance.findMany({
                where: {
                    learnerId: {
                        in: replacementLearnerIds,
                    },
                    scanTime: {
                        not: null,
                    },
                },
                orderBy: [
                    { learnerId: 'asc' },
                    { scanTime: 'asc' },
                ],
                select: {
                    learnerId: true,
                    scanTime: true,
                    date: true,
                },
            })
            : [];
        const replacementStartDates = new Map();
        firstReplacementScans.forEach((scan) => {
            if (replacementStartDates.has(scan.learnerId)) {
                return;
            }
            replacementStartDates.set(scan.learnerId, this.normalizeAttendanceBoundary(scan.scanTime ?? scan.date));
        });
        const learnersMap = new Map(learners.map((learner) => [
            learner.id,
            {
                learnerId: learner.id,
                firstName: learner.firstName,
                lastName: learner.lastName,
                matricule: learner.matricule,
                photoUrl: learner.photoUrl,
                promotion: learner.promotion
                    ? { id: learner.promotion.id, name: learner.promotion.name }
                    : null,
                referential: learner.referential
                    ? { id: learner.referential.id, name: learner.referential.name }
                    : null,
                absenceCount: 0,
                lateCount: 0,
                presentCount: 0,
                totalRecords: 0,
                expectedDays: 0,
                attendedDays: new Set(),
                attendanceRate: 0,
            },
        ]));
        const cohortExpectedDays = new Set(attendanceRecords
            .filter((record) => this.isInstructionDay(record.date))
            .map((record) => this.getAttendanceDayKey(record.date)));
        attendanceRecords.forEach((record) => {
            const existingLearner = learnersMap.get(record.learnerId);
            if (!existingLearner) {
                return;
            }
            if (!this.isInstructionDay(record.date)) {
                return;
            }
            const learnerStartDate = replacementStartDates.get(record.learnerId) ?? null;
            if (!this.isAttendanceOnOrAfterStart(record.date, learnerStartDate)) {
                return;
            }
            existingLearner.totalRecords += 1;
            const dateKey = this.getAttendanceDayKey(record.date);
            if (record.isPresent) {
                existingLearner.attendedDays.add(dateKey);
            }
            if (record.isLate) {
                existingLearner.lateCount += 1;
            }
            if (record.isPresent) {
                existingLearner.presentCount += 1;
            }
        });
        learners.forEach((learner) => {
            const existingLearner = learnersMap.get(learner.id);
            if (!existingLearner) {
                return;
            }
            if (learner.status === client_1.LearnerStatus.REPLACEMENT) {
                const learnerStartDate = replacementStartDates.get(learner.id);
                if (!learnerStartDate) {
                    existingLearner.expectedDays = 0;
                    return;
                }
                existingLearner.expectedDays = Array.from(cohortExpectedDays).filter((dayKey) => {
                    const dayDate = new Date(`${dayKey}T00:00:00.000Z`);
                    return this.isAttendanceOnOrAfterStart(dayDate, learnerStartDate);
                }).length;
                return;
            }
            existingLearner.expectedDays = cohortExpectedDays.size;
        });
        const learnersWithStats = Array.from(learnersMap.values()).map((learner) => {
            const inferredAbsenceCount = Math.max(learner.expectedDays - learner.attendedDays.size, 0);
            const attendanceRate = learner.expectedDays > 0
                ? Number(((learner.attendedDays.size / learner.expectedDays) * 100).toFixed(2))
                : 0;
            return {
                learnerId: learner.learnerId,
                firstName: learner.firstName,
                lastName: learner.lastName,
                matricule: learner.matricule,
                photoUrl: learner.photoUrl,
                promotion: learner.promotion,
                referential: learner.referential,
                absenceCount: inferredAbsenceCount,
                lateCount: learner.lateCount,
                presentCount: learner.presentCount,
                totalRecords: learner.totalRecords,
                attendanceRate,
            };
        });
        const mostAbsent = [...learnersWithStats]
            .sort((a, b) => b.absenceCount - a.absenceCount ||
            b.lateCount - a.lateCount ||
            a.attendanceRate - b.attendanceRate)
            .filter((learner) => learner.absenceCount > 0)
            .slice(0, limit);
        const mostLate = [...learnersWithStats]
            .sort((a, b) => b.lateCount - a.lateCount ||
            b.absenceCount - a.absenceCount ||
            a.attendanceRate - b.attendanceRate)
            .filter((learner) => learner.lateCount > 0)
            .slice(0, limit);
        return {
            period,
            range: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            filters: {
                promotionId: params.promotionId || null,
                referentialId: params.referentialId || null,
                limit,
            },
            expectedDays: cohortExpectedDays.size,
            mostAbsent,
            mostLate,
        };
    }
    async getWeeklyStats(year) {
        try {
            const startDate = new Date(year, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(year, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            const attendanceRecords = await this.prisma.learnerAttendance.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            const weeks = Array.from({ length: 52 }, (_, i) => ({
                weekNumber: i + 1,
                present: 0,
                late: 0,
                absent: 0,
            }));
            attendanceRecords.forEach(record => {
                const weekNumber = this.getWeekNumber(record.date) - 1;
                if (weekNumber >= 0 && weekNumber < 52) {
                    if (record.isPresent && !record.isLate) {
                        weeks[weekNumber].present++;
                    }
                    else if (record.isPresent && record.isLate) {
                        weeks[weekNumber].late++;
                    }
                    else {
                        weeks[weekNumber].absent++;
                    }
                }
            });
            return { weeks };
        }
        catch (error) {
            this.logger.error('Error getting weekly stats:', error);
            throw error;
        }
    }
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    async getScanHistory(type, startDate, endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (type === 'LEARNER') {
            return this.prisma.learnerAttendance.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                include: {
                    learner: {
                        include: {
                            referential: true,
                            promotion: true
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });
        }
        return this.prisma.coachAttendance.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                coach: {
                    include: {
                        referentials: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
    }
    async getPromotionAttendance(promotionId, startDate, endDate) {
        try {
            const promotion = await this.prisma.promotion.findUnique({
                where: { id: promotionId },
                include: {
                    learners: true
                }
            });
            if (!promotion) {
                throw new common_1.NotFoundException('Promotion not found');
            }
            const learnerIds = promotion.learners.map(learner => learner.id);
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const attendanceRecords = await this.prisma.learnerAttendance.groupBy({
                by: ['date'],
                where: {
                    learnerId: { in: learnerIds },
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                _count: {
                    _all: true
                }
            });
            const results = await Promise.all(attendanceRecords.map(async (record) => {
                const dateAttendance = await this.prisma.learnerAttendance.groupBy({
                    by: ['isPresent', 'isLate'],
                    where: {
                        learnerId: { in: learnerIds },
                        date: record.date
                    },
                    _count: true
                });
                const stats = {
                    date: record.date.toISOString().split('T')[0],
                    presentCount: 0,
                    lateCount: 0,
                    absentCount: 0
                };
                dateAttendance.forEach(attendance => {
                    if (attendance.isPresent && !attendance.isLate) {
                        stats.presentCount = attendance._count;
                    }
                    else if (attendance.isPresent && attendance.isLate) {
                        stats.lateCount = attendance._count;
                    }
                    else {
                        stats.absentCount = attendance._count;
                    }
                });
                const totalLearners = learnerIds.length;
                const accountedFor = stats.presentCount + stats.lateCount;
                stats.absentCount = totalLearners - accountedFor;
                return stats;
            }));
            results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return results;
        }
        catch (error) {
            this.logger.error('Error fetching promotion attendance:', error);
            throw error;
        }
    }
    async markAbsentees() {
        if (process.env.READ_ONLY_MODE === 'true') {
            this.logger.log('READ_ONLY_MODE enabled, skipping markAbsentees cron job');
            return;
        }
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const coaches = await this.prisma.coach.findMany({
                select: { id: true }
            });
            if (coaches.length === 0)
                return;
            const presentToday = await this.prisma.coachAttendance.findMany({
                where: {
                    date: today,
                },
                select: { coachId: true }
            });
            const presentIds = new Set(presentToday.map(a => a.coachId));
            const coachesToMark = coaches.filter(c => !presentIds.has(c.id));
            if (coachesToMark.length > 0) {
                await this.prisma.coachAttendance.createMany({
                    data: coachesToMark.map(coach => ({
                        coachId: coach.id,
                        date: today,
                        isPresent: false,
                        isLate: false,
                    })),
                    skipDuplicates: true,
                });
                this.logger.log(`✅ Marked ${coachesToMark.length} coaches as absent for ${today.toISOString().split('T')[0]}`);
            }
            else {
                this.logger.log(`ℹ️ All coaches already have attendance records for today`);
            }
        }
        catch (error) {
            this.logger.error('Error in markAbsentees cron job:', error);
        }
    }
    async getAttendanceByLearner(learnerId) {
        const learner = await this.prisma.learner.findUnique({
            where: { id: learnerId },
            include: {
                referential: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!learner) {
            throw new common_1.NotFoundException(`Apprenant ${learnerId} introuvable`);
        }
        const cohortLearners = await this.prisma.learner.findMany({
            where: {
                promotionId: learner.promotionId,
                ...(learner.refId ? { refId: learner.refId } : {}),
                status: {
                    in: ['ACTIVE', 'REPLACEMENT'],
                },
            },
            select: {
                id: true,
            },
        });
        const cohortAttendanceRecords = await this.prisma.learnerAttendance.findMany({
            where: {
                learnerId: {
                    in: cohortLearners.map((cohortLearner) => cohortLearner.id),
                },
            },
            include: {
                learner: {
                    select: {
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        photoUrl: true,
                        referential: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
        const learnerRecords = cohortAttendanceRecords.filter((record) => record.learnerId === learnerId);
        const learnerDates = new Set(learnerRecords.map((record) => record.date.toISOString().split('T')[0]));
        const expectedDates = Array.from(new Set(cohortAttendanceRecords.map((record) => record.date.toISOString().split('T')[0])));
        const generatedAbsentRecords = expectedDates
            .filter((dateKey) => !learnerDates.has(dateKey))
            .map((dateKey) => ({
            id: `absent-${learnerId}`,
            learnerId,
            date: new Date(dateKey),
            scanTime: null,
            isPresent: false,
            isLate: false,
            status: client_1.AbsenceStatus.TO_JUSTIFY,
            justification: null,
            documentUrl: null,
            justificationComment: null,
            learner: {
                firstName: learner.firstName,
                lastName: learner.lastName,
                matricule: learner.matricule,
                photoUrl: learner.photoUrl,
                referential: learner.referential
                    ? {
                        name: learner.referential.name,
                    }
                    : null,
            },
        }));
        return [...learnerRecords, ...generatedAbsentRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async updateAttendanceStatus(id, status, date) {
        const isPresent = status !== 'absent';
        const isLate = status === 'late';
        if (id.startsWith('absent-')) {
            const attendance = await this.resolveLearnerAttendanceRecord(id, date);
            this.assertNotFutureAttendanceDate(attendance.date);
            return this.prisma.learnerAttendance.update({
                where: { id: attendance.id },
                data: {
                    isPresent,
                    isLate,
                    status: isPresent ? 'APPROVED' : 'TO_JUSTIFY',
                },
                include: {
                    learner: {
                        include: { referential: true },
                    },
                },
            });
        }
        const existingAttendance = await this.prisma.learnerAttendance.findUnique({
            where: { id },
            select: { date: true },
        });
        if (!existingAttendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        this.assertNotFutureAttendanceDate(existingAttendance.date);
        return this.prisma.learnerAttendance.update({
            where: { id },
            data: {
                isPresent,
                isLate,
                status: isPresent ? 'APPROVED' : 'TO_JUSTIFY',
            },
            include: {
                learner: {
                    include: { referential: true },
                },
            },
        });
    }
};
exports.AttendanceService = AttendanceService;
__decorate([
    (0, schedule_1.Cron)('0 0 15 * * 1-5'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceService.prototype, "markAbsentees", null);
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        cloudinary_service_1.CloudinaryService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map