import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Meal } from '@prisma/client';

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async findLearnerByMatricule(matricule: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { matricule },
      include: {
        user: true,
      },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant non trouvé');
    }

    return learner;
  }

  async scanMeal(matricule: string, type: string): Promise<Meal> {
    const learner = await this.findLearnerByMatricule(matricule);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existingMeal = await this.prisma.meal.findFirst({
      where: {
        learnerId: learner.id,
        date: today,
        type,
      },
    });

    if (existingMeal) {
      throw new Error('Le repas a déjà été scanné aujourd\'hui');
    }

    return this.prisma.meal.create({
      data: {
        date: today,
        type,
        learnerId: learner.id,
      },
      include: {
        learner: true,
      },
    });
  }

  async getDailyStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const breakfastCount = await this.prisma.meal.count({
      where: {
        date: today,
        type: 'BREAKFAST',
      },
    });

    const lunchCount = await this.prisma.meal.count({
      where: {
        date: today,
        type: 'LUNCH',
      },
    });

    return {
      date: today,
      breakfast: breakfastCount,
      lunch: lunchCount,
      total: breakfastCount + lunchCount,
    };
  }

  async getMonthlyStats(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const meals = await this.prisma.meal.groupBy({
      by: ['date', 'type'],
      _count: {
        _all: true,
      },
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const stats = meals.reduce((acc, curr) => {
      const date = curr.date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { breakfast: 0, lunch: 0 };
      }
      acc[date][curr.type.toLowerCase()] = curr._count._all;
      return acc;
    }, {});

    return {
      year,
      month,
      dailyStats: stats,
    };
  }

  async getLearnerMealHistory(learnerId: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { id: learnerId },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant non trouvé');
    }

    return this.prisma.meal.findMany({
      where: {
        learnerId,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        learner: true,
      },
    });
  }

  async getLatestScans() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return this.prisma.meal.findMany({
      where: {
        date: today,
      },
      include: {
        learner: {
          include: {
            referential: true,
            promotion: true
          }
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });
  }
}