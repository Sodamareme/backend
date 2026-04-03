import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
import { MealType, Prisma } from '@prisma/client';
import { SyncMealScansDto } from './dto/SyncMealScansDto';
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
  timezone?: string;
};

type MealScanCreateInput = MealScanTimeInput & {
  learnerId: string;
  type: MealType;
  detectedType?: MealType;
  deviceId?: string;
  clientScanId?: string;
  localId?: string;
  manualOverrideConfirmed?: boolean;
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

@Injectable()
export class MealScansService {
  constructor(private prisma: PrismaService) {}

  private static readonly DEFAULT_TIMEZONE = 'Africa/Dakar';
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

  private getDayBounds(date?: string, timezone?: string) {
    const resolvedTimeZone = this.getTimezoneOrDefault(timezone);
    const dayDate = date
      ? this.createDateAtTimeZoneMidnight(date, resolvedTimeZone)
      : new Date();

    return this.getDayBoundsFromBaseDate(dayDate, resolvedTimeZone);
  }

  private getDayBoundsFromBaseDate(baseDate: Date, timezone?: string) {
    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Date invalide. Utilisez le format YYYY-MM-DD.');
    }

    const resolvedTimeZone = this.getTimezoneOrDefault(timezone);
    const dateParts = this.getZonedDateParts(baseDate, resolvedTimeZone);
    const startOfDay = this.createDateAtTimeZoneMidnight(
      this.formatDateParts(dateParts),
      resolvedTimeZone,
    );
    const endParts = this.addOneDay(dateParts);
    const endOfDay = this.createDateAtTimeZoneMidnight(this.formatDateParts(endParts), resolvedTimeZone);

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
    const resolvedTimeZone = this.getTimezoneOrDefault(scan?.timezone);

    if (scan?.serviceDate) {
      return this.getDayBounds(scan.serviceDate, resolvedTimeZone);
    }

    if (scan?.scannedAtClient) {
      const scannedAtClient = new Date(scan.scannedAtClient);

      if (Number.isNaN(scannedAtClient.getTime())) {
        throw new BadRequestException('scannedAtClient invalide.');
      }

      return this.getDayBoundsFromBaseDate(scannedAtClient, resolvedTimeZone);
    }

    return this.getDayBounds(undefined, resolvedTimeZone);
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

  private getTimezoneOrDefault(timezone?: string) {
    const resolvedTimeZone = timezone?.trim() || MealScansService.DEFAULT_TIMEZONE;

    try {
      Intl.DateTimeFormat('en-US', { timeZone: resolvedTimeZone }).format(new Date());
      return resolvedTimeZone;
    } catch {
      throw new BadRequestException('timezone invalide.');
    }
  }

  private getServiceDate(scan?: MealScanTimeInput) {
    const { startOfDay } = this.getScanWindow(scan);
    return startOfDay;
  }

  private getZonedDateParts(date: Date, timezone: string): ZonedDateParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const values = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
    };
  }

  private getTimezoneOffsetMinutes(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const timezoneName = formatter
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;

    if (!timezoneName || timezoneName === 'GMT') {
      return 0;
    }

    const match = timezoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) {
      throw new BadRequestException('Impossible de calculer le fuseau horaire.');
    }

    const [, sign, hours, minutes = '00'] = match;
    const totalMinutes = Number(hours) * 60 + Number(minutes);
    return sign === '-' ? -totalMinutes : totalMinutes;
  }

  private createDateAtTimeZoneMidnight(date: string, timezone: string) {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      throw new BadRequestException('Date invalide. Utilisez le format YYYY-MM-DD.');
    }

    return this.createUtcDateFromZonedParts({ year, month, day, hour: 0, minute: 0, second: 0 }, timezone);
  }

  private createUtcDateFromZonedParts(parts: ZonedDateParts, timezone: string) {
    const approximateUtcDate = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0),
    );
    const initialOffset = this.getTimezoneOffsetMinutes(approximateUtcDate, timezone);
    const shiftedDate = new Date(approximateUtcDate.getTime() - initialOffset * 60_000);
    const resolvedOffset = this.getTimezoneOffsetMinutes(shiftedDate, timezone);

    if (resolvedOffset === initialOffset) {
      return shiftedDate;
    }

    return new Date(approximateUtcDate.getTime() - resolvedOffset * 60_000);
  }

  private formatDateParts(parts: Pick<ZonedDateParts, 'year' | 'month' | 'day'>) {
    return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(
      parts.day,
    ).padStart(2, '0')}`;
  }

  private addOneDay(parts: Pick<ZonedDateParts, 'year' | 'month' | 'day'>) {
    const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    return {
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
    };
  }

  private getDetectedMealType(scannedAt: Date, timezone: string) {
    const { hour, minute } = this.getZonedDateParts(scannedAt, timezone);
    const currentTimeInMinutes = hour * 60 + minute;

    if (currentTimeInMinutes < MealScansService.BREAKFAST_START_MINUTES) {
      return null;
    }

    if (currentTimeInMinutes < MealScansService.LUNCH_START_MINUTES) {
      return 'BREAKFAST' as const;
    }

    return 'LUNCH' as const;
  }

  private validateMealWindow(scan: Pick<MealScanCreateInput, 'type' | 'detectedType' | 'manualOverrideConfirmed'>, scannedAt: Date, timezone: string) {
    const detectedType = this.getDetectedMealType(scannedAt, timezone);

    if (!detectedType) {
      throw new BadRequestException("Le scan n'est pas autorise entre 00h et 06h.");
    }

    if (scan.detectedType && scan.detectedType !== detectedType) {
      throw new BadRequestException("Le type detecte ne correspond pas a l'horaire serveur.");
    }

    if (scan.type !== detectedType && !scan.manualOverrideConfirmed) {
      throw new BadRequestException(
        "Attention, ce choix ne correspond pas a l'horaire habituel. Confirmation requise.",
      );
    }
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

  private async createMealScan(scan: MealScanCreateInput, restaurateurId: string) {
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
    const timezone = this.getTimezoneOrDefault(scan.timezone);

    this.validateMealWindow(scan, scannedAt, timezone);

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
        detectedType: dto.detectedType,
        timezone: dto.timezone,
        manualOverrideConfirmed: dto.manualOverrideConfirmed,
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
