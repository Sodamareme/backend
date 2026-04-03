import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
import { MealType, Prisma } from '@prisma/client';
import { SyncMealScanItemDto, SyncMealScansDto } from './dto/SyncMealScansDto';
import { randomUUID } from 'crypto';

type SyncMealScanResult = {
  localId: string;
  status: 'created' | 'duplicate' | 'rejected';
  message: string;
  serverId?: string;
};

type MealScanTimeInput = {
  serviceDate?: string;
  scannedAtClient?: string;
};

@Injectable()
export class MealScansService {
  constructor(private prisma: PrismaService) {}

  private static readonly BREAKFAST_START_MINUTES = 6 * 60;
  private static readonly LUNCH_START_MINUTES = 11 * 60;

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

    return this.getDayBoundsFromBaseDate(baseDate);
  }

  private getDayBoundsFromBaseDate(baseDate: Date) {
    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Date invalide. Utilisez le format YYYY-MM-DD.');
    }

    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  private getRestaurateurUserIdOrThrow(restaurateurUserId?: string) {
    if (!restaurateurUserId) {
      throw new BadRequestException('Utilisateur restaurateur introuvable dans le token.');
    }

    return restaurateurUserId;
  }

  private async getRestaurateurOrThrow(restaurateurUserId?: string) {
    const userId = this.getRestaurateurUserIdOrThrow(restaurateurUserId);
    const restaurateur = await this.prisma.restaurateur.findUnique({
      where: { userId },
    });

    if (!restaurateur) {
      throw new NotFoundException('Profil restaurateur introuvable.');
    }

    return restaurateur;
  }

  private getScanWindow(scan?: MealScanTimeInput) {
    if (scan?.serviceDate) {
      return this.getDayBounds(scan.serviceDate);
    }

    if (scan?.scannedAtClient) {
      const scannedAtClient = new Date(scan.scannedAtClient);

      if (Number.isNaN(scannedAtClient.getTime())) {
        throw new BadRequestException('scannedAtClient invalide.');
      }

      return this.getDayBoundsFromBaseDate(scannedAtClient);
    }

    return this.getDayBounds();
  }

  private getScannedAt(scan?: Pick<MealScanTimeInput, 'scannedAtClient'>) {
    if (!scan?.scannedAtClient) {
      return new Date();
    }

    const scannedAtClient = new Date(scan.scannedAtClient);

    if (Number.isNaN(scannedAtClient.getTime())) {
      throw new BadRequestException('scannedAtClient invalide.');
    }

    return scannedAtClient;
  }

  private getClientScanId(scan: {
    clientScanId?: string;
    localId?: string;
    deviceId?: string;
  }) {
    if (scan.clientScanId) {
      return scan.clientScanId;
    }

    if (!scan.localId) {
      return null;
    }

    return scan.deviceId ? `${scan.deviceId}:${scan.localId}` : scan.localId;
  }

  private validateMealWindow(type: MealType, scannedAt: Date) {
    const currentTimeInMinutes = scannedAt.getHours() * 60 + scannedAt.getMinutes();

    if (type === 'BREAKFAST') {
      if (
        currentTimeInMinutes < MealScansService.BREAKFAST_START_MINUTES ||
        currentTimeInMinutes >= MealScansService.LUNCH_START_MINUTES
      ) {
        throw new BadRequestException(
          'Le petit dejeuner est disponible uniquement entre 06:00 et 11:00.',
        );
      }
      return;
    }

    if (currentTimeInMinutes < MealScansService.LUNCH_START_MINUTES) {
      throw new BadRequestException('Le dejeuner commence a 11:00.');
    }
  }

  private getServiceDate(scan?: MealScanTimeInput) {
    const { startOfDay } = this.getScanWindow(scan);
    return startOfDay;
  }

  private getExceptionMessage(error: BadRequestException | ConflictException | NotFoundException) {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    return error.message;
  }

  private async createMealScan(
    scan: {
      learnerId: string;
      type: MealType;
      serviceDate?: string;
      scannedAtClient?: string;
      deviceId?: string;
      clientScanId?: string;
      localId?: string;
    },
    restaurateurId: string,
  ) {
    const learner = await this.prisma.learner.findUnique({
      where: { id: scan.learnerId },
      select: { id: true },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant introuvable.');
    }

    const scannedAt = this.getScannedAt(scan);
    const serviceDate = this.getServiceDate(scan);
    const clientScanId = this.getClientScanId(scan);
    const { startOfDay, endOfDay } = this.getScanWindow(scan);

    this.validateMealWindow(scan.type, scannedAt);

    if (clientScanId) {
      const existingClientScanRows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "MealScan"
        WHERE "clientScanId" = ${clientScanId}
        LIMIT 1
      `);

      const existingClientScanId = existingClientScanRows[0]?.id;
      const existingClientScan = existingClientScanId
        ? await this.prisma.mealScan.findUnique({
            where: { id: existingClientScanId },
            include: this.mealScanInclude,
          })
        : null;

      if (existingClientScan) {
        return existingClientScan;
      }
    }

    const existing = await this.prisma.mealScan.findFirst({
      where: {
        learnerId: scan.learnerId,
        type: scan.type,
        scannedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `L'apprenant a deja pris le ${scan.type === 'BREAKFAST' ? 'petit dejeuner' : 'dejeuner'} pour cette journee.`,
      );
    }

    const mealScanId = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "MealScan" (
        "id",
        "learnerId",
        "type",
        "serviceDate",
        "scannedAt",
        "scannedAtClient",
        "deviceId",
        "clientScanId",
        "restaurateurId"
      )
      VALUES (
        ${mealScanId},
        ${scan.learnerId},
        ${scan.type}::"MealType",
        ${serviceDate},
        ${scannedAt},
        ${scan.scannedAtClient ? scannedAt : null},
        ${scan.deviceId ?? null},
        ${clientScanId ?? null},
        ${restaurateurId}
      )
    `);

    return this.prisma.mealScan.findUniqueOrThrow({
      where: { id: mealScanId },
      include: this.mealScanInclude,
    });
  }

  async create(dto: CreateMealScanDto, restaurateurUserId?: string) {
    const restaurateur = await this.getRestaurateurOrThrow(restaurateurUserId);

    return this.createMealScan(
      {
        learnerId: dto.learnerId,
        type: dto.type,
        serviceDate: dto.serviceDate,
        scannedAtClient: dto.scannedAtClient,
        deviceId: dto.deviceId,
        clientScanId: dto.clientScanId,
      },
      restaurateur.id,
    );
  }

  async sync(dto: SyncMealScansDto, restaurateurUserId?: string): Promise<SyncMealScanResult[]> {
    const restaurateur = await this.getRestaurateurOrThrow(restaurateurUserId);
    const results: SyncMealScanResult[] = [];

    for (const scan of dto.scans) {
      try {
        const createdScan = await this.createMealScan(scan, restaurateur.id);
        results.push({
          localId: scan.localId,
          status: 'created',
          message: 'Scan synchronise avec succes.',
          serverId: createdScan.id,
        });
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          results.push({
            localId: scan.localId,
            status: error instanceof ConflictException ? 'duplicate' : 'rejected',
            message: this.getExceptionMessage(error),
          });
          continue;
        }

        throw error;
      }
    }

    return results;
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
