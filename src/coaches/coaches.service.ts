// src/coaches/coaches.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { EmailService } from './email/email.service';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CoachesService {
  private readonly logger = new Logger(CoachesService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cloudinary: CloudinaryService
  ) {}

  async findAll() {
  const coaches = await this.prisma.coach.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, role: true }
      },
      referentials: true, // ✅ inclure la relation
    }
  });
  return coaches;
}

  async findOne(id: string) {
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
        referentials: true,
        modules: true,
      },
    });

    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    return coach;
  }

async create(createCoachDto: CreateCoachDto, photoFile?: Express.Multer.File) {
  this.logger.log('🔄 Creating coach:', createCoachDto);

  const existingUser = await this.prisma.user.findUnique({
    where: { email: createCoachDto.email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new ConflictException(`Un utilisateur avec l'email ${createCoachDto.email} existe déjà`);
  }

  if (createCoachDto.refId) {
    const referentialExists = await this.prisma.referential.findUnique({
      where: { id: createCoachDto.refId },
    });
    if (!referentialExists) {
      throw new BadRequestException('Le référentiel spécifié n\'existe pas');
    }
  }

  try {
    const matricule = await this.generateMatricule();
    const defaultPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // ✅ Upload photo AVANT la transaction
    let photoUrl: string | null = null;
    if (photoFile) {
      try {
        this.logger.log('Uploading coach photo to Cloudinary...');
        const result = await this.cloudinary.uploadFile(photoFile, 'coaches');
        photoUrl = result.url;
        this.logger.log('✅ Photo uploaded:', photoUrl);
      } catch (error) {
        this.logger.error('Failed to upload photo:', error);
      }
    }

    // ✅ Génération QR Code AVANT la transaction
    const qrCodeData = JSON.stringify({
      matricule,
      firstName: createCoachDto.firstName,
      lastName: createCoachDto.lastName,
      email: createCoachDto.email,
      type: 'COACH',
    });
    const qrCode = await QRCode.toDataURL(qrCodeData);

    // ✅ Transaction uniquement pour les opérations DB (rapides)
    const coach = await this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email: createCoachDto.email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'COACH',
        },
      });
      this.logger.log('✅ User created with ID:', user.id);

      return prisma.coach.create({
        data: {
          matricule,
          firstName: createCoachDto.firstName,
          lastName: createCoachDto.lastName,
          phone: createCoachDto.phone,
          photoUrl,
          qrCode,
          userId: user.id,
           referentials: createCoachDto.refId ? {
            connect: [{ id: createCoachDto.refId }]
          } : undefined,
        },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
          referentials: {
            select: { id: true, name: true, description: true },
          },
        },
      });
    }, {
      timeout: 15000, // ✅ Augmente aussi le timeout par sécurité
    });

    // ✅ Email APRÈS la transaction
    try {
      await this.emailService.sendCoachCredentials(
        createCoachDto.email,
        createCoachDto.firstName,
        createCoachDto.lastName,
        defaultPassword,
        matricule
      );
    } catch (emailError) {
      this.logger.error('❌ Erreur envoi email:', emailError);
    }

    return coach;
  } catch (error) {
    this.logger.error('❌ Erreur création coach:', error);
    if (error.code === 'P2002') {
      throw new ConflictException('Un coach avec ces informations existe déjà');
    }
    throw new BadRequestException(error.message || 'Erreur lors de la création du coach');
  }
}

