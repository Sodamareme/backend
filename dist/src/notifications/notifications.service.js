"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJustificationNotification(attendanceId, learnerId, message) {
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
        const adminUsers = await this.prisma.user.findMany({
            where: { role: 'ADMIN' }
        });
        const notifications = [];
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
            this.server.to(coach.user.id).emit('newNotification', notification);
        }
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
            this.server.to(admin.id).emit('newNotification', notification);
        }
        return notifications;
    }
    async markAsRead(notificationId, userId) {
        return this.prisma.notification.update({
            where: {
                id: notificationId,
                receiverId: userId
            },
            data: { read: true }
        });
    }
    async getUnreadNotifications(userId) {
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
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsService.prototype, "server", void 0);
exports.NotificationsService = NotificationsService = __decorate([
    (0, websockets_1.WebSocketGateway)(),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map