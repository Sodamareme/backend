// src/coaches/coaches.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('coaches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  // ========== HELPER FUNCTION ==========
  private getUserId(req: any): string {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    
    if (!userId) {
      console.error('❌ No userId found in request. User object:', req.user);
      throw new BadRequestException('User ID not found in token');
    }
    
    console.log('✅ Extracted userId:', userId);
    return userId;
  }

  // ========== ROUTES POUR LE COACH CONNECTÉ ==========
  
  /**
   * Obtenir le profil du coach connecté
   * GET /coaches/me
   */
  @Get('me')
  @Roles('COACH')
  async getMyProfile(@Req() req) {
    const userId = this.getUserId(req);
    console.log('👤 GET /coaches/me - userId:', userId);
    
    const coach = await this.coachesService.findByUserId(userId);
    
    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    return coach;
  }

  /**
   * Obtenir l'historique de présence du coach connecté
   * GET /coaches/me/attendance
   */
  @Get('me/attendance')
  @Roles('COACH')
  async getMyAttendance(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = this.getUserId(req);
    console.log('📊 GET /coaches/me/attendance - userId:', userId);
    
    const coach = await this.coachesService.findByUserId(userId);
    
    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    console.log('✅ Coach found for attendance:', coach.id);

    // Dates par défaut : dernier mois
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());

    return this.coachesService.getCoachAttendanceHistory(coach.id, start, end);
  }

  /**
   * Obtenir les statistiques de présence du coach connecté
   * GET /coaches/me/attendance/stats
   */
  @Get('me/attendance/stats')
  @Roles('COACH')
  async getMyAttendanceStats(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    console.log('📈 GET /coaches/me/attendance/stats - userId:', userId);
    
    const coach = await this.coachesService.findByUserId(userId);
    
    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    console.log('📊 Fetching stats for:', { month: targetMonth, year: targetYear });

    return this.coachesService.getCoachAttendanceStats(coach.id, targetYear, targetMonth);
  }

  /**
   * Obtenir la présence d'aujourd'hui pour le coach connecté
   * GET /coaches/me/attendance/today
   */
  @Get('me/attendance/today')
  @Roles('COACH')
  async getMyTodayAttendance(@Req() req) {
    const userId = this.getUserId(req);
    console.log('📅 GET /coaches/me/attendance/today - userId:', userId);
    
    const coach = await this.coachesService.findByUserId(userId);
    
    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.coachesService.getTodayAttendanceForCoach(coach.id, today);
    
    if (!attendance) {
      console.log('ℹ️ No attendance found for today');
      return null;
    }

    return {
      id: attendance.id,
      date: attendance.date.toISOString(),
      checkIn: attendance.checkIn?.toISOString() || null,
      checkOut: attendance.checkOut?.toISOString() || null,
      isPresent: attendance.isPresent,
      isLate: attendance.isLate,
    };
  }

  /**
   * Auto-pointage pour le coach connecté
   * POST /coaches/me/self-checkin
   */
  @Post('me/self-checkin')
  @Roles('COACH')
  async selfCheckIn(@Req() req) {
    const userId = this.getUserId(req);
    console.log('➕ POST /coaches/me/self-checkin - userId:', userId);
    
    const coach = await this.coachesService.findByUserId(userId);
    
    if (!coach) {
      throw new NotFoundException('Coach non trouvé');
    }

    const qrData = JSON.stringify({
      matricule: coach.matricule,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.user.email,
      type: 'COACH'
    });

    return this.coachesService.scanAttendance(qrData);
  }

  // ========== ROUTES GÉNÉRALES ==========

  /**
   * GET ALL COACHES
   */
  @Get()
  @Roles('ADMIN','VIGIL')
  async findAll() {
    return await this.coachesService.findAll();
  }

  /**
   * GET TODAY'S ATTENDANCE (pour vigil/admin)
   */
  @Get('attendance/today')
  @Roles('ADMIN', 'VIGIL')
  async getTodayAttendance() {
    return await this.coachesService.getTodayAttendance();
  }

  /**
   * SCAN ATTENDANCE (POINTAGE/DEPOINTAGE)
   */
  @Post('scan-attendance')
  @Roles('ADMIN','VIGIL')
  @HttpCode(HttpStatus.OK)
  async scanAttendance(@Body('qrData') qrData: string) {
    if (!qrData) {
      throw new BadRequestException('QR Data manquant');
    }
    return await this.coachesService.scanAttendance(qrData);
  }

  /**
   * CREATE COACH
   */
  @Post()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo'))
  async create(
    @Body() createCoachDto: CreateCoachDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    photo?: Express.Multer.File,
  ) {
    return await this.coachesService.create(createCoachDto, photo);
  }

  /**
   * GET ONE COACH
   */
  @Get(':id')
  @Roles('ADMIN', 'COACH','VIGIL')
  async findOne(@Param('id') id: string) {
    return await this.coachesService.findOne(id);
  }

  /**
   * GET ATTENDANCE HISTORY (pour un coach spécifique)
   */
  @Get(':id/attendance')
  @Roles('ADMIN', 'VIGIL', 'COACH')
  async getAttendanceHistory(
    @Param('id') coachId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
    
    return await this.coachesService.getCoachAttendanceHistory(coachId, start, end);
  }

  /**
   * UPDATE COACH
   */
  @Put(':id')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo'))
  async update(
    @Param('id') id: string,
    @Body() updateCoachDto: UpdateCoachDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    photo?: Express.Multer.File,
  ) {
     console.log('=== UPDATE COACH DTO ===', JSON.stringify(updateCoachDto, null, 2));
    return await this.coachesService.update(id, updateCoachDto, photo);
  }

  /**
   * DELETE COACH
   */
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return await this.coachesService.remove(id);
  }
  
}