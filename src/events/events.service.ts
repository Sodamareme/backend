import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Event } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

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
    const event = await this.findOne(id);
    await this.prisma.event.delete({ where: { id } });
  }
  
}