import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Cron } from "@nestjs/schedule";
import {
  AbsenceStatus,
  LearnerAttendance,
  LearnerStatus,
  Prisma,
} from "@prisma/client";
import {
  LearnerScanResponse,
  CoachScanResponse,
} from "./interfaces/scan-response.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import {
  EventsService,
  EVENT_TYPE_HOLIDAY,
  EVENT_TYPE_NO_CLASS,
} from "../events/events.service";

type AttendanceSessionInfo = {
  startDate: Date | null;
  endDate: Date | null;
  attendanceClosedAt: Date | null;
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private cloudinaryService: CloudinaryService,
    private eventsService: EventsService,
  ) {}

  private getAnalyticsDateRange(params: {
    period?: "week" | "month" | "quarter" | "year" | "custom";
    startDate?: string;
    endDate?: string;
  }) {
    const period = params.period || "month";
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    if (period === "custom") {
      if (!params.startDate || !params.endDate) {
        throw new BadRequestException(
          "Les dates de début et de fin sont requises pour une période personnalisée",
        );
      }

      const customStartDate = new Date(params.startDate);
      const customEndDate = new Date(params.endDate);

      if (
        Number.isNaN(customStartDate.getTime()) ||
        Number.isNaN(customEndDate.getTime())
      ) {
        throw new BadRequestException("Période personnalisée invalide");
      }

      customStartDate.setHours(0, 0, 0, 0);
      customEndDate.setHours(23, 59, 59, 999);

      if (customStartDate.getTime() > customEndDate.getTime()) {
        throw new BadRequestException(
          "La date de début doit être antérieure ou égale à la date de fin",
        );
      }

      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    switch (period) {
      case "week": {
        const day = startDate.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        startDate.setDate(startDate.getDate() - diffToMonday);
        break;
      }
      case "year": {
        startDate.setMonth(0, 1);
        break;
      }
      case "quarter": {
        const quarterStartMonth = Math.floor(startDate.getMonth() / 3) * 3;
        startDate.setMonth(quarterStartMonth, 1);
        break;
      }
      case "month":
      default:
        startDate.setDate(1);
        break;
    }

    return { startDate, endDate };
  }

  private sortMostRegular<
    T extends {
      attendanceRate: number;
      presentCount: number;
      lateCount: number;
      absenceCount: number;
    },
  >(rows: T[]): T[] {
    return [...rows].sort(
      (a, b) =>
        a.absenceCount - b.absenceCount ||
        a.lateCount - b.lateCount ||
        b.presentCount - a.presentCount ||
        b.attendanceRate - a.attendanceRate,
    );
  }

  private async computeAttendanceLeaderboard(params: {
    period?: "week" | "month" | "quarter" | "year" | "custom";
    promotionId?: string;
    referentialId?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const period = params.period || "month";
    const limit =
      params.limit && params.limit > 0 ? Math.min(params.limit, 20) : 5;
    const { startDate, endDate } = this.getAnalyticsDateRange({
      period,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const learners = await this.prisma.learner.findMany({
      where: {
        status: {
          in: ["ACTIVE", "REPLACEMENT"],
        },
        ...(params.promotionId ? { promotionId: params.promotionId } : {}),
        ...(params.referentialId ? { refId: params.referentialId } : {}),
      },
      include: {
        promotion: {
          select: {
            id: true,
            name: true,
          },
        },
        referential: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const referentialIds = Array.from(
      new Set(
        learners
          .map((learner) => learner.refId)
          .filter((refId): refId is string => Boolean(refId)),
      ),
    );
    const referentialAttendanceClosures =
      await this.getReferentialAttendanceClosures(referentialIds);
    const sessionIds = Array.from(
      new Set(
        learners
          .map((learner) => learner.sessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId)),
      ),
    );
    const sessionAttendanceInfoMap =
      await this.getSessionAttendanceInfoMap(sessionIds);
    const learnerPromotionIds = new Map(
      learners.map((learner) => [learner.id, learner.promotionId ?? null]),
    );
    const promotionIds = Array.from(
      new Set(
        learners
          .map((learner) => learner.promotionId)
          .filter((promotionId): promotionId is string => Boolean(promotionId)),
      ),
    );
    const blockedAttendanceDaysByPromotion =
      await this.eventsService.getBlockedDateKeysByPromotion(
        promotionIds,
        startDate,
        endDate,
        "attendance",
      );
    const activeLearners = learners.filter((learner) =>
      this.isLearnerExpectedForAttendanceInRange(
        learner,
        referentialAttendanceClosures,
        sessionAttendanceInfoMap,
        startDate,
        endDate,
      ),
    );

    if (activeLearners.length === 0) {
      return {
        period,
        range: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        filters: {
          promotionId: params.promotionId || null,
          referentialId: params.referentialId || null,
          limit,
        },
        expectedDays: 0,
        learnersWithStats: [],
        mostAbsent: [],
        mostLate: [],
        mostRegular: [],
      };
    }

    const attendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        learnerId: {
          in: activeLearners.map((learner) => learner.id),
        },
      },
    });

    const replacementLearnerIds = activeLearners
      .filter((learner) => learner.status === LearnerStatus.REPLACEMENT)
      .map((learner) => learner.id);

    const firstReplacementScans =
      replacementLearnerIds.length > 0
        ? await this.prisma.learnerAttendance.findMany({
            where: {
              learnerId: {
                in: replacementLearnerIds,
              },
              scanTime: {
                not: null,
              },
            },
            orderBy: [{ learnerId: "asc" }, { scanTime: "asc" }],
            select: {
              learnerId: true,
              scanTime: true,
              date: true,
            },
          })
        : [];

    const replacementStartDates = new Map<string, Date>();
    firstReplacementScans.forEach((scan) => {
      if (replacementStartDates.has(scan.learnerId)) {
        return;
      }

      replacementStartDates.set(
        scan.learnerId,
        this.normalizeAttendanceBoundary(scan.scanTime ?? scan.date),
      );
    });

    const learnersMap = new Map<
      string,
      {
        learnerId: string;
        firstName: string;
        lastName: string;
        matricule: string;
        photoUrl: string | null;
        promotion: { id: string; name: string } | null;
        referential: { id: string; name: string } | null;
        absenceCount: number;
        lateCount: number;
        presentCount: number;
        totalRecords: number;
        expectedDays: number;
        attendedDays: Set<string>;
        attendanceRate: number;
      }
    >(
      activeLearners.map((learner) => [
        learner.id,
        {
          learnerId: learner.id,
          firstName: learner.firstName,
          lastName: learner.lastName,
          matricule: learner.matricule,
          photoUrl: learner.photoUrl,
          promotion: learner.promotion
            ? { id: learner.promotion.id, name: learner.promotion.name }
            : null,
          referential: learner.referential
            ? { id: learner.referential.id, name: learner.referential.name }
            : null,
          absenceCount: 0,
          lateCount: 0,
          presentCount: 0,
          totalRecords: 0,
          expectedDays: 0,
          attendedDays: new Set<string>(),
          attendanceRate: 0,
        },
      ]),
    );

    const cohortExpectedDays = new Set(
      attendanceRecords
        .filter((record) => {
          if (!this.isInstructionDay(record.date)) {
            return false;
          }

          const learnerPromotionId = learnerPromotionIds.get(record.learnerId);
          const blockedDays = learnerPromotionId
            ? blockedAttendanceDaysByPromotion.get(learnerPromotionId)
            : undefined;

          return !blockedDays?.has(this.getAttendanceDayKey(record.date));
        })
        .map((record) => this.getAttendanceDayKey(record.date)),
    );

    const attendanceByLearnerDay = new Map<
      string,
      (typeof attendanceRecords)[number]
    >();

    attendanceRecords.forEach((record) => {
      const existingLearner = learnersMap.get(record.learnerId);
      if (!existingLearner) {
        return;
      }

      if (!this.isInstructionDay(record.date)) {
        return;
      }

      const learnerPromotionId = learnerPromotionIds.get(record.learnerId);
      const blockedDays = learnerPromotionId
        ? blockedAttendanceDaysByPromotion.get(learnerPromotionId)
        : undefined;

      if (blockedDays?.has(this.getAttendanceDayKey(record.date))) {
        return;
      }

      const learnerData = activeLearners.find(
        (learner) => learner.id === record.learnerId,
      );
      const learnerStartDate = learnerData
        ? this.getLearnerAnalyticsStartDate(
            learnerData,
            replacementStartDates.get(record.learnerId) ?? null,
            sessionAttendanceInfoMap,
          )
        : null;

      if (!this.isAttendanceOnOrAfterStart(record.date, learnerStartDate)) {
        return;
      }

      const dateKey = this.getAttendanceDayKey(record.date);
      const mapKey = `${record.learnerId}:${dateKey}`;
      const existingRecord = attendanceByLearnerDay.get(mapKey);
      const recordTimestamp =
        record.updatedAt?.getTime?.() ?? record.date.getTime();
      const existingTimestamp =
        existingRecord?.updatedAt?.getTime?.() ??
        existingRecord?.date.getTime?.() ??
        0;

      if (!existingRecord || recordTimestamp > existingTimestamp) {
        attendanceByLearnerDay.set(mapKey, record);
      }
    });

    attendanceByLearnerDay.forEach((record) => {
      const existingLearner = learnersMap.get(record.learnerId);
      if (!existingLearner) {
        return;
      }

      existingLearner.totalRecords += 1;

      const dateKey = this.getAttendanceDayKey(record.date);

      if (record.isPresent) {
        existingLearner.attendedDays.add(dateKey);
        existingLearner.presentCount += 1;
      }

      if (record.isLate) {
        existingLearner.lateCount += 1;
      }
    });

    activeLearners.forEach((learner) => {
      const existingLearner = learnersMap.get(learner.id);
      if (!existingLearner) {
        return;
      }

      const learnerStartDate = this.getLearnerAnalyticsStartDate(
        learner,
        replacementStartDates.get(learner.id) ?? null,
        sessionAttendanceInfoMap,
      );

      if (!learnerStartDate) {
        existingLearner.expectedDays = 0;
        return;
      }

      existingLearner.expectedDays = Array.from(cohortExpectedDays).filter(
        (dayKey) => {
          const dayDate = new Date(`${dayKey}T00:00:00.000Z`);
          return this.isAttendanceOnOrAfterStart(dayDate, learnerStartDate);
        },
      ).length;
    });

    const learnersWithStats = Array.from(learnersMap.values()).map(
      (learner) => {
        const inferredAbsenceCount = Math.max(
          learner.expectedDays - learner.attendedDays.size,
          0,
        );
        const attendanceRate =
          learner.expectedDays > 0
            ? Number(
                (
                  (learner.attendedDays.size / learner.expectedDays) *
                  100
                ).toFixed(2),
              )
            : 0;

        return {
          learnerId: learner.learnerId,
          firstName: learner.firstName,
          lastName: learner.lastName,
          matricule: learner.matricule,
          photoUrl: learner.photoUrl,
          promotion: learner.promotion,
          referential: learner.referential,
          absenceCount: inferredAbsenceCount,
          lateCount: learner.lateCount,
          presentCount: learner.presentCount,
          totalRecords: learner.totalRecords,
          attendanceRate,
        };
      },
    );

    const mostAbsent = [...learnersWithStats]
      .sort(
        (a, b) =>
          b.absenceCount - a.absenceCount ||
          b.lateCount - a.lateCount ||
          a.attendanceRate - b.attendanceRate,
      )
      .filter((learner) => learner.absenceCount > 0)
      .slice(0, limit);

    const mostLate = [...learnersWithStats]
      .sort(
        (a, b) =>
          b.lateCount - a.lateCount ||
          b.absenceCount - a.absenceCount ||
          a.attendanceRate - b.attendanceRate,
      )
      .filter((learner) => learner.lateCount > 0)
      .slice(0, limit);

    const sortedMostRegular = this.sortMostRegular(learnersWithStats).filter(
      (learner) => learner.presentCount > 0,
    );

    return {
      period,
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      filters: {
        promotionId: params.promotionId || null,
        referentialId: params.referentialId || null,
        limit,
      },
      expectedDays: cohortExpectedDays.size,
      learnersWithStats,
      mostAbsent,
      mostLate,
      mostRegular: sortedMostRegular.slice(0, limit),
      sortedMostRegular,
    };
  }

  private getAttendanceDayKey(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private isPastOrCurrentAttendanceDay(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const comparedDate = new Date(date);
    comparedDate.setHours(0, 0, 0, 0);

    return comparedDate.getTime() <= today.getTime();
  }

  private isInstructionDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6 && this.isPastOrCurrentAttendanceDay(date);
  }

  private normalizeAttendanceBoundary(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private isAttendanceOnOrAfterStart(
    date: Date,
    startDate: Date | null,
  ): boolean {
    if (!startDate) {
      return true;
    }

    return (
      this.normalizeAttendanceBoundary(date).getTime() >= startDate.getTime()
    );
  }

  private getLearnerAnalyticsStartDate(
    learner: {
      createdAt?: Date | null;
      status: LearnerStatus;
      sessionId?: string | null;
    },
    replacementStartDate?: Date | null,
    sessionAttendanceInfoMap?: Map<string, AttendanceSessionInfo>,
  ): Date | null {
    if (learner.status === LearnerStatus.REPLACEMENT) {
      return replacementStartDate ?? null;
    }

    const sessionInfo = learner.sessionId
      ? sessionAttendanceInfoMap?.get(learner.sessionId)
      : null;

    if (sessionInfo?.startDate) {
      return this.normalizeAttendanceBoundary(sessionInfo.startDate);
    }

    if (!learner.createdAt) {
      return null;
    }

    return this.normalizeAttendanceBoundary(learner.createdAt);
  }

  private async getReferentialAttendanceClosures(
    referentialIds: string[],
  ): Promise<Map<string, Date | null>> {
    if (referentialIds.length === 0) {
      return new Map();
    }

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string; attendanceClosedAt: Date | null }>
      >(
        Prisma.sql`SELECT id, "attendanceClosedAt" FROM "Referential" WHERE id IN (${Prisma.join(referentialIds)})`,
      );

      return new Map(rows.map((row) => [row.id, row.attendanceClosedAt]));
    } catch (error) {
      this.logger.warn(
        `attendanceClosedAt indisponible sur Referential, fallback à null: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return new Map(referentialIds.map((id) => [id, null]));
    }
  }

  private async getSessionAttendanceInfoMap(
    sessionIds: string[],
  ): Promise<Map<string, AttendanceSessionInfo>> {
    if (sessionIds.length === 0) {
      return new Map();
    }

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          startDate: Date | null;
          endDate: Date | null;
          attendanceClosedAt: Date | null;
        }>
      >(
        Prisma.sql`SELECT id, "startDate", "endDate", "attendanceClosedAt" FROM "Session" WHERE id IN (${Prisma.join(sessionIds)})`,
      );

      return new Map(
        rows.map((row) => [
          row.id,
          {
            startDate: row.startDate,
            endDate: row.endDate,
            attendanceClosedAt: row.attendanceClosedAt,
          },
        ]),
      );
    } catch (error) {
      this.logger.warn(
        `attendanceClosedAt indisponible sur Session, fallback à null: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return new Map(
        sessionIds.map((id) => [
          id,
          {
            startDate: null,
            endDate: null,
            attendanceClosedAt: null,
          },
        ]),
      );
    }
  }

  private getLearnerAttendanceClosureState(
    learner: {
      refId?: string | null;
      sessionId?: string | null;
    },
    referentialAttendanceClosures: Map<string, Date | null>,
    sessionAttendanceInfoMap: Map<string, AttendanceSessionInfo>,
  ) {
    const sessionInfo = learner.sessionId
      ? sessionAttendanceInfoMap.get(learner.sessionId) ?? null
      : null;
    const referentialAttendanceClosedAt =
      learner.refId && referentialAttendanceClosures.has(learner.refId)
        ? referentialAttendanceClosures.get(learner.refId) ?? null
        : null;

    return {
      sessionInfo,
      normalizedSessionStartDate: sessionInfo?.startDate
        ? this.normalizeAttendanceBoundary(sessionInfo.startDate)
        : null,
      normalizedSessionEndDate: sessionInfo?.endDate
        ? this.normalizeAttendanceBoundary(sessionInfo.endDate)
        : null,
      normalizedSessionClosedAt: sessionInfo?.attendanceClosedAt
        ? this.normalizeAttendanceBoundary(sessionInfo.attendanceClosedAt)
        : null,
      normalizedReferentialClosedAt: referentialAttendanceClosedAt
        ? this.normalizeAttendanceBoundary(referentialAttendanceClosedAt)
        : null,
    };
  }

  private getLearnerAttendanceBlockMessage(
    learner: {
      refId?: string | null;
      sessionId?: string | null;
      promotionId?: string | null;
    },
    referentialAttendanceClosures: Map<string, Date | null>,
    sessionAttendanceInfoMap: Map<string, AttendanceSessionInfo>,
    targetDate: Date,
  ): string | null {
    const normalizedTargetDate = this.normalizeAttendanceBoundary(targetDate);
    const closureState = this.getLearnerAttendanceClosureState(
      learner,
      referentialAttendanceClosures,
      sessionAttendanceInfoMap,
    );

    if (
      closureState.normalizedSessionStartDate &&
      normalizedTargetDate.getTime() <
        closureState.normalizedSessionStartDate.getTime()
    ) {
      return "Cette session n'est pas encore ouverte. Aucun pointage n'est autorisé.";
    }

    if (
      closureState.normalizedSessionEndDate &&
      normalizedTargetDate.getTime() >
        closureState.normalizedSessionEndDate.getTime()
    ) {
      return "Cette session est terminée. Aucun pointage n'est autorisé.";
    }

    if (
      closureState.normalizedSessionClosedAt &&
      normalizedTargetDate.getTime() >=
        closureState.normalizedSessionClosedAt.getTime()
    ) {
      return "Cette session est clôturée. Aucun pointage n'est autorisé.";
    }

    if (
      !closureState.sessionInfo &&
      closureState.normalizedReferentialClosedAt &&
      normalizedTargetDate.getTime() >=
        closureState.normalizedReferentialClosedAt.getTime()
    ) {
      return "Ce référentiel est clôturé. Aucun pointage n'est autorisé.";
    }

    return null;
  }

  private isLearnerExpectedForAttendanceOnDate(
    learner: {
      refId?: string | null;
      sessionId?: string | null;
      promotionId?: string | null;
    },
    referentialAttendanceClosures: Map<string, Date | null>,
    sessionAttendanceInfoMap: Map<string, AttendanceSessionInfo>,
    targetDate: Date,
    blockedAttendanceDaysByPromotion?: Map<string, Set<string>>,
  ): boolean {
    const normalizedTargetDate = this.normalizeAttendanceBoundary(targetDate);
    const targetDayKey = this.getAttendanceDayKey(normalizedTargetDate);
    const closureState = this.getLearnerAttendanceClosureState(
      learner,
      referentialAttendanceClosures,
      sessionAttendanceInfoMap,
    );

    if (
      closureState.normalizedSessionStartDate &&
      normalizedTargetDate.getTime() <
        closureState.normalizedSessionStartDate.getTime()
    ) {
      return false;
    }

    if (
      closureState.normalizedSessionEndDate &&
      normalizedTargetDate.getTime() >
        closureState.normalizedSessionEndDate.getTime()
    ) {
      return false;
    }

    if (
      closureState.normalizedSessionClosedAt &&
      normalizedTargetDate.getTime() >=
        closureState.normalizedSessionClosedAt.getTime()
    ) {
      return false;
    }

    if (
      !closureState.sessionInfo &&
      closureState.normalizedReferentialClosedAt &&
      normalizedTargetDate.getTime() >=
        closureState.normalizedReferentialClosedAt.getTime()
    ) {
      return false;
    }

    if (learner.promotionId) {
      const blockedDates = blockedAttendanceDaysByPromotion?.get(
        learner.promotionId,
      );

      if (blockedDates?.has(targetDayKey)) {
        return false;
      }
    }

    return true;
  }

  private isLearnerExpectedForAttendanceInRange(
    learner: {
      refId?: string | null;
      sessionId?: string | null;
      promotionId?: string | null;
    },
    referentialAttendanceClosures: Map<string, Date | null>,
    sessionAttendanceInfoMap: Map<string, AttendanceSessionInfo>,
    startDate: Date,
    endDate: Date,
  ): boolean {
    const normalizedStartDate = this.normalizeAttendanceBoundary(startDate);
    const normalizedEndDate = this.normalizeAttendanceBoundary(endDate);
    const closureState = this.getLearnerAttendanceClosureState(
      learner,
      referentialAttendanceClosures,
      sessionAttendanceInfoMap,
    );

    if (
      closureState.normalizedSessionStartDate &&
      normalizedEndDate.getTime() <
        closureState.normalizedSessionStartDate.getTime()
    ) {
      return false;
    }

    if (
      closureState.normalizedSessionEndDate &&
      normalizedStartDate.getTime() >
        closureState.normalizedSessionEndDate.getTime()
    ) {
      return false;
    }

    if (
      closureState.normalizedSessionClosedAt &&
      normalizedStartDate.getTime() >=
        closureState.normalizedSessionClosedAt.getTime()
    ) {
      return false;
    }

    if (
      !closureState.sessionInfo &&
      closureState.normalizedReferentialClosedAt &&
      normalizedStartDate.getTime() >=
        closureState.normalizedReferentialClosedAt.getTime()
    ) {
      return false;
    }

    return true;
  }

  private async getLearnerAttendanceBlockReason(
    learner: {
      refId?: string | null;
      sessionId?: string | null;
      promotionId?: string | null;
    },
    targetDate: Date,
  ): Promise<string | null> {
    const referentialAttendanceClosures =
      await this.getReferentialAttendanceClosures(
        learner.refId ? [learner.refId] : [],
      );
    const sessionAttendanceInfoMap = await this.getSessionAttendanceInfoMap(
      learner.sessionId ? [learner.sessionId] : [],
    );

    const blockReason = this.getLearnerAttendanceBlockMessage(
      learner,
      referentialAttendanceClosures,
      sessionAttendanceInfoMap,
      targetDate,
    );

    if (blockReason) {
      return blockReason;
    }

    if (!learner.promotionId) {
      return null;
    }

    const blockingEvent = await this.eventsService.getBlockingEventForPromotionDate(
      learner.promotionId,
      targetDate,
      "attendance",
    );

    if (blockingEvent?.type === EVENT_TYPE_HOLIDAY) {
      return "Aujourd'hui est un jour férié. Aucun pointage n'est autorisé.";
    }

    if (blockingEvent?.type === EVENT_TYPE_NO_CLASS) {
      return "Aujourd'hui est un jour sans cours. Le pointage de présence est désactivé.";
    }

    return null;
  }

  private async getFilteredLearnerAttendanceRecords<
    T extends {
      learnerId: string;
      date: Date;
      learner?: { promotionId?: string | null };
    },
  >(records: T[]): Promise<T[]> {
    if (records.length === 0) {
      return records;
    }

    const learnerPromotionIds = new Map<string, string | null>();
    const promotionIds = new Set<string>();
    const timestamps = records.map((record) =>
      this.normalizeAttendanceBoundary(record.date).getTime(),
    );

    records.forEach((record) => {
      const promotionId = record.learner?.promotionId ?? null;
      learnerPromotionIds.set(record.learnerId, promotionId);
      if (promotionId) {
        promotionIds.add(promotionId);
      }
    });

    const blockedAttendanceDaysByPromotion =
      await this.eventsService.getBlockedDateKeysByPromotion(
        Array.from(promotionIds),
        new Date(Math.min(...timestamps)),
        new Date(Math.max(...timestamps)),
        "attendance",
      );

    return records.filter((record) => {
      if (!this.isInstructionDay(record.date)) {
        return false;
      }

      const promotionId = learnerPromotionIds.get(record.learnerId);
      const blockedDays = promotionId
        ? blockedAttendanceDaysByPromotion.get(promotionId)
        : undefined;

      return !blockedDays?.has(this.getAttendanceDayKey(record.date));
    });
  }

  private getTodayStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private assertNotFutureAttendanceDate(date: Date) {
    if (date.getTime() > this.getTodayStart().getTime()) {
      throw new BadRequestException("Future attendance dates are not allowed");
    }
  }

  private normalizeAttendanceDate(date: string): Date {
    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      throw new BadRequestException("Invalid attendance date");
    }
    attendanceDate.setHours(0, 0, 0, 0);
    this.assertNotFutureAttendanceDate(attendanceDate);
    return attendanceDate;
  }

  private async resolveLearnerAttendanceRecord(
    attendanceId: string,
    date?: string,
  ) {
    if (!attendanceId.startsWith("absent-")) {
      const attendance = await this.prisma.learnerAttendance.findUnique({
        where: { id: attendanceId },
        include: {
          learner: {
            include: { referential: true },
          },
        },
      });

      if (!attendance) {
        throw new NotFoundException("Attendance record not found");
      }

      this.assertNotFutureAttendanceDate(attendance.date);

      return attendance;
    }

    if (!date) {
      throw new BadRequestException(
        "A date is required to update a generated absence record",
      );
    }

    const generatedAbsenceMatch = attendanceId.match(
      /^absent-(.+)-(\d{4}-\d{2}-\d{2})$/,
    );
    const learnerId = generatedAbsenceMatch
      ? generatedAbsenceMatch[1]
      : attendanceId.replace("absent-", "");
    const attendanceDate = this.normalizeAttendanceDate(date);

    const existingAttendance = await this.prisma.learnerAttendance.findFirst({
      where: {
        learnerId,
        date: attendanceDate,
      },
      include: {
        learner: {
          include: { referential: true },
        },
      },
    });

    if (existingAttendance) {
      return existingAttendance;
    }

    return this.prisma.learnerAttendance.create({
      data: {
        learnerId,
        date: attendanceDate,
        isPresent: false,
        isLate: false,
        status: AbsenceStatus.TO_JUSTIFY,
        scanTime: null,
      },
      include: {
        learner: {
          include: { referential: true },
        },
      },
    });
  }

  private isWithinScanTime(scanTime: Date): boolean {
    const cutoffTime = new Date(
      scanTime.getFullYear(),
      scanTime.getMonth(),
      scanTime.getDate(),
      8,
      15,
    );
    return scanTime <= cutoffTime;
  }

  // 🔧 OPTIMISÉ : Scan unique et rapide
  async scan(
    matricule: string,
  ): Promise<LearnerScanResponse | CoachScanResponse> {
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
            take: 1,
          },
        },
      }),
      this.prisma.coach.findUnique({
        where: { matricule },
        include: {
          user: true,
          referentials: true,
          attendances: {
            where: { date: today },
            take: 1,
            select: {
              id: true,
              checkIn: true,
              checkOut: true, // ✅ était manquant
              isLate: true,
            },
          },
        },
      }),
    ]);

    // 2. Traiter l'apprenant s'il existe
    if (learner) {
      const attendanceBlockReason = await this.getLearnerAttendanceBlockReason(
        learner,
        today,
      );

      if (attendanceBlockReason) {
        throw new BadRequestException(attendanceBlockReason);
      }

      // Vérifier si déjà scanné
      if (learner.attendances && learner.attendances.length > 0) {
        const existingAttendance = learner.attendances[0];
        throw new ConflictException(
          `${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || "heure inconnue"}`,
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
          status: isLate ? "TO_JUSTIFY" : "PENDING",
        },
      });

      return {
        type: "LEARNER",
        scanTime: attendance.scanTime,
        attendanceStatus: isLate ? "LATE" : "PRESENT",
        isAlreadyScanned: false,
        learner: {
          id: learner.id,
          matricule: learner.matricule,
          firstName: learner.firstName,
          lastName: learner.lastName,
          photoUrl: learner.photoUrl,
          referential: learner.referential,
          promotion: learner.promotion,
        },
      };
    }

    // 3. Traiter le coach s'il existe
    if (coach) {
      const existingAttendance = coach.attendances?.[0];

      // ✅ CHECK-OUT : arrivée existante sans départ
      if (existingAttendance?.checkIn && !existingAttendance?.checkOut) {
        const updated = await this.prisma.coachAttendance.update({
          where: { id: existingAttendance.id },
          data: { checkOut: now },
        });

        return {
          type: "COACH",
          scanTime: updated.checkOut!,
          attendanceStatus: "CHECKOUT",
          isAlreadyScanned: false,
          coach: {
            id: coach.id,
            matricule: coach.matricule,
            firstName: coach.firstName,
            lastName: coach.lastName,
            photoUrl: coach.photoUrl,
            referential: coach.referentials?.[0] || null,
          },
        };
      }

      // ✅ Déjà check-in ET check-out
      if (existingAttendance?.checkIn && existingAttendance?.checkOut) {
        throw new ConflictException(
          `${coach.firstName} ${coach.lastName} a déjà effectué son pointage de sortie aujourd'hui`,
        );
      }

      // ✅ CHECK-IN : pas encore de pointage aujourd'hui
      const attendance = await this.prisma.coachAttendance.create({
        data: {
          date: today,
          isPresent: true,
          checkIn: now,
          isLate,
          coachId: coach.id,
        },
      });

      return {
        type: "COACH",
        scanTime: attendance.checkIn!,
        attendanceStatus: isLate ? "LATE" : "PRESENT",
        isAlreadyScanned: false,
        coach: {
          id: coach.id,
          matricule: coach.matricule,
          firstName: coach.firstName,
          lastName: coach.lastName,
          photoUrl: coach.photoUrl,
          referential: coach.referentials?.[0] || null,
        },
      };
    }

    // 4. Aucun utilisateur trouvé
    throw new NotFoundException("Aucun utilisateur trouvé avec ce matricule");
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
      throw new NotFoundException("Apprenant non trouvé");
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
      throw new NotFoundException("Coach non trouvé");
    }

    return coach;
  }

  public async scanLearner(matricule: string): Promise<LearnerScanResponse> {
    const learner = await this.findLearnerByMatricule(matricule);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const attendanceBlockReason = await this.getLearnerAttendanceBlockReason(
      learner,
      today,
    );

    if (attendanceBlockReason) {
      throw new BadRequestException(attendanceBlockReason);
    }

    const existingAttendance = await this.prisma.learnerAttendance.findFirst({
      where: {
        learnerId: learner.id,
        date: today,
      },
    });

    if (existingAttendance) {
      throw new ConflictException(
        `${learner.firstName} ${learner.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.scanTime?.toLocaleTimeString() || "heure inconnue"}`,
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
        status: isLate ? "TO_JUSTIFY" : "PENDING",
      },
    });

    return {
      type: "LEARNER",
      scanTime: attendance.scanTime,
      attendanceStatus: isLate ? "LATE" : "PRESENT",
      isAlreadyScanned: false,
      learner: {
        id: learner.id,
        matricule: learner.matricule,
        firstName: learner.firstName,
        lastName: learner.lastName,
        photoUrl: learner.photoUrl,
        referential: learner.referential,
        promotion: learner.promotion,
      },
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
        `${coach.firstName} ${coach.lastName} a déjà été scanné aujourd'hui à ${existingAttendance.checkIn?.toLocaleTimeString() || "heure inconnue"}`,
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
      },
    });

    return {
      type: "COACH",
      scanTime: attendance.checkIn!,
      attendanceStatus: isLate ? "LATE" : "PRESENT",
      isAlreadyScanned: false,
      coach: {
        id: coach.id,
        matricule: coach.matricule,
        firstName: coach.firstName,
        lastName: coach.lastName,
        photoUrl: coach.photoUrl,
        referential: coach.referentials?.[0] || null,
      },
    };
  }

  async submitAbsenceJustification(
    attendanceId: string,
    justification: string,
    date?: string,
    documentUrl?: string,
  ) {
    const attendanceRecord = await this.resolveLearnerAttendanceRecord(
      attendanceId,
      date,
    );
    this.assertNotFutureAttendanceDate(attendanceRecord.date);

    const attendance = await this.prisma.learnerAttendance.update({
      where: { id: attendanceRecord.id },
      data: {
        justification,
        documentUrl,
        status: "PENDING",
      },
      include: {
        learner: true,
      },
    });

    await this.notificationsService.createJustificationNotification(
      attendance.id,
      attendance.learnerId,
      `${attendance.learner.firstName} ${attendance.learner.lastName} a soumis une justification ${attendance.isLate ? "de retard" : "d'absence"}`,
    );

    return attendance;
  }

  async updateAbsenceJustification(
    attendanceId: string,
    justification: string,
    date?: string,
    documentUrl?: string,
    removeExistingDocument: boolean = false,
  ) {
    const attendanceRecord = await this.resolveLearnerAttendanceRecord(
      attendanceId,
      date,
    );
    this.assertNotFutureAttendanceDate(attendanceRecord.date);

    if (attendanceRecord.status === AbsenceStatus.APPROVED) {
      throw new BadRequestException(
        "An approved justification cannot be modified",
      );
    }

    if (
      !justification.trim() &&
      !documentUrl &&
      !attendanceRecord.documentUrl
    ) {
      throw new BadRequestException(
        "A justification or a document is required",
      );
    }

    const shouldDeleteExistingDocument =
      Boolean(attendanceRecord.documentUrl) &&
      (removeExistingDocument ||
        Boolean(documentUrl && documentUrl !== attendanceRecord.documentUrl));

    if (shouldDeleteExistingDocument && attendanceRecord.documentUrl) {
      try {
        await this.cloudinaryService.deleteFileByUrl(
          attendanceRecord.documentUrl,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete existing justification document for attendance ${attendanceRecord.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const updatedAttendance = await this.prisma.learnerAttendance.update({
      where: { id: attendanceRecord.id },
      data: {
        justification: justification.trim(),
        documentUrl: removeExistingDocument
          ? (documentUrl ?? null)
          : (documentUrl ?? attendanceRecord.documentUrl ?? null),
        justificationComment: null,
        status: AbsenceStatus.PENDING,
      },
      include: {
        learner: true,
      },
    });

    return updatedAttendance;
  }

  async deleteAbsenceJustification(attendanceId: string, date?: string) {
    const attendanceRecord = await this.resolveLearnerAttendanceRecord(
      attendanceId,
      date,
    );
    this.assertNotFutureAttendanceDate(attendanceRecord.date);

    if (attendanceRecord.status === AbsenceStatus.APPROVED) {
      throw new BadRequestException(
        "An approved justification cannot be deleted",
      );
    }

    if (attendanceRecord.documentUrl) {
      try {
        await this.cloudinaryService.deleteFileByUrl(
          attendanceRecord.documentUrl,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete justification document for attendance ${attendanceRecord.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return this.prisma.learnerAttendance.update({
      where: { id: attendanceRecord.id },
      data: {
        justification: null,
        documentUrl: null,
        justificationComment: null,
        status: AbsenceStatus.TO_JUSTIFY,
      },
      include: {
        learner: true,
      },
    });
  }

  // Dans attendance.service.ts
  async updateAbsenceStatus(
    attendanceId: string,
    status: AbsenceStatus,
    comment?: string,
    date?: string,
  ): Promise<LearnerAttendance> {
    const attendance = await this.resolveLearnerAttendanceRecord(
      attendanceId,
      date,
    );
    this.assertNotFutureAttendanceDate(attendance.date);

    // ✅ MODIFICATION : Permettre la mise à jour même si déjà traité
    // On refuse seulement si c'est déjà approuvé ET qu'on essaie d'approuver à nouveau
    if (
      attendance.status === AbsenceStatus.APPROVED &&
      status === AbsenceStatus.APPROVED
    ) {
      throw new BadRequestException("This justification is already approved");
    }

    // Vérifier qu'une justification a été soumise
    if (!attendance.justification && !attendance.documentUrl) {
      throw new BadRequestException(
        "No justification has been submitted for this absence/tardiness",
      );
    }

    const updatedAttendance = await this.prisma.learnerAttendance.update({
      where: { id: attendance.id },
      data: {
        status,
        justificationComment: comment,
      },
      include: {
        learner: {
          include: {
            referential: true,
          },
        },
      },
    });

    return updatedAttendance;
  }
  async forceApprove(
    attendanceId: string,
    date?: string,
  ): Promise<LearnerAttendance> {
    const attendance = await this.resolveLearnerAttendanceRecord(
      attendanceId,
      date,
    );
    this.assertNotFutureAttendanceDate(attendance.date);

    // ✅ Pas de vérification de justification — l'admin force l'autorisation
    const updated = await this.prisma.learnerAttendance.update({
      where: { id: attendance.id },
      data: {
        status: AbsenceStatus.APPROVED,
        justificationComment: "Autorisé par l'administrateur",
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
          scanTime: { not: null },
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
                select: { id: true, name: true },
              },
              promotion: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { scanTime: "desc" },
        take: limit,
      }),
      this.prisma.coachAttendance.findMany({
        where: {
          date: today,
          isPresent: true,
          checkIn: { not: null },
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
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { checkIn: "desc" },
        take: limit,
      }),
    ]); // ✅ fermeture correcte de Promise.all

    this.logger.log(
      `Found ${learnerScans.length} learner scans and ${coachScans.length} coach scans`,
    );

    return {
      learnerScans: learnerScans.map((scan) => ({
        id: scan.id,
        type: "LEARNER",
        scanTime: scan.scanTime!.toISOString(),
        isLate: scan.isLate,
        attendanceStatus: scan.isLate ? "LATE" : "PRESENT",
        learner: scan.learner,
      })),
      coachScans: coachScans.map((scan) => ({
        id: scan.id,
        type: "COACH",
        scanTime: scan.checkIn!.toISOString(),
        isLate: scan.isLate,
        attendanceStatus: scan.isLate ? "LATE" : "PRESENT",
        coach: {
          ...scan.coach,
          referential: scan.coach.referentials?.[0] || null, // ✅ normaliser pour le frontend
        },
      })),
    };
  }

  // Dans attendance.service.ts - Méthode corrigée

  async getAbsentsByReferential(date: string, referentialId: string) {
    try {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);

      this.logger.log(
        `Getting absents for referential ${referentialId} on ${date}`,
      );

      // 1️⃣ Récupère les apprenants attendus du référentiel sélectionné
      const learners = await this.prisma.learner.findMany({
        where: {
          refId: referentialId, // ✅ FILTRE PAR RÉFÉRENTIEL
          status: {
            in: [LearnerStatus.ACTIVE, LearnerStatus.REPLACEMENT],
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          photoUrl: true,
          address: true,
          refId: true,
          sessionId: true,
          promotionId: true,
          referential: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const referentialAttendanceClosures =
        await this.getReferentialAttendanceClosures([referentialId]);
      const sessionIds = Array.from(
        new Set(
          learners
            .map((learner) => learner.sessionId)
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
        ),
      );
      const sessionAttendanceInfoMap =
        await this.getSessionAttendanceInfoMap(sessionIds);
      const promotionIds = Array.from(
        new Set(
          learners
            .map((learner) => learner.promotionId)
            .filter((promotionId): promotionId is string => Boolean(promotionId)),
        ),
      );
      const blockedAttendanceDaysByPromotion =
        await this.eventsService.getBlockedDateKeysByPromotion(
          promotionIds,
          targetDate,
          targetDate,
          "attendance",
        );

      const expectedLearners = learners.filter((learner) =>
        this.isLearnerExpectedForAttendanceOnDate(
          learner,
          referentialAttendanceClosures,
          sessionAttendanceInfoMap,
          targetDate,
          blockedAttendanceDaysByPromotion,
        ),
      );

      if (!expectedLearners.length) {
        this.logger.log(
          `No expected learners found in referential ${referentialId} for ${date}`,
        );
        return {
          date: targetDate.toISOString(),
          referentialId,
          totalAbsents: 0,
          absents: [],
          message: "Aucun apprenant attendu dans ce référentiel.",
        };
      }

      this.logger.log(
        `Found ${learners.length} expected learners in referential ${referentialId}`,
      );

      // 2️⃣ Récupère les présences du jour UNIQUEMENT pour ces apprenants
      const attendances = await this.prisma.learnerAttendance.findMany({
        where: {
        learnerId: { in: expectedLearners.map((l) => l.id) },
          date: { gte: targetDate, lt: nextDay },
        },
        select: {
          learnerId: true,
          isPresent: true,
          isLate: true,
        },
      });

      this.logger.log(
        `Found ${attendances.length} attendance records for today`,
      );

      // 3️⃣ Créer un Set des IDs des apprenants présents (même en retard)
      const presentIds = new Set(
        attendances
          .filter((a) => a.isPresent) // Présent à l'heure OU en retard
          .map((a) => a.learnerId),
      );

      // 4️⃣ Filtrer les absents : ceux qui ne sont pas dans presentIds
      const absents = expectedLearners.filter((l) => !presentIds.has(l.id));

      this.logger.log(
        `Total absents for referential ${referentialId}: ${absents.length}`,
      );

      return {
        date: targetDate.toISOString(),
        referentialId,
        totalAbsents: absents.length,
        absents: absents.map((l) => ({
          id: l.id,
          firstName: l.firstName,
          lastName: l.lastName,
          matricule: l.matricule,
          photoUrl: l.photoUrl,
          address: l.address,
          referentialId: l.refId,
          referential: l.referential,
        })),
      };
    } catch (error) {
      this.logger.error("Erreur lors de la récupération des absents :", error);
      throw new Error(
        "Impossible de récupérer les absents pour ce référentiel",
      );
    }
  }

  // ✅ Également corriger getDailyStats pour filtrer par référentiel
  async getDailyStats(date: string, referentialId?: string) {
    try {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      // ✅ 1. Récupérer tous les apprenants attendus
      const learnersWhere: any = {
        status: {
          in: [LearnerStatus.ACTIVE, LearnerStatus.REPLACEMENT],
        },
      };
      if (referentialId) learnersWhere.refId = referentialId;

      const allLearners = await this.prisma.learner.findMany({
        where: learnersWhere,
        include: {
          referential: true,
        },
      });

      const referentialIds = Array.from(
        new Set(
          allLearners
            .map((learner) => learner.refId)
            .filter((refId): refId is string => Boolean(refId)),
        ),
      );

      const referentialAttendanceClosures =
        await this.getReferentialAttendanceClosures(referentialIds);
      const sessionIds = Array.from(
        new Set(
          allLearners
            .map((learner) => learner.sessionId)
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
        ),
      );
      const sessionAttendanceInfoMap =
        await this.getSessionAttendanceInfoMap(sessionIds);
      const promotionIds = Array.from(
        new Set(
          allLearners
            .map((learner) => learner.promotionId)
            .filter((promotionId): promotionId is string => Boolean(promotionId)),
        ),
      );
      const blockedAttendanceDaysByPromotion =
        await this.eventsService.getBlockedDateKeysByPromotion(
          promotionIds,
          targetDate,
          targetDate,
          "attendance",
        );

      const expectedLearners = allLearners.filter((learner) =>
        this.isLearnerExpectedForAttendanceOnDate(
          learner,
          referentialAttendanceClosures,
          sessionAttendanceInfoMap,
          targetDate,
          blockedAttendanceDaysByPromotion,
        ),
      );

      // ✅ 2. Récupérer les pointages du jour
      const whereClause: any = { date: targetDate };
      if (referentialId) whereClause.learner = { refId: referentialId };

      const rawAttendanceRecords = await this.prisma.learnerAttendance.findMany({
        where: whereClause,
        include: { learner: { include: { referential: true } } },
      });
      const expectedLearnerIds = new Set(
        expectedLearners.map((learner) => learner.id),
      );
      const attendanceRecords = rawAttendanceRecords.filter((record) =>
        expectedLearnerIds.has(record.learnerId),
      );

      // ✅ 3. Construire un map des pointages par learnerId
      const attendanceMap = new Map(
        attendanceRecords.map((r) => [r.learnerId, r]),
      );

      // ✅ 4. Générer les absences pour les apprenants sans pointage
      const absentRecords = expectedLearners
        .filter((l) => !attendanceMap.has(l.id))
        .map((l) => ({
          id: `absent-${l.id}`,
          date: targetDate.toISOString(),
          scanTime: null,
          isPresent: false,
          isLate: false,
          status: "TO_JUSTIFY" as const,
          justification: null,
          documentUrl: null,
          justificationComment: null,
          learner: {
            id: l.id,
            firstName: l.firstName,
            lastName: l.lastName,
            matricule: l.matricule,
            photoUrl: l.photoUrl,
            address: l.address,
            referential: l.referential
              ? { id: l.referential.id, name: l.referential.name }
              : undefined,
          },
        }));

      // ✅ 5. Combiner pointages réels + absences générées
      const allRecords = [
        ...attendanceRecords.map((record) => ({
          id: record.id,
          date: record.date.toISOString(),
          scanTime: record.scanTime?.toISOString() || null,
          isPresent: record.isPresent,
          isLate: record.isLate,
          status: record.status || "PENDING",
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
            referential: record.learner.referential
              ? {
                  id: record.learner.referential.id,
                  name: record.learner.referential.name,
                }
              : undefined,
          },
        })),
        ...absentRecords,
      ];

      const present = allRecords.filter((r) => r.isPresent && !r.isLate).length;
      const late = allRecords.filter((r) => r.isPresent && r.isLate).length;
      const absent = allRecords.filter((r) => !r.isPresent).length;
      const total = expectedLearners.length;

      return { present, late, absent, total, attendance: allRecords };
    } catch (error) {
      this.logger.error("Error getting daily stats:", error);
      throw error;
    }
  }

  async getMonthlyStats(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const rawAttendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        learner: {
          select: {
            promotionId: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });
    const attendanceRecords = await this.getFilteredLearnerAttendanceRecords(
      rawAttendanceRecords,
    );

    const days = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayRecords = attendanceRecords.filter(
        (record) => record.date.getDate() === currentDate.getDate(),
      );

      days.push({
        date: currentDate.getDate(),
        present: dayRecords.filter((r) => r.isPresent && !r.isLate).length,
        late: dayRecords.filter((r) => r.isPresent && r.isLate).length,
        absent: dayRecords.filter((r) => !r.isPresent).length,
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

    const rawAttendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        learner: {
          select: {
            promotionId: true,
          },
        },
      },
    });
    const attendanceRecords = await this.getFilteredLearnerAttendanceRecords(
      rawAttendanceRecords,
    );

    const months = [];
    for (let month = 0; month < 12; month++) {
      const monthRecords = attendanceRecords.filter(
        (record) => record.date.getMonth() === month,
      );

      months.push({
        month: month + 1,
        present: monthRecords.filter((r) => r.isPresent && !r.isLate).length,
        late: monthRecords.filter((r) => r.isPresent && r.isLate).length,
        absent: monthRecords.filter((r) => !r.isPresent).length,
      });
    }

    return { months };
  }

  async getAttendanceRecords(
    startDate: string,
    endDate: string,
    referentialId?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid attendance range");
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const rawRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        learner: {
          status: {
            in: [LearnerStatus.ACTIVE, LearnerStatus.REPLACEMENT],
          },
          ...(referentialId ? { refId: referentialId } : {}),
        },
      },
      include: {
        learner: {
          select: {
            promotionId: true,
          },
          include: {
            referential: true,
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { updatedAt: "desc" },
      ],
    });
    const records = await this.getFilteredLearnerAttendanceRecords(rawRecords);

    return records.map((record) => ({
      id: record.id,
      date: record.date.toISOString(),
      scanTime: record.scanTime?.toISOString() || null,
      isPresent: record.isPresent,
      isLate: record.isLate,
      status: record.status || "PENDING",
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
        referential: record.learner.referential
          ? {
              id: record.learner.referential.id,
              name: record.learner.referential.name,
            }
          : undefined,
      },
    }));
  }

  async getAtRiskLearners(params: {
    period?: "week" | "month" | "quarter" | "year" | "custom";
    promotionId?: string;
    referentialId?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const leaderboard = await this.computeAttendanceLeaderboard(params);

    return {
      period: leaderboard.period,
      range: leaderboard.range,
      filters: leaderboard.filters,
      expectedDays: leaderboard.expectedDays,
      mostAbsent: leaderboard.mostAbsent,
      mostLate: leaderboard.mostLate,
      mostRegular: leaderboard.mostRegular,
    };
  }

  async getLearnerRegularityLeaderboard(
    email: string,
    params?: {
      period?: "week" | "month" | "quarter" | "year" | "custom";
      startDate?: string;
      endDate?: string;
    },
  ) {
    const learner = await this.prisma.learner.findFirst({
      where: {
        user: {
          email,
        },
      },
      include: {
        referential: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException("Apprenant non trouvé");
    }

    if (!learner.refId) {
      return {
        period: params?.period || "month",
        range: {
          startDate: "",
          endDate: "",
        },
        referential: null,
        totalLearners: 0,
        learner: null,
        topRegular: [],
      };
    }

    const leaderboard = await this.computeAttendanceLeaderboard({
      period: params?.period || "month",
      startDate: params?.startDate,
      endDate: params?.endDate,
      referentialId: learner.refId,
      limit: 5,
    });

    const rankedLearners = leaderboard.sortedMostRegular;
    const learnerIndex = rankedLearners.findIndex(
      (row) => row.learnerId === learner.id,
    );
    const rankedLearner =
      learnerIndex >= 0 ? rankedLearners[learnerIndex] : null;

    return {
      period: leaderboard.period,
      range: leaderboard.range,
      referential: learner.referential
        ? {
            id: learner.referential.id,
            name: learner.referential.name,
          }
        : null,
      totalLearners: rankedLearners.length,
      learner: rankedLearner
        ? {
            ...rankedLearner,
            rank: learnerIndex + 1,
          }
        : null,
      topRegular: rankedLearners.slice(0, 5),
    };
  }

  async getWeeklyStats(year: number) {
    try {
      const startDate = new Date(year, 0, 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);

      const rawAttendanceRecords = await this.prisma.learnerAttendance.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          learner: {
            select: {
              promotionId: true,
            },
          },
        },
      });
      const attendanceRecords = await this.getFilteredLearnerAttendanceRecords(
        rawAttendanceRecords,
      );

      const weeks = Array.from({ length: 52 }, (_, i) => ({
        weekNumber: i + 1,
        present: 0,
        late: 0,
        absent: 0,
      }));

      attendanceRecords.forEach((record) => {
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
      this.logger.error("Error getting weekly stats:", error);
      throw error;
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async getScanHistory(
    type: "LEARNER" | "COACH",
    startDate: Date,
    endDate: Date,
  ) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (type === "LEARNER") {
      return this.prisma.learnerAttendance.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          learner: {
            include: {
              referential: true,
              promotion: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });
    }

    return this.prisma.coachAttendance.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        coach: {
          include: {
            referentials: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
  }

  async getPromotionAttendance(
    promotionId: string,
    startDate: Date,
    endDate: Date,
  ) {
    try {
      const promotion = await this.prisma.promotion.findUnique({
        where: { id: promotionId },
        include: {
          learners: {
            where: {
              status: {
                in: [LearnerStatus.ACTIVE, LearnerStatus.REPLACEMENT],
              },
            },
          },
        },
      });

      if (!promotion) {
        throw new NotFoundException("Promotion not found");
      }

      const learnerIds = promotion.learners.map((learner) => learner.id);
      const referentialIds = Array.from(
        new Set(
          promotion.learners
            .map((learner) => learner.refId)
            .filter((refId): refId is string => Boolean(refId)),
        ),
      );
      const referentialAttendanceClosures =
        await this.getReferentialAttendanceClosures(referentialIds);
      const sessionIds = Array.from(
        new Set(
          promotion.learners
            .map((learner) => learner.sessionId)
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
        ),
      );
      const sessionAttendanceInfoMap =
        await this.getSessionAttendanceInfoMap(sessionIds);

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const replacementLearnerIds = promotion.learners
        .filter((learner) => learner.status === LearnerStatus.REPLACEMENT)
        .map((learner) => learner.id);
      const firstReplacementScans =
        replacementLearnerIds.length > 0
          ? await this.prisma.learnerAttendance.findMany({
              where: {
                learnerId: {
                  in: replacementLearnerIds,
                },
                scanTime: {
                  not: null,
                },
              },
              orderBy: [{ learnerId: "asc" }, { scanTime: "asc" }],
              select: {
                learnerId: true,
                scanTime: true,
                date: true,
              },
            })
          : [];
      const replacementStartDates = new Map<string, Date>();
      firstReplacementScans.forEach((scan) => {
        if (!replacementStartDates.has(scan.learnerId)) {
          replacementStartDates.set(
            scan.learnerId,
            this.normalizeAttendanceBoundary(scan.scanTime ?? scan.date),
          );
        }
      });

      const learnerStartDates = new Map<string, Date | null>();
      promotion.learners.forEach((learner) => {
        learnerStartDates.set(
          learner.id,
          this.getLearnerAnalyticsStartDate(
            learner,
            replacementStartDates.get(learner.id) ?? null,
            sessionAttendanceInfoMap,
          ),
        );
      });

      const rawAttendanceRecords = await this.prisma.learnerAttendance.findMany({
        where: {
          learnerId: { in: learnerIds },
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          learnerId: true,
          date: true,
          isPresent: true,
          isLate: true,
          updatedAt: true,
        },
      });
      const blockedAttendanceDays =
        await this.eventsService.getBlockedDateKeysByPromotion(
          [promotionId],
          start,
          end,
          "attendance",
        );
      const promotionBlockedDays =
        blockedAttendanceDays.get(promotionId) ?? new Set<string>();
      const attendanceByLearnerDay = new Map<
        string,
        (typeof rawAttendanceRecords)[number]
      >();

      rawAttendanceRecords.forEach((record) => {
        if (
          !this.isInstructionDay(record.date) ||
          promotionBlockedDays.has(this.getAttendanceDayKey(record.date))
        ) {
          return;
        }

        const learnerStartDate = learnerStartDates.get(record.learnerId) ?? null;
        if (!this.isAttendanceOnOrAfterStart(record.date, learnerStartDate)) {
          return;
        }

        const mapKey = `${record.learnerId}:${this.getAttendanceDayKey(record.date)}`;
        const existingRecord = attendanceByLearnerDay.get(mapKey);
        const recordTimestamp =
          record.updatedAt?.getTime?.() ?? record.date.getTime();
        const existingTimestamp =
          existingRecord?.updatedAt?.getTime?.() ??
          existingRecord?.date.getTime?.() ??
          0;

        if (!existingRecord || recordTimestamp > existingTimestamp) {
          attendanceByLearnerDay.set(mapKey, record);
        }
      });

      const attendanceDates = Array.from(
        new Set(
          Array.from(attendanceByLearnerDay.values()).map((record) =>
            this.getAttendanceDayKey(record.date),
          ),
        ),
      )
        .map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`))
        .sort((a, b) => a.getTime() - b.getTime());

      const results = attendanceDates.map((attendanceDate) => {
        const dateKey = this.getAttendanceDayKey(attendanceDate);
        const eligibleLearners = promotion.learners.filter((learner) => {
          const learnerStartDate = learnerStartDates.get(learner.id) ?? null;
          return (
            this.isLearnerExpectedForAttendanceOnDate(
              learner,
              referentialAttendanceClosures,
              sessionAttendanceInfoMap,
              attendanceDate,
            ) &&
            this.isAttendanceOnOrAfterStart(attendanceDate, learnerStartDate)
          );
        });

        let presentCount = 0;
        let lateCount = 0;

        eligibleLearners.forEach((learner) => {
          const record = attendanceByLearnerDay.get(`${learner.id}:${dateKey}`);
          if (!record) {
            return;
          }

          if (record.isPresent && !record.isLate) {
            presentCount += 1;
          } else if (record.isPresent && record.isLate) {
            lateCount += 1;
          }
        });

        return {
          date: dateKey,
          presentCount,
          lateCount,
          absentCount: Math.max(
            eligibleLearners.length - presentCount - lateCount,
            0,
          ),
        };
      });

      results.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      return results;
    } catch (error) {
      this.logger.error("Error fetching promotion attendance:", error);
      throw error;
    }
  }

  @Cron("0 0 15 * * 1-5")
  async markAbsentees() {
    if (process.env.READ_ONLY_MODE === "true") {
      this.logger.log(
        "READ_ONLY_MODE enabled, skipping markAbsentees cron job",
      );
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Récupérer tous les coaches actifs
      const coaches = await this.prisma.coach.findMany({
        select: { id: true },
      });

      if (coaches.length === 0) return;

      // 2. Récupérer les coaches qui ont déjà une présence aujourd'hui
      const presentToday = await this.prisma.coachAttendance.findMany({
        where: {
          date: today,
        },
        select: { coachId: true },
      });

      const presentIds = new Set(presentToday.map((a) => a.coachId));

      // 3. Filtrer ceux qui n'ont pas encore de présence
      const coachesToMark = coaches.filter((c) => !presentIds.has(c.id));

      // 4. Créer les absences en une seule opération
      if (coachesToMark.length > 0) {
        await this.prisma.coachAttendance.createMany({
          data: coachesToMark.map((coach) => ({
            coachId: coach.id,
            date: today,
            isPresent: false, // ✅ champ correct du schéma
            isLate: false,
            // pas de checkIn ni checkOut pour une absence
          })),
          skipDuplicates: true,
        });

        this.logger.log(
          `✅ Marked ${coachesToMark.length} coaches as absent for ${today.toISOString().split("T")[0]}`,
        );
      } else {
        this.logger.log(
          `ℹ️ All coaches already have attendance records for today`,
        );
      }
    } catch (error) {
      this.logger.error("Error in markAbsentees cron job:", error);
    }
  }

  async getAttendanceByLearner(learnerId: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        referential: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException(`Apprenant ${learnerId} introuvable`);
    }

    const cohortLearners = await this.prisma.learner.findMany({
      where: {
        promotionId: learner.promotionId,
        ...(learner.sessionId
          ? { sessionId: learner.sessionId }
          : learner.refId
            ? { refId: learner.refId }
            : {}),
        status: {
          in: ["ACTIVE", "REPLACEMENT"],
        },
      },
      select: {
        id: true,
      },
    });

    const cohortAttendanceRecords =
      await this.prisma.learnerAttendance.findMany({
        where: {
          learnerId: {
            in: cohortLearners.map((cohortLearner) => cohortLearner.id),
          },
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
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

    const blockedAttendanceDays = await this.eventsService.getBlockedDateKeysByPromotion(
      learner.promotionId ? [learner.promotionId] : [],
      cohortAttendanceRecords.length > 0
        ? cohortAttendanceRecords[cohortAttendanceRecords.length - 1].date
        : new Date(),
      cohortAttendanceRecords[0]?.date ?? new Date(),
      "attendance",
    );
    const learnerBlockedDays =
      blockedAttendanceDays.get(learner.promotionId ?? "") ?? new Set<string>();

    const learnerRecords = cohortAttendanceRecords.filter(
      (record) =>
        record.learnerId === learnerId &&
        !learnerBlockedDays.has(this.getAttendanceDayKey(record.date)),
    );
    const learnerDates = new Set(
      learnerRecords.map((record) => record.date.toISOString().split("T")[0]),
    );

    const expectedDates = Array.from(
      new Set(
        cohortAttendanceRecords
          .map((record) => record.date.toISOString().split("T")[0])
          .filter((dateKey) => !learnerBlockedDays.has(dateKey)),
      ),
    );

    const generatedAbsentRecords = expectedDates
      .filter((dateKey) => !learnerDates.has(dateKey))
      .map((dateKey) => ({
        id: `absent-${learnerId}`,
        learnerId,
        date: new Date(dateKey),
        scanTime: null,
        isPresent: false,
        isLate: false,
        status: AbsenceStatus.TO_JUSTIFY,
        justification: null,
        documentUrl: null,
        justificationComment: null,
        learner: {
          firstName: learner.firstName,
          lastName: learner.lastName,
          matricule: learner.matricule,
          photoUrl: learner.photoUrl,
          referential: learner.referential
            ? {
                name: learner.referential.name,
              }
            : null,
        },
      }));

    return [...learnerRecords, ...generatedAbsentRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
  async updateAttendanceStatus(
    id: string,
    status: "present" | "late" | "absent",
    date?: string,
  ) {
    const isPresent = status !== "absent";
    const isLate = status === "late";

    if (id.startsWith("absent-")) {
      const attendance = await this.resolveLearnerAttendanceRecord(id, date);
      this.assertNotFutureAttendanceDate(attendance.date);

      return this.prisma.learnerAttendance.update({
        where: { id: attendance.id },
        data: {
          isPresent,
          isLate,
          status: isPresent ? "APPROVED" : "TO_JUSTIFY",
        },
        include: {
          learner: {
            include: { referential: true },
          },
        },
      });
    }

    const existingAttendance = await this.prisma.learnerAttendance.findUnique({
      where: { id },
      select: { date: true },
    });

    if (!existingAttendance) {
      throw new NotFoundException("Attendance record not found");
    }

    this.assertNotFutureAttendanceDate(existingAttendance.date);

    return this.prisma.learnerAttendance.update({
      where: { id },
      data: {
        isPresent,
        isLate,
        status: isPresent ? "APPROVED" : "TO_JUSTIFY",
      },
      include: {
        learner: {
          include: { referential: true },
        },
      },
    });
  }
}
