import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
  ParseFilePipe,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Promotion, PromotionStatus, UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { AddReferentialsDto } from './dto/add-referentials.dto';

@ApiTags('promotions')
@Controller('promotions')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PromotionsController {
  private readonly logger = new Logger(PromotionsController.name);

  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
        fileIsRequired: false,
      }),
    ) photo?: Express.Multer.File,
  ) {
    // Convert referentialIds string to array if it exists
    if (createPromotionDto.referentialIds && typeof createPromotionDto.referentialIds === 'string') {
      createPromotionDto.referentialIds = createPromotionDto.referentialIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
    }

    return this.promotionsService.create(createPromotionDto, photo);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les promotions' })
  async findAll() {
    return this.promotionsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer la promotion active' })
  async getActivePromotion() {
    return this.promotionsService.getActivePromotion();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une promotion par ID' })
  async findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Récupérer les statistiques d\'une promotion' })
  async getStatistics(@Param('id') id: string) {
    return this.promotionsService.getStatistics(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une promotion' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.promotionsService.update(id, data);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update promotion status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: { status: PromotionStatus }
  ): Promise<Promotion> {
    this.logger.debug(`Updating status for promotion ${id} to ${updateStatusDto.status}`);
    return this.promotionsService.update(id, { status: updateStatusDto.status });
  }

  @Post(':id/referentials')
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add referentials to a promotion' })
  @ApiResponse({ status: 200, description: 'Referentials added successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async addReferentials(
    @Param('id') id: string,
    @Body() dto: AddReferentialsDto
  ): Promise<Promotion> {
    this.logger.debug(`Adding referentials to promotion ${id}: ${dto.referentialIds?.join(', ') || 'none'}`);
    return this.promotionsService.addReferentials(id, dto.referentialIds);
  }
}