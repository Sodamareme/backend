import { PrismaService } from '../prisma/prisma.service';
import { Event } from '@prisma/client';
export declare class EventsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        title: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        location?: string;
        promotionId: string;
    }): Promise<Event>;
    findAll(): Promise<Event[]>;
    findOne(id: string): Promise<Event>;
    update(id: string, data: Partial<Event>): Promise<Event>;
    getUpcomingEvents(): Promise<Event[]>;
    getEventsByPromotion(promotionId: string): Promise<Event[]>;
    delete(id: string): Promise<void>;
}
