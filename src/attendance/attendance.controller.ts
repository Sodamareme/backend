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
  Patch
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

  // ❌ SURVEILLANT n'a pas accès — réservé VIGIL uniquement
  @Post('scan')
  @Roles(UserRole.VIGIL)
  @ApiOperation({ summary: 'Scan QR code for attendance' })
  @ApiResponse({ status: 200, description: 'Successfully scanned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already scanned today' })
  async scan(
    @Body('matricule') matricule: string
  ): Promise<LearnerScanResponse | CoachScanResponse> {
    return this.attendanceService.scan(matricule);
  }

  // ❌ SURVEILLANT n'a pas accès — réservé VIGIL uniquement
  @Post('scan/learner')
  @Roles(UserRole.VIGIL)
  @ApiOperation({ summary: 'Scan a learner attendance' })
  async scanLearner(@Body() body: { matricule: string }) {
    return this.attendanceService.scanLearner(body.matricule);
  }

  // ❌ SURVEILLANT n'a pas accès — réservé VIGIL uniquement
  @Post('scan/coach')
  @Roles(UserRole.VIGIL)
  @ApiOperation({ summary: 'Scan a coach attendance' })
  async scanCoach(@Body() body: { matricule: string }) {
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
    return this.attendanceService.submitAbsenceJustification(id, justification, documentUrl);
  }

  @Put('absence/:id/status')
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

  @Put('absence/:id/force-approve')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @ApiOperation({ summary: 'Forcer l\'autorisation d\'une absence sans justificatif' })
  async forceApprove(@Param('id') id: string) {
    return this.attendanceService.forceApprove(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'present' | 'late' | 'absent' }
  ) {
    return this.attendanceService.updateAttendanceStatus(id, body.status);
  }

  // ✅ SURVEILLANT a accès — lecture de l'historique des scans
  @Get('scans/latest')
  @Roles(UserRole.VIGIL, UserRole.ADMIN, UserRole.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer les derniers scans' })
  async getLatestScans() {
    return this.attendanceService.getLatestScans();
  }

  // ✅ SURVEILLANT a accès — lecture des absents
  @Get('absents/:referentialId')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  async getAbsentsByReferential(
    @Param('referentialId') referentialId: string,
    @Query('date') date: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.attendanceService.getAbsentsByReferential(targetDate, referentialId);
  }

  // ✅ SURVEILLANT a accès — lecture des stats journalières
  @Get('stats/daily')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  async getDailyStats(
    @Query('date') date: string,
    @Query('referentialId') referentialId?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.attendanceService.getDailyStats(targetDate, referentialId);
  }

  // ✅ SURVEILLANT a accès — lecture des stats mensuelles
  @Get('stats/monthly')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  @ApiOperation({ summary: 'Get monthly attendance statistics' })
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyStats> {
    return this.attendanceService.getMonthlyStats(parseInt(year, 10), parseInt(month, 10));
  }

  // ✅ SURVEILLANT a accès — lecture des stats annuelles
  @Get('stats/yearly')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  async getYearlyStats(@Query('year') year: string) {
    return this.attendanceService.getYearlyStats(parseInt(year, 10));
  }

  // ✅ SURVEILLANT a accès — lecture des stats hebdomadaires
  @Get('stats/weekly')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  @ApiOperation({ summary: 'Get weekly attendance statistics for a year' })
  async getWeeklyStats(@Query('year') year: string) {
    return this.attendanceService.getWeeklyStats(parseInt(year, 10));
  }

  // ❌ SURVEILLANT n'a pas accès — action ADMIN uniquement
  @Post('mark-absences')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger absence marking' })
  async manualMarkAbsences() {
    this.logger.log('Manually triggering markAbsentees');
    return this.attendanceService.markAbsentees();
  }

  // ✅ SURVEILLANT a accès — lecture des présences par promotion
  @Get('promotion/:promotionId')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.SURVEILLANT)
  @ApiOperation({ summary: 'Get promotion attendance stats between dates' })
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