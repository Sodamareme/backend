import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
import { MealType } from '@prisma/client';

@Injectable()
export class MealScansService {
  constructor(private prisma: PrismaService) {}

  private readonly mealScanInclude = {
    learner: {
      include: {
        referential: true,
        promotion: true,
      },
    },
    restaurateur: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
  } as const;

  private getDayBounds(date?: string) {
    const baseDate = date ? new Date(`${date}T00:00:00`) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Date invalide. Utilisez le format YYYY-MM-DD.');
    }

    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  async create(dto: CreateMealScanDto, restaurateurUserId?: string) {
    if (!restaurateurUserId) {
      throw new BadRequestException('Utilisateur restaurateur introuvable dans le token.');
    }

    const restaurateur = await this.prisma.restaurateur.findUnique({
      where: { userId: restaurateurUserId },
    });

    if (!restaurateur) {
      throw new NotFoundException('Profil restaurateur introuvable.');
    }

    const scannedAt = new Date();
    const type: MealType = dto.type;

    // Vérifier si déjà scanné aujourd'hui
    const startOfDay = new Date(scannedAt);
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await this.prisma.mealScan.findFirst({
      where: {
        learnerId: dto.learnerId,
        type,
        scannedAt: { gte: startOfDay },
      },
    });

    if (existing) {
      throw new ConflictException(
        `L'apprenant a deja pris le ${type === 'BREAKFAST' ? 'petit dejeuner' : 'dejeuner'} aujourd'hui.`,
      );
    }

    return this.prisma.mealScan.create({
      data: {
        learnerId: dto.learnerId,
        type,
        scannedAt,
        restaurateurId: restaurateur.id,
      },
      include: {
        learner: {
          include: {
            referential: true,
            promotion: true,
          },
        },
        restaurateur: true,
      },
    });
  }

  async findToday() {
    const { startOfDay, endOfDay } = this.getDayBounds();
    return this.prisma.mealScan.findMany({
      where: {
        scannedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: this.mealScanInclude,
      orderBy: { scannedAt: 'desc' },
    });
  }

  async findHistory(date?: string) {
    const { startOfDay, endOfDay } = this.getDayBounds(date);
    return this.prisma.mealScan.findMany({
      where: {
        scannedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: this.mealScanInclude,
      orderBy: { scannedAt: 'desc' },
    });
  }

  async findByLearner(learnerId: string) {
    return this.prisma.mealScan.findMany({
      where: {
        learnerId,
      },
      include: this.mealScanInclude,
      orderBy: { scannedAt: 'desc' },
    });
  }

  async findByMatricule(learnerMatricule: string) {
    return this.prisma.mealScan.findMany({
      where: {
        learner: {
          matricule: learnerMatricule,
        },
      },
      include: this.mealScanInclude,
      orderBy: { scannedAt: 'desc' },
    });
  }
}
