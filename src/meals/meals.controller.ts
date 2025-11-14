import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('meals')
@Controller('meals')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @ApiBearerAuth()
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post('scan/:learnerId/:type')
  @Roles(UserRole.RESTAURATEUR)
  @ApiOperation({ summary: 'Scanner un repas pour un apprenant' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Repas scanné' })
  async scanMeal(
    @Param('learnerId') learnerId: string,
    @Param('type') type: string,
  ) {
    return this.mealsService.scanMeal(learnerId, type);
  }

  @Get('stats/daily')
  @Roles(UserRole.ADMIN, UserRole.RESTAURATEUR)
  @ApiOperation({ summary: 'Obtenir les statistiques journalières des repas' })
  async getDailyStats() {
    return this.mealsService.getDailyStats();
  }

  @Get('stats/monthly')
  @Roles(UserRole.ADMIN, UserRole.RESTAURATEUR)
  @ApiOperation({ summary: 'Obtenir les statistiques mensuelles des repas' })
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.mealsService.getMonthlyStats(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('learner/:learnerId')
  @Roles(UserRole.ADMIN, UserRole.RESTAURATEUR)
  @ApiOperation({ summary: 'Obtenir l\'historique des repas d\'un apprenant' })
  async getLearnerMealHistory(@Param('learnerId') learnerId: string) {
    return this.mealsService.getLearnerMealHistory(learnerId);
  }

  @Get('scans/latest')
  // @Roles(UserRole.RESTAURATEUR)
  @ApiOperation({ summary: 'Obtenir les derniers scans de repas' })
  async getLatestScans() {
    return this.mealsService.getLatestScans();
  }
}