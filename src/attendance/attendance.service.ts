import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { AbsenceStatus, LearnerAttendance } from '@prisma/client';
import { LearnerScanResponse, CoachScanResponse } from './interfaces/scan-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  private isWithinScanTime(scanTime: Date): boolean {
    const cutoffTime = new Date(
      scanTime.getFullYear(),
      scanTime.getMonth(),
      scanTime.getDate(),
      8,
      15
    );
    return scanTime <= cutoffTime;
  }

  // 🔧 OPTIMISÉ : Scan unique et rapide
  async scan(matricule: string): Promise<LearnerScanResponse | CoachScanResponse> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isLate = !this.isWithinScanTime(now);

    // 1. Recherche en parallèle du learner et du coach
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
            take: 1
          }
        },
      })
    ]);

    // 2. Traiter l'apprenant s'il existe
    if (learner) {
      // Vérifier si déjà scanné
      if (learner.attendances && learner.attendances.length > 0) {
        const existingAttendance = learner.attendances[0];
        throw new ConflictException(
          `${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || 'heure inconnue'}`
        );
      }

      // Créer l'attendance
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

    // 3. Traiter le coach s'il existe
    if (coach) {
      // Vérifier si déjà scanné
      if (coach.attendances && coach.attendances.length > 0) {
        const existingAttendance = coach.attendances[0];
        throw new ConflictException(
          `${coach.firstName} ${coach.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.checkIn?.toLocaleTimeString() || 'heure inconnue'}`
        );
      }

      // Créer l'attendance du coach
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
        scanTime: attendance.checkIn || attendance.checkIn!,
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

    // 4. Aucun utilisateur trouvé
    throw new NotFoundException('Aucun utilisateur trouvé avec ce matricule');
  }

  // Méthodes de scan individuelles (conservées pour compatibilité)
  async findLearnerByMatricule(matricule: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { matricule },
      include: {
        user: true,
        referential: true,
        promotion: true,
      },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant non trouvé');
    }

    return learner;
  }

  async findCoachByMatricule(matricule: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { matricule },
      include: {
        user: true,
        referentials: true,
      },
    });

    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    return coach;
  }

  public async scanLearner(matricule: string): Promise<LearnerScanResponse> {
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
      throw new ConflictException(
        `${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || 'heure inconnue'}`
      );
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

  public async scanCoach(matricule: string): Promise<CoachScanResponse> {
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
      throw new ConflictException(
        `${coach.firstName} ${coach.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.checkIn?.toLocaleTimeString() || 'heure inconnue'}`
      );
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
      scanTime: attendance.checkIn!,
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

  async submitAbsenceJustification(
    attendanceId: string,
    justification: string,
    documentUrl?: string,
  ) {
    const attendance = await this.prisma.learnerAttendance.update({
      where: { id: attendanceId },
      data: {
        justification,
        documentUrl,
        status: 'PENDING'
      },
      include: {
        learner: true
      }
    });

    await this.notificationsService.createJustificationNotification(
      attendanceId,
      attendance.learnerId,
      `${attendance.learner.firstName} ${attendance.learner.lastName} a soumis une justification ${attendance.isLate ? 'de retard' : 'd\'absence'}`
    );

    return attendance;
  }

 // Dans attendance.service.ts
async updateAbsenceStatus(
  attendanceId: string, 
  status: AbsenceStatus,
  comment?: string
): Promise<LearnerAttendance> {
  const attendance = await this.prisma.learnerAttendance.findUnique({
    where: { id: attendanceId },
    include: { learner: true }
  });

  if (!attendance) {
    throw new NotFoundException('Attendance record not found');
  }

  // ✅ MODIFICATION : Permettre la mise à jour même si déjà traité
  // On refuse seulement si c'est déjà approuvé ET qu'on essaie d'approuver à nouveau
  if (attendance.status === AbsenceStatus.APPROVED && status === AbsenceStatus.APPROVED) {
    throw new BadRequestException('This justification is already approved');
  }

  // Vérifier qu'une justification a été soumise
  if (!attendance.justification && !attendance.documentUrl) {
    throw new BadRequestException('No justification has been submitted for this absence/tardiness');
  }

  const updatedAttendance = await this.prisma.learnerAttendance.update({
    where: { id: attendanceId },
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
async forceApprove(attendanceId: string): Promise<LearnerAttendance> {
  const attendance = await this.prisma.learnerAttendance.findUnique({
    where: { id: attendanceId },
    include: { learner: true },
  });

  if (!attendance) {
    throw new NotFoundException('Attendance record not found');
  }

  // ✅ Pas de vérification de justification — l'admin force l'autorisation
  const updated = await this.prisma.learnerAttendance.update({
    where: { id: attendanceId },
    data: {
      status: AbsenceStatus.APPROVED,
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


  // 🔧 CORRECTION: Retour correct avec ID du scan
async getLatestScans(limit: number = 10) {
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
  ]); // ✅ fermeture correcte de Promise.all

  this.logger.log(`Found ${learnerScans.length} learner scans and ${coachScans.length} coach scans`);

  return {
    learnerScans: learnerScans.map(scan => ({
      id: scan.id,
      type: 'LEARNER',
      scanTime: scan.scanTime!.toISOString(),
      isLate: scan.isLate,
      attendanceStatus: scan.isLate ? 'LATE' : 'PRESENT',
      learner: scan.learner
    })),
    coachScans: coachScans.map(scan => ({
      id: scan.id,
      type: 'COACH',
      scanTime: scan.checkIn!.toISOString(),
      isLate: scan.isLate,
      attendanceStatus: scan.isLate ? 'LATE' : 'PRESENT',
      coach: {
        ...scan.coach,
        referential: scan.coach.referentials?.[0] || null // ✅ normaliser pour le frontend
      }
    }))
  };
}

// Dans attendance.service.ts - Méthode corrigée

async getAbsentsByReferential(date: string, referentialId: string) {
  try {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    this.logger.log(`Getting absents for referential ${referentialId} on ${date}`);

    // 1️⃣ Récupère UNIQUEMENT les apprenants du référentiel sélectionné
    const learners = await this.prisma.learner.findMany({
      where: { 
        refId: referentialId,  // ✅ FILTRE PAR RÉFÉRENTIEL
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

    // 2️⃣ Récupère les présences du jour UNIQUEMENT pour ces apprenants
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

    // 3️⃣ Créer un Set des IDs des apprenants présents (même en retard)
    const presentIds = new Set(
      attendances
        .filter(a => a.isPresent) // Présent à l'heure OU en retard
        .map(a => a.learnerId)
    );

    // 4️⃣ Filtrer les absents : ceux qui ne sont pas dans presentIds
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
  } catch (error) {
    this.logger.error('Erreur lors de la récupération des absents :', error);
    throw new Error('Impossible de récupérer les absents pour ce référentiel');
  }
}

// ✅ Également corriger getDailyStats pour filtrer par référentiel
async getDailyStats(date: string, referentialId?: string) {
  try {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const whereClause: any = {
      date: targetDate,
    };

    // Si un référentiel est spécifié, filtrer par référentiel
    if (referentialId) {
      whereClause.learner = {
        refId: referentialId
      };
    }
    
    const attendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: whereClause,
      include: {
        learner: {
          include: {
            referential: true
          }
        }
      }
    });

    const present = attendanceRecords.filter(r => r.isPresent && !r.isLate).length;
    const late = attendanceRecords.filter(r => r.isPresent && r.isLate).length;
    const absent = attendanceRecords.filter(r => !r.isPresent).length;

    // Si un référentiel est spécifié, calculer le total basé sur les apprenants actifs
    let total = present + late + absent;
    
    if (referentialId) {
      const activeLearners = await this.prisma.learner.count({
        where: {
          refId: referentialId,
          status: 'ACTIVE'
        }
      });
      total = activeLearners;
    }

    return {
      present,
      late,
      absent,
      total,
      attendance: attendanceRecords.map(record => ({
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
          referential: record.learner.referential ? {
            id: record.learner.referential.id,
            name: record.learner.referential.name
          } : undefined
        }
      }))
    };
  } catch (error) {
    this.logger.error('Error getting daily stats:', error);
    throw error;
  }
}

  async getMonthlyStats(year: number, month: number) {
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
      const dayRecords = attendanceRecords.filter(
        record => record.date.getDate() === currentDate.getDate()
      );
      
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

  async getYearlyStats(year: number) {
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
      const monthRecords = attendanceRecords.filter(
        record => record.date.getMonth() === month
      );

      months.push({
        month: month + 1,
        present: monthRecords.filter(r => r.isPresent && !r.isLate).length,
        late: monthRecords.filter(r => r.isPresent && r.isLate).length,
        absent: monthRecords.filter(r => !r.isPresent).length,
      });
    }

    return { months };
  }

  async getWeeklyStats(year: number) {
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
          } else if (record.isPresent && record.isLate) {
            weeks[weekNumber].late++;
          } else {
            weeks[weekNumber].absent++;
          }
        }
      });

      return { weeks };
    } catch (error) {
      this.logger.error('Error getting weekly stats:', error);
      throw error;
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async getScanHistory(
    type: 'LEARNER' | 'COACH',
    startDate: Date,
    endDate: Date
  ) {
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

  async getPromotionAttendance(
    promotionId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const promotion = await this.prisma.promotion.findUnique({
        where: { id: promotionId },
        include: {
          learners: true
        }
      });

      if (!promotion) {
        throw new NotFoundException('Promotion not found');
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

      const results = await Promise.all(
        attendanceRecords.map(async (record) => {
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
            } else if (attendance.isPresent && attendance.isLate) {
              stats.lateCount = attendance._count;
            } else {
              stats.absentCount = attendance._count;
            }
          });

          const totalLearners = learnerIds.length;
          const accountedFor = stats.presentCount + stats.lateCount;
          stats.absentCount = totalLearners - accountedFor;

          return stats;
        })
      );

      results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return results;
    } catch (error) {
      this.logger.error('Error fetching promotion attendance:', error);
      throw error;
    }
  }

@Cron('0 0 15 * * 1-5')
async markAbsentees() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Récupérer tous les coaches actifs
    const coaches = await this.prisma.coach.findMany({
      select: { id: true }
    });

    if (coaches.length === 0) return;

    // 2. Récupérer les coaches qui ont déjà une présence aujourd'hui
    const presentToday = await this.prisma.coachAttendance.findMany({
      where: {
        date: today,
      },
      select: { coachId: true }
    });

    const presentIds = new Set(presentToday.map(a => a.coachId));

    // 3. Filtrer ceux qui n'ont pas encore de présence
    const coachesToMark = coaches.filter(c => !presentIds.has(c.id));

    // 4. Créer les absences en une seule opération
    if (coachesToMark.length > 0) {
      await this.prisma.coachAttendance.createMany({
        data: coachesToMark.map(coach => ({
          coachId: coach.id,
          date: today,
          isPresent: false,  // ✅ champ correct du schéma
          isLate: false,
          // pas de checkIn ni checkOut pour une absence
        })),
        skipDuplicates: true,
      });

      this.logger.log(`✅ Marked ${coachesToMark.length} coaches as absent for ${today.toISOString().split('T')[0]}`);
    } else {
      this.logger.log(`ℹ️ All coaches already have attendance records for today`);
    }

  } catch (error) {
    this.logger.error('Error in markAbsentees cron job:', error);
  }
}

  async getAttendanceByLearner(learnerId: string) {
    return this.prisma.learnerAttendance.findMany({
      where: {
        learnerId: learnerId
      },
      orderBy: {
        date: 'desc'
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
                name: true
              }
            }
          }
        }
      }
    });
  }
  async updateAttendanceStatus(id: string, status: 'present' | 'late' | 'absent') {
  const isPresent = status !== 'absent';
  const isLate = status === 'late';

  return this.prisma.learnerAttendance.update({
    where: { id },
    data: {
      isPresent,
      isLate,
      status: isPresent ? 'APPROVED' : 'TO_JUSTIFY',
    },
    include: {
      learner: {
        include: { referential: true }
      }
    }
  });
}
}