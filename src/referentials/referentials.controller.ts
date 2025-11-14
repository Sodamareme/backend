import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { ReferentialsService } from './referentials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateReferentialDto } from './dto/create-referential.dto';

@ApiTags('referentials')
@Controller('referentials')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @ApiBearerAuth()
export class ReferentialsController {
  private readonly logger = new Logger(ReferentialsController.name);

  constructor(
    private readonly referentialsService: ReferentialsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new referential' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Referential created' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photoUrl'))
  async create(
    @Body() formData: any,
    @UploadedFile() photoFile?: Express.Multer.File,
  ) {
    const { name, capacity, description, numberOfSessions, sessionLength } = formData;

    if (!name) {
      throw new BadRequestException('Name is required');
    }
    if (isNaN(capacity)) {
      throw new BadRequestException('Capacity must be a number');
    }
    if (isNaN(numberOfSessions)) {
      throw new BadRequestException('Number of sessions must be a number');
    }

    const createData: CreateReferentialDto = {
      name,
      description,
      capacity: parseInt(capacity, 10),
      numberOfSessions: parseInt(numberOfSessions, 10),
      sessionLength: sessionLength ? parseInt(sessionLength, 10) : undefined,
    };

    if (photoFile) {
      try {
        const uploadResult = await this.cloudinaryService.uploadFile(photoFile, 'referentials');
        createData.photoUrl = uploadResult.url;
      } catch (error) {
        this.logger.error(`Error uploading photo: ${error.message}`);
      }
    }

    // Validate session length if multiple sessions
    if (createData.numberOfSessions > 1 && !createData.sessionLength) {
      throw new BadRequestException('Session length is required when creating multiple sessions');
    }

    this.logger.log(`Creating referential with data: ${JSON.stringify(createData)}`);
    return this.referentialsService.create(createData);
  }

  @Post('assign-to-promotion')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign referentials to a promotion' })
  async assignToPromotion(
    @Body() data: { referentialIds: string[]; promotionId: string }
  ) {
    return this.referentialsService.assignToPromotion(
      data.referentialIds,
      data.promotionId
    );
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les référentiels' })
  async findAll() {
    return this.referentialsService.findAll();
  }

    @Get("all")
  @ApiOperation({ summary: 'Récupérer tous les référentiels' })
  async findAllReferentials() {
    return this.referentialsService.findAllReferentials();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un référentiel par ID' })
  async findOne(@Param('id') id: string) {
    return this.referentialsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Récupérer les statistiques d\'un référentiel' })
  async getStatistics(@Param('id') id: string) {
    return this.referentialsService.getStatistics(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un référentiel' })
  async update(@Param('id') id: string, @Body() data: Partial<CreateReferentialDto>) {
    // Ensure we have at least one valid field to update
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucune donnée fournie pour la mise à jour');
    }

    return this.referentialsService.update(id, data);
  }
}