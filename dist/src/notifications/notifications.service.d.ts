import { PrismaService } from '../prisma/prisma.service';
import { Server } from 'socket.io';
export declare class NotificationsService {
    private prisma;
    server: Server;
    constructor(prisma: PrismaService);
    createJustificationNotification(attendanceId: string, learnerId: string, message: string): Promise<any[]>;
    markAsRead(notificationId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.NotificationType;
        message: string;
        read: boolean;
        receiverId: string;
        senderId: string | null;
        attendanceId: string | null;
    }>;
    getUnreadNotifications(userId: string): Promise<({
        sender: {
            id: string;
            email: string;
            password: string;
            role: import(".prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.NotificationType;
        message: string;
        read: boolean;
        receiverId: string;
        senderId: string | null;
        attendanceId: string | null;
    })[]>;
}
