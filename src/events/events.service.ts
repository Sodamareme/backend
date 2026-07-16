import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Event } from '@prisma/client';

export const EVENT_TYPE_HOLIDAY = 'HOLIDAY';
export const EVENT_TYPE_NO_CLASS = 'NO_CLASS';

export type EventBlockingScope = 'attendance' | 'meal';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private normalizeDay(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private getDayKey(date: Date): string {
    return this.normalizeDay(date).toISOString().split('T')[0];
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private getBlockingTypes(scope: EventBlockingScope) {
    return scope === 'meal'
      ? [EVENT_TYPE_HOLIDAY]
      : [EVENT_TYPE_HOLIDAY, EVENT_TYPE_NO_CLASS];
  }

  async getBlockingEventForPromotionDate(
    promotionId: string,
    date: Date,
    scope: EventBlockingScope,
  ): Promise<Event | null> {
    const dayStart = this.normalizeDay(date);
    const dayEnd = this.addDays(dayStart, 1);

    return this.prisma.event.findFirst({
      where: {
        promotionId,
        type: {
          in: this.getBlockingTypes(scope),
        },
        startDate: {
          lt: dayEnd,
        },
        endDate: {
          gte: dayStart,
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getBlockedDateKeysByPromotion(
    promotionIds: string[],
    startDate: Date,
    endDate: Date,
    scope: EventBlockingScope,
  ): Promise<Map<string, Set<string>>> {
    const blockedDates = new Map<string, Set<string>>();

    if (promotionIds.length === 0 || startDate > endDate) {
      return blockedDates;
    }

    const rangeStart = this.normalizeDay(startDate);
    const rangeEnd = this.normalizeDay(endDate);
    const events = await this.prisma.event.findMany({
      where: {
        promotionId: {
          in: promotionIds,
        },
        type: {
          in: this.getBlockingTypes(scope),
        },
        startDate: {
          lt: this.addDays(rangeEnd, 1),
        },
        endDate: {
          gte: rangeStart,
        },
      },
      select: {
        promotionId: true,
        startDate: true,
        endDate: true,
      },
    });

    for (const event of events) {
      const eventStart = this.normalizeDay(event.startDate);
      const eventEnd = this.normalizeDay(event.endDate);
      const effectiveStart =
        eventStart.getTime() > rangeStart.getTime() ? eventStart : rangeStart;
      const effectiveEnd =
        eventEnd.getTime() < rangeEnd.getTime() ? eventEnd : rangeEnd;

      if (effectiveStart.getTime() > effectiveEnd.getTime()) {
        continue;
      }

      const promotionBlockedDates =
        blockedDates.get(event.promotionId) ?? new Set<string>();

      for (
        let currentDate = new Date(effectiveStart);
        currentDate.getTime() <= effectiveEnd.getTime();
        currentDate = this.addDays(currentDate, 1)
      ) {
        promotionBlockedDates.add(this.getDayKey(currentDate));
      }

      blockedDates.set(event.promotionId, promotionBlockedDates);
    }

    return blockedDates;
  }

  async create(data: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    type: string;
    location?: string;
    promotionId: string;
  }): Promise<Event> {
    return this.prisma.event.create({
      data,
      include: {
        promotion: true,
      },
    });
  }

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      include: {
        promotion: true,
      },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        promotion: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    return event;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const event = await this.findOne(id);

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        promotion: true,
      },
    });
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.prisma.event.findMany({
      where: {
        startDate: {
          gte: now,
        },
      },
      include: {
        promotion: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async getEventsByPromotion(promotionId: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: {
        promotionId,
      },
      include: {
        promotion: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.event.delete({ where: { id } });
  }
}
