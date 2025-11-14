import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { Controller, Get, Param, Patch, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnreadNotifications(@Request() req) {
    return this.notificationsService.getUnreadNotifications(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}