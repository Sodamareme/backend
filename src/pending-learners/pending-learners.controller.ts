import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PendingLearnersService } from './pending-learners.service';
import { CreatePendingLearnerDto } from './dto/create-pending-learner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorators';
import { validateImageUpload } from '../common/image-upload.util';
import { normalizeEmail, normalizeEmailOrUndefined } from '../utils/email.utils';

@Controller('pending-learners')
export class PendingLearnersController {
  constructor(private readonly pendingLearnersService: PendingLearnersService) {}

  @Post()
  @Public()
  @UseInterceptors(FileInterceptor('photoFile'))
  async createPendingLearner(
    @Body() data: any,
    @UploadedFile() photoFile?: Express.Multer.File,
  ) {
    validateImageUpload(photoFile, {
      maxSizeBytes: 10 * 1024 * 1024,
      fieldLabel: 'La photo de l apprenant',
    });

    const tutor = data?.tutor && typeof data.tutor === 'object'
      ? data.tutor
      : {
          firstName: data?.['tutor[firstName]'],
          lastName: data?.['tutor[lastName]'],
          phone: data?.['tutor[phone]'],
          email: data?.['tutor[email]'],
          address: data?.['tutor[address]'],
        };

    const normalizedTutor = {
      ...tutor,
      email: normalizeEmailOrUndefined(tutor.email),
    };

    return this.pendingLearnersService.createPendingLearner(
      {
        ...data,
        email: normalizeEmail(data?.email),
        tutor: normalizedTutor,
      } as CreatePendingLearnerDto,
      photoFile,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingLearners(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.pendingLearnersService.getPendingLearners(status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingLearnerById(@Param('id') id: string) {
    return this.pendingLearnersService.getPendingLearnerById(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approvePendingLearner(@Param('id') id: string, @Req() req: any) {
    return this.pendingLearnersService.approvePendingLearner(id, req.user.userId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectPendingLearner(
    @Param('id') id: string,
    @Req() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.pendingLearnersService.rejectPendingLearner(id, req.user.userId, reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deletePendingLearner(@Param('id') id: string) {
    return this.pendingLearnersService.deletePendingLearner(id);
  }
}
