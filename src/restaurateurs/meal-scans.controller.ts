import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { MealScansService } from './meal-scans.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('meal-scans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MealScansController {
  constructor(private readonly mealScansService: MealScansService) {}

  // Scan repas par restaurateur
  @Post()
  @Roles('RESTAURATEUR')
  create(@Body() dto: CreateMealScanDto,@Body() restaurantId: string) {
    return this.mealScansService.create(dto,restaurantId);
  }

  // Voir tous les scans du jour
  @Get('today')
  @Roles('ADMIN', 'RESTAURATEUR')
  findToday() {
    return this.mealScansService.findToday();
  }

  // Voir tous les repas d’un apprenant
  @Get('learner/:learnerId')
  @Roles('ADMIN', 'RESTAURATEUR')
  findByLearner(@Param('learnerId') learnerId: string) {
    return this.mealScansService.findByLearner(learnerId);
  }

  @Get('learner/matricule/:learnerMatricule')
  @Roles('ADMIN', 'RESTAURATEUR')
  findByLearnerMatricule(@Param('learnerMatricule') learnerId: string) {
    return this.mealScansService.findByMatricule(learnerId);
  }
}