async update(id: string, updateCoachDto: UpdateCoachDto, photoFile?: Express.Multer.File) {
  this.logger.log('=== UPDATE DTO RAW ===');
  this.logger.log(JSON.stringify(updateCoachDto));
  
  const coach = await this.findOne(id);

  let photoUrl = coach.photoUrl;
  if (photoFile) {
    try {
      const result = await this.cloudinary.uploadFile(photoFile, 'coaches');
      photoUrl = result.url;
    } catch (error) {
      this.logger.error('Failed to upload photo:', error);
    }
  }

  const updateData: any = { photoUrl };

  if (updateCoachDto.firstName !== undefined) updateData.firstName = updateCoachDto.firstName;
  if (updateCoachDto.lastName !== undefined) updateData.lastName = updateCoachDto.lastName;
  if (updateCoachDto.phone !== undefined) updateData.phone = updateCoachDto.phone;

  // ✅ Support refIds[] (plusieurs) ET refId (un seul) pour compatibilité
  const refIds = updateCoachDto.refIds;  // tableau
  const refId = updateCoachDto.refId;    // singulier

  if (refIds && refIds.length > 0) {
    // ✅ Multi-référentiels
    updateData.referentials = {
      set: refIds.map((id: string) => ({ id }))
    };
  } else if (refId && refId !== '') {
    // Compatibilité ancien format
    updateData.referentials = {
      set: [{ id: refId }]
    };
  } else {
    // Vider les référentiels
    updateData.referentials = { set: [] };
  }

  this.logger.log('📝 Update data:');
  this.logger.log(JSON.stringify(updateData));

  return this.prisma.executeWithRetry(() =>
    this.prisma.coach.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, role: true } },
        referentials: true,
      },
    })
  );
}
async remove(id: string) {
  const coach = await this.findOne(id);

  try {
    await this.prisma.$transaction(async (prisma) => {
      // ✅ Supprimer les présences liées
      await prisma.coachAttendance.deleteMany({ 
        where: { coachId: id } 
      });

      // ✅ Supprimer le coach
      await prisma.coach.delete({ where: { id } });

      // ✅ Supprimer l'utilisateur associé
      await prisma.user.delete({ where: { id: coach.userId } });
    });

    return {
      success: true,
      message: 'Coach supprimé avec succès'
    };
  } catch (error) {
    this.logger.error('❌ Erreur suppression coach:', error);

    if (error.code === 'P2003') {
      throw new BadRequestException(
        `Impossible de supprimer: données liées existantes. Détail: ${error.meta?.field_name}`
      );
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Coach non trouvé');
    }

    throw new BadRequestException(
      error.message || 'Erreur lors de la suppression du coach'
    );
  }
}
  // ============ SCAN ATTENDANCE ============
  async scanAttendance(qrData: string) {
  try {
    console.log('🔍 QR Data received:', qrData);
    const data = JSON.parse(qrData);
    console.log('📋 Parsed data:', data);
    
    if (!data.matricule || data.type !== 'COACH') {
      throw new BadRequestException('QR Code invalide');
    }

    const coach = await this.prisma.coach.findUnique({
      where: { matricule: data.matricule },
      include: {
        user: true,
        referentials: true,
      },
    });

    console.log('👤 Coach found:', coach ? `${coach.firstName} ${coach.lastName}` : 'NOT FOUND');

    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
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
    } else {
        // DÉJÀ POINTÉ ENTRÉE ET SORTIE
        throw new ConflictException(
          `${coach.firstName} ${coach.lastName} a déjà effectué son pointage de sortie aujourd'hui`
        );
      }
    } catch (error) {
      this.logger.error('❌ Erreur scan attendance:', error);
      throw error;
    }
  }

  // GET TODAY ATTENDANCE
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
              referentials: {
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
          referentials: attendance.coach.referentials.map(r => r.name),
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
    } catch (error) {
      this.logger.error('❌ Error getting today attendances:', error);
      throw new BadRequestException('Erreur lors de la récupération des pointages');
    }
  }

  // GET ATTENDANCE HISTORY
  async getAttendanceHistory(coachId: string, startDate?: Date, endDate?: Date) {
    const where: any = { coachId };
    
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

  /**
   * Trouver un coach par son userId
   */
async findByUserId(userId: string) {
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
      referentials:true,
    }
  });

  if (!coach) {
    this.logger.error(`❌ Coach not found for userId: ${userId}`);
    throw new NotFoundException('Coach non trouvé pour cet utilisateur');
  }

  this.logger.log(`✅ Coach found: ${coach.firstName} ${coach.lastName} - QR Code: ${coach.qrCode ? 'Present' : 'Missing'}`);
  return coach;
}
  /**
   * Obtenir l'historique de présence d'un coach
   */
// coaches.service.ts — remplace COMPLÈTEMENT getCoachAttendanceHistory

async getCoachAttendanceHistory(coachId: string, startDate: Date, endDate: Date) {
  this.logger.log(`Fetching attendance history for coach ${coachId} from ${startDate} to ${endDate}`);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const attendances = await this.prisma.coachAttendance.findMany({
    where: { coachId, date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
    select: { id: true, date: true, checkIn: true, checkOut: true, isPresent: true, isLate: true }
  });

  // ✅ Log pour débugger
  if (attendances.length > 0) {
    this.logger.log('=== ATTENDANCE SAMPLE RAW ===');
    this.logger.log(JSON.stringify({
      checkIn: attendances[0].checkIn,
      checkInType: typeof attendances[0].checkIn,
      checkOut: attendances[0].checkOut,
    }));
  }

  // ✅ Helper universel — gère Date, string ISO, null
 // coaches.service.ts — remplace toISO dans getCoachAttendanceHistory

const toISO = (val: any): string | null => {
  if (!val) return null;
  // ✅ Fonctionne pour Date, string, et objets Date cross-realm
  try {
    return new Date(val).toISOString();
  } catch {
    return null;
  }
};

  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  };

  return attendances.map(a => ({
    id: a.id,
    date: toISO(a.date),
    checkIn: a.checkIn ? { time: toISO(a.checkIn), isLate: a.isLate } : null,
    checkOut: a.checkOut ? { time: toISO(a.checkOut) } : null,
    isPresent: a.isPresent,
    isLate: a.isLate,
    duration: this.calculateDuration(toDate(a.checkIn), toDate(a.checkOut)),
  }));
}

  /**
   * Obtenir les statistiques de présence d'un coach pour un mois
   */
  async getCoachAttendanceStats(
    coachId: string,
    year: number,
    month: number
  ) {
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

    // Calculer le temps total travaillé
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

  /**
   * Obtenir la présence d'aujourd'hui pour un coach spécifique
   */
async getTodayAttendanceForCoach(coachId: string, today: Date) {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const attendance = await this.prisma.coachAttendance.findFirst({
    where: { coachId, date: todayStart },
    select: {
      id: true, date: true, checkIn: true,
      checkOut: true, isPresent: true, isLate: true,
    }
  });

  if (!attendance) return null;

  // ✅ Retourner le même format que getCoachAttendanceHistory
   return this.prisma.coachAttendance.findFirst({
    where: { coachId, date: todayStart },
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

  // ============ HELPER METHODS ============
  private async generateMatricule(): Promise<string> {
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

  private generateRandomPassword(length: number = 12): string {
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

  /**
   * Calculer la durée entre deux dates
   */
  private calculateDuration(checkIn?: Date | null, checkOut?: Date | null): string | null {
    if (!checkIn || !checkOut) return null;

    const diff = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}min`;
  }
  
}