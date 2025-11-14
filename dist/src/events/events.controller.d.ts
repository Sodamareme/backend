import { EventsService } from './events.service';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    create(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }[]>;
    getUpcomingEvents(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }[]>;
    getEventsByPromotion(promotionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        promotionId: string;
        description: string;
        startDate: Date;
        endDate: Date;
        type: string;
        title: string;
        location: string | null;
    }>;
}
