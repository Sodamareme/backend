import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
@Injectable()
export class NotificationsService {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  async createJustificationNotification(
    attendanceId: string,
    learnerId: string,
    message: string
  ) {
    // Get the learner's referential coach and admin users
    const learner = await this.prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        referential: {
          include: {
            coaches: {
              include: { user: true }
            }
          }
        }
      }
    });

    // Get all admin users
    const adminUsers = await this.prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    // Create notifications for coaches and admins
    const notifications = [];

    // For coaches
    for (const coach of learner.referential.coaches) {
      const notification = await this.prisma.notification.create({
        data: {
          type: 'JUSTIFICATION_SUBMITTED',
          message,
          receiverId: coach.user.id,
          senderId: learner.userId,
          attendanceId
        },
        include: {
          sender: true,
          receiver: true
        }
      });
      notifications.push(notification);

      // Emit WebSocket event to coach
      this.server.to(coach.user.id).emit('newNotification', notification);
    }

    // For admins
    for (const admin of adminUsers) {
      const notification = await this.prisma.notification.create({
        data: {
          type: 'JUSTIFICATION_SUBMITTED',
          message,
          receiverId: admin.id,
          senderId: learner.userId,
          attendanceId
        },
        include: {
          sender: true,
          receiver: true
        }
      });
      notifications.push(notification);

      // Emit WebSocket event to admin
      this.server.to(admin.id).emit('newNotification', notification);
    }

    return notifications;
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: {
        id: notificationId,
        receiverId: userId
      },
      data: { read: true }
    });
  }

  async getUnreadNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        receiverId: userId,
        read: false
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true
      }
    });
  }
  
}