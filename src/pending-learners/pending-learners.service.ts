// src/pending-learners/pending-learners.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePendingLearnerDto } from '../pending-learners/dto/create-pending-learner.dto';

@Injectable()
export class PendingLearnersService {
  constructor(private readonly prisma: PrismaService) {}

  async createPendingLearner(dto: CreatePendingLearnerDto) {
    const existing = await this.prisma.pendingLearner.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new BadRequestException('Cet apprenant est déjà en attente.');
    }

    return this.prisma.pendingLearner.create({
      data: {
        ...dto,
        tutorData: dto.tutor ? { ...dto.tutor } : {},
      },
    });
  }
}
