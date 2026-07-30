import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Referential } from '@prisma/client';
import { CreateReferentialDto } from './dto/create-referential.dto';
import { ReferentialWithRelations } from './interfaces/referential.interface';
import { ReferentialStats, SessionStats } from './interfaces/referential-stats.interface';

@Injectable()
export class ReferentialsService {
  constructor(private prisma: PrismaService) {}

  private async getAttendanceClosedAtMap(ids: string[]) {
    if (!ids.length) {
      return new Map<string, Date | null>();
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: string; attendanceClosedAt: Date | null }>>(
      Prisma.sql`SELECT id, "attendanceClosedAt" FROM "Referential" WHERE id IN (${Prisma.join(ids)})`
    );

    return new Map(rows.map((row) => [row.id, row.attendanceClosedAt]));
  }

  async create(data: CreateReferentialDto): Promise<Referential> {
    const { numberOfSessions, sessionLength, ...referentialData } = data;
    
    return this.prisma.$transaction(async (prisma) => {
      // Create the referential
      const referential = await prisma.referential.create({
        data: {
          ...referentialData,
          numberOfSessions,
          sessionLength: numberOfSessions > 1 ? sessionLength : null,
        },
      });

      // If there are multiple sessions, create them without dates
      if (numberOfSessions > 1) {
        // Create Session 1
        await prisma.session.create({
          data: {
            name: 'Session 1',
            capacity: data.capacity,
            referentialId: referential.id,
          },
        });

        // Create Session 2
        await prisma.session.create({
          data: {
            name: 'Session 2',
            capacity: data.capacity,
            referentialId: referential.id,
          },
        });
      }

      return prisma.referential.findUnique({
        where: { id: referential.id },
        include: {
          sessions: true,
          learners: true,
          coaches: true,
          modules: true,
        },
      });
    });
  }

  async findAll(): Promise<Referential[]> {
    const referentials = await this.prisma.referential.findMany({
      include: {
        learners: true,
        coaches: true,
        modules: true,
      },
    });

    const attendanceClosedAtMap = await this.getAttendanceClosedAtMap(
      referentials.map((referential) => referential.id),
    );

    return referentials.map((referential) => ({
      ...referential,
      attendanceClosedAt: attendanceClosedAtMap.get(referential.id) ?? null,
    })) as Referential[];
  }

  async findAllPublic(): Promise<Referential[]> {
    const referentials = await this.prisma.referential.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        capacity: true,
        createdAt: true,
        updatedAt: true,
        numberOfSessions: true,
        sessionLength: true,
      },
    });

    const attendanceClosedAtMap = await this.getAttendanceClosedAtMap(
      referentials.map((referential) => referential.id),
    );

    return referentials.map((referential) => ({
      ...referential,
      attendanceClosedAt: attendanceClosedAtMap.get(referential.id) ?? null,
    })) as Referential[];
  }

   async findAllReferentials(): Promise<Referential[]> {
    return this.prisma.referential.findMany({
     
    });
  }

  async findOne(id: string): Promise<ReferentialWithRelations> {
    const referential = await this.prisma.referential.findUnique({
      where: { id },
      include: {
        sessions: {
          include: {
            learners: true,
            modules: true,
          }
        },
        learners: true,
        coaches: true,
        modules: true,
      },
    });

    if (!referential) {
      throw new NotFoundException('Référentiel non trouvé');
    }

    const attendanceClosedAtMap = await this.getAttendanceClosedAtMap([id]);

    return {
      ...referential,
      attendanceClosedAt: attendanceClosedAtMap.get(id) ?? null,
    } as ReferentialWithRelations;
  }

  async findOnePublic(id: string): Promise<Referential> {
    const referential = await this.prisma.referential.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        capacity: true,
        modules: {
          select: {
            id: true,
            name: true,
            description: true,
            photoUrl: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!referential) {
      throw new NotFoundException('Référentiel non trouvé');
    }

    const attendanceClosedAtMap = await this.getAttendanceClosedAtMap([id]);

    return {
      ...referential,
      attendanceClosedAt: attendanceClosedAtMap.get(id) ?? null,
    } as Referential;
  }

  async update(id: string, data: Prisma.ReferentialUpdateInput & { attendanceClosedAt?: Date | string | null }): Promise<Referential> {
    await this.findOne(id);

    const { attendanceClosedAt, ...referentialData } = data;

    if (attendanceClosedAt !== undefined) {
      const normalizedAttendanceClosedAt =
        attendanceClosedAt === null
          ? null
          : new Date(attendanceClosedAt as string | Date);

      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "Referential" SET "attendanceClosedAt" = ${normalizedAttendanceClosedAt}, "updatedAt" = NOW() WHERE id = ${id}`
      );
    }

    const updatedReferential = await this.prisma.referential.update({
      where: { id },
      data: referentialData,
      include: {
        learners: true,
        coaches: true,
        modules: true,
      },
    });

    return {
      ...updatedReferential,
      attendanceClosedAt:
        attendanceClosedAt === undefined
          ? (await this.getAttendanceClosedAtMap([id])).get(id) ?? null
          : attendanceClosedAt === null
            ? null
            : new Date(attendanceClosedAt as string | Date),
    } as Referential;
  }

  async getStatistics(id: string): Promise<ReferentialStats> {
    const referential = await this.findOne(id);
    
    const stats: ReferentialStats = {
      totalLearners: 0,
      activeModules: 0,
      totalCoaches: await this.prisma.coach.count({
        where: {
    referentials: {
      some: { id }
    }
  }
      }),
      capacity: referential.capacity,
      availableSpots: 0,
      sessions: [],
    };

    if (referential.numberOfSessions > 1 && referential.sessions) {
      for (const session of referential.sessions) {
        const sessionStats = {
          sessionId: session.id,
          name: session.name,
          totalLearners: await this.prisma.learner.count({
            where: { sessionId: session.id },
          }),
          activeModules: await this.prisma.module.count({
            where: {
              sessionId: session.id,
              endDate: { gte: new Date() },
              startDate: { lte: new Date() },
            },
          }),
        };
        stats.sessions.push(sessionStats);
        stats.totalLearners += sessionStats.totalLearners;
        stats.activeModules += sessionStats.activeModules;
      }
    } else {
      stats.totalLearners = await this.prisma.learner.count({
        where: { refId: id },
      });
      stats.activeModules = await this.prisma.module.count({
        where: {
          refId: id,
          endDate: { gte: new Date() },
          startDate: { lte: new Date() },
        },
      });
    }

    stats.availableSpots = stats.capacity - stats.totalLearners;
    return stats;
  }

  private async getSessionStatistics(sessionId: string) {
    const totalLearners = await this.prisma.learner.count({
      where: { sessionId },
    });

    const activeModules = await this.prisma.module.count({
      where: {
        sessionId,
        endDate: { gte: new Date() },
        startDate: { lte: new Date() },
      },
    });

   

    return {
      sessionId,
      totalLearners,
      activeModules,
    };
  }

  // Add method to assign referentials to a promotion
  async assignToPromotion(referentialIds: string[], promotionId: string) {
    return this.prisma.promotion.update({
      where: { id: promotionId },
      data: {
        referentials: {
          connect: referentialIds.map(id => ({ id })),
        },
      },
      include: {
        referentials: true,
      },
    });
  }
}
