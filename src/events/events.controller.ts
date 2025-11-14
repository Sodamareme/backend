import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer un nouvel événement' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Événement créé' })
  async create(@Body() data: any) {
    return this.eventsService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les événements' })
  async findAll() {
    return this.eventsService.findAll();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Récupérer les événements à venir' })
  async getUpcomingEvents() {
    return this.eventsService.getUpcomingEvents();
  }

  @Get('promotion/:promotionId')
  @ApiOperation({ summary: 'Récupérer les événements par promotion' })
  async getEventsByPromotion(@Param('promotionId') promotionId: string) {
    return this.eventsService.getEventsByPromotion(promotionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un événement par ID' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un événement' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.eventsService.update(id, data);
  }
}