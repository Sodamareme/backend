import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';

@Injectable()
export class MealScansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMealScanDto, restaurateurId: string) {
    // Vérifier si déjà scanné aujourd'hui
    const startOfDay = new Date(new Date().setHours(0,0,0,0));
    const existing = await this.prisma.mealScan.findFirst({
      where: {
        learnerId: dto.learnerId,
        type: dto.type,
        scannedAt: { gte: startOfDay },
      },
    });

    if (existing) {
      throw new ConflictException(
        `L'apprenant a déjà pris le ${dto.type === 'BREAKFAST' ? 'petit déjeuner' : 'déjeuner'} aujourd'hui.`
      );
    }

    return this.prisma.mealScan.create({
      data: {
        learnerId: dto.learnerId,
        type: dto.type,
        restaurateurId, // Passé depuis le contrôleur
      },
      include: {
        learner: true,
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            photoUrl: true,
          }
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