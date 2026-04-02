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

  private getCurrentMealType(now: Date): MealType {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    if (currentTimeInMinutes < 6 * 60) {
      throw new BadRequestException(
        'Le scan des repas commence a 06:00. Veuillez reessayer plus tard.',
      );
    }

    if (currentTimeInMinutes < 11 * 60 + 30) {
      return 'BREAKFAST';
    }

    return 'LUNCH';
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
    const type = this.getCurrentMealType(scannedAt);

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
    const startOfDay = new Date(new Date().setHours(0,0,0,0));
    return this.prisma.mealScan.findMany({
      where: { scannedAt: { gte: startOfDay } },
      include: { 
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
          }
        }
      },
      orderBy: { scannedAt: 'desc' },
    });
  }

  async findByLearner(learnerId: string){
    return this.prisma.meal.findMany({
      where: {
        learnerId: learnerId
      }
    })
  }

  async findByMatricule(learnerMatricule: string){
    return this.prisma.meal.findFirst({
      where: {
        learner: {
          matricule: learnerMatricule
        }
      }
    })
  }
}
