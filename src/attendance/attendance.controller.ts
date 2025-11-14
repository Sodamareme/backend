import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AbsenceStatus } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateAbsenceStatusDto } from './dto/update-absence-status.dto';
import { CoachScanResponse, LearnerScanResponse } from './interfaces/scan-response.interface';
import { MonthlyStats } from './interfaces/attendance-stats.interface';
import { DailyStats } from './interfaces/attendance-stats.interface';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan QR code for attendance' })
  @ApiResponse({ status: 200, description: 'Successfully scanned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already scanned today' })
  async scan(
    @Body('matricule') matricule: string
  ): Promise<LearnerScanResponse | CoachScanResponse> {
    return this.attendanceService.scan(matricule);
  }

  @Post('scan/learner')
  @Roles('VIGIL')
  @ApiOperation({ summary: 'Scan a learner attendance' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 404, description: 'Learner not found' })
  async scanLearner(
    @Body() body: { matricule: string }
  ) {
    return this.attendanceService.scanLearner(body.matricule);
  }

  @Post('scan/coach')
  @Roles('VIGIL')
  @ApiOperation({ summary: 'Scan a coach attendance' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  async scanCoach(
    @Body() body: { matricule: string }
  ) {
    return this.attendanceService.scanCoach(body.matricule);
  }

  @Post('absence/:id/justify')
  @Roles(UserRole.APPRENANT)
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({ summary: 'Soumettre une justification d\'absence' })
  @ApiConsumes('multipart/form-data')
  async submitJustification(
    @Param('id') id: string,
    @Body('justification') justification: string,
    @UploadedFile() document?: Express.Multer.File,
  ) {
    let documentUrl: string | undefined;
    
    if (document) {
      try {
        const uploadResult = await this.cloudinaryService.uploadFile(document, 'justifications');
        documentUrl = uploadResult.url;
      } catch (error) {
        this.logger.error(`Failed to upload justification document: ${error.message}`);
        throw new InternalServerErrorException('Failed to upload document');
      }
    }

    return this.attendanceService.submitAbsenceJustification(
      id,
      justification,
      documentUrl,
    );
  }

@Put('absence/:id/status')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COACH)
async updateAbsenceStatus(
  @Param('id') id: string,
  @Body() updateStatusDto: { status: AbsenceStatus; comment?: string }
) {
  return this.attendanceService.updateAbsenceStatus(
    id,
    updateStatusDto.status,
    updateStatusDto.comment
  );
}

  @Get('scans/latest')
  @Roles(UserRole.VIGIL)
  @ApiOperation({ summary: 'Récupérer les derniers scans' })
  async getLatestScans() {
    return this.attendanceService.getLatestScans();
  }


  // Dans attendance.controller.ts

@Get('absents/:referentialId')
async getAbsentsByReferential(
  @Param('referentialId') referentialId: string,
  @Query('date') date: string,
) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return this.attendanceService.getAbsentsByReferential(targetDate, referentialId);
}

@Get('stats/daily')
async getDailyStats(
  @Query('date') date: string,
  @Query('referentialId') referentialId?: string,
) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return this.attendanceService.getDailyStats(targetDate, referentialId);
}

  @Get('stats/monthly')
  @ApiOperation({ summary: 'Get monthly attendance statistics' })
  @ApiQuery({ name: 'year', description: 'Year (YYYY)', required: true })
  @ApiQuery({ name: 'month', description: 'Month (1-12)', required: true })
  @ApiResponse({ status: 200, description: 'Monthly attendance statistics' })
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyStats> {
    return this.attendanceService.getMonthlyStats(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('stats/yearly')
  async getYearlyStats(@Query('year') year: string) {
    return this.attendanceService.getYearlyStats(parseInt(year, 10));
  }

  @Get('stats/weekly')
  @ApiOperation({ summary: 'Get weekly attendance statistics for a year' })
  @ApiQuery({ name: 'year', description: 'Year (YYYY)', required: true })
  async getWeeklyStats(@Query('year') year: string) {
    return this.attendanceService.getWeeklyStats(parseInt(year, 10));
  }

  @Post('mark-absences')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger absence marking' })
  async manualMarkAbsences() {
    this.logger.log('Manually triggering markAbsentees');
    return this.attendanceService.markAbsentees();
  }

  @Get('promotion/:promotionId')
  @ApiOperation({ summary: 'Get promotion attendance stats between dates' })
  @ApiParam({ name: 'promotionId', description: 'ID of the promotion' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  async getPromotionAttendance(
    @Param('promotionId') promotionId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getPromotionAttendance(
      promotionId,
      new Date(startDate),
      new Date(endDate)
    );
  }
}