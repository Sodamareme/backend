import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  Patch,
  Query,
  ForbiddenException,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiConsumes, 
  ApiQuery 
} from '@nestjs/swagger';
import { LearnersService } from './learners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, LearnerStatus, Learner } from '@prisma/client';
import { ReplaceLearnerDto, UpdateStatusDto } from './dto/update-status.dto';
// Lignes 29-33
import { 
  BulkCreateLearnersDto, 
} from './dto/BulkCreateLearnerDto';
import { BulkImportResponseDto } from './dto/BulkImportResponseDto';
import { ValidationResponseDto } from './dto/ValidationResponseDto ';
import { Public } from '../auth/decorators/public.decorators';
import { CreateLearnerDto } from './dto/create-learner.dto';
import { CreateTutorDto } from './dto/create-learner.dto';
@ApiTags('learners')
@Controller('learners')
//  @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LearnersController {
  constructor(private readonly learnersService: LearnersService) {}

  @Post()
  // @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('photoFile'))
  @ApiOperation({ summary: 'Créer un nouvel apprenant' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Apprenant créé' })
  @ApiConsumes('multipart/form-data')
 // learners.controller.ts

@Post()
@UseInterceptors(FileInterceptor('photoFile'))
@ApiOperation({ summary: 'Créer un nouvel apprenant' })
@ApiResponse({ status: HttpStatus.CREATED, description: 'Apprenant créé' })
@ApiConsumes('multipart/form-data')
async create(
  @Body() data: any,
  @UploadedFile() photoFile?: Express.Multer.File,
) {
  console.log('=== BODY BRUT REÇU ===', JSON.stringify(data, null, 2));

  // Reconstruire l'objet tutor depuis toutes les notations possibles
  // (multipart envoie: "tutor[firstName]", "tutor.firstName", ou objet imbriqué)
  let tutor: any = {};

  if (data.tutor && typeof data.tutor === 'object' && data.tutor.firstName) {
    // Cas idéal : tutor est déjà un objet propre
    tutor = data.tutor;
  } else {
    // Cas multipart : les clés arrivent à plat
    tutor = {
      firstName:
        data['tutor[firstName]'] ||
        data['tutor.firstName'] ||
        data?.tutor?.firstName ||
        '',
      lastName:
        data['tutor[lastName]'] ||
        data['tutor.lastName'] ||
        data?.tutor?.lastName ||
        '',
      phone:
        data['tutor[phone]'] ||
        data['tutor.phone'] ||
        data?.tutor?.phone ||
        '',
      email:
        data['tutor[email]'] ||
        data['tutor.email'] ||
        data?.tutor?.email ||
        '',
      address:
        data['tutor[address]'] ||
        data['tutor.address'] ||
        data?.tutor?.address ||
        '',
    };
  }

  console.log('=== TUTOR RECONSTRUIT ===', tutor);

  // Valider que le tutor a les champs requis
  if (!tutor.firstName || !tutor.lastName || !tutor.phone) {
    throw new BadRequestException(
      'Les informations du tuteur sont incomplètes (firstName, lastName, phone requis)',
    );
  }

  // Construire le DTO propre
  const cleanDto: CreateLearnerDto = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    gender: data.gender,
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    promotionId: data.promotionId,
    refId: data.refId || undefined,
    sessionId: data.sessionId || undefined,
    status: data.status || undefined,
    tutor,
  };

  console.log('=== DTO PROPRE ENVOYÉ AU SERVICE ===', JSON.stringify(cleanDto, null, 2));

  return this.learnersService.create(cleanDto, photoFile);
}

  @Post('bulk-validate')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Valider un fichier CSV pour import en masse' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Validation du fichier terminée',
    type: ValidationResponseDto,   // ✅ renvoyer le DTO de validation
  })
  @ApiConsumes('multipart/form-data')
  async validateBulkImport(
    @UploadedFile() file: Express.Multer.File
  ): Promise<ValidationResponseDto> { 
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Le fichier doit être au format CSV');
    }

    try {
      const csvContent = file.buffer.toString('utf-8');
      return await this.learnersService.validateBulkCSV(csvContent);
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la validation: ${error.message}`);
    }
  }

  @Post('bulk-import')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importer des apprenants en masse depuis un fichier CSV' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Import en masse terminé',
    type: BulkImportResponseDto 
  })
  @ApiConsumes('multipart/form-data')
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('dryRun') dryRun?: string
  ): Promise<BulkImportResponseDto> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Le fichier doit être au format CSV');
    }

    try {
      const csvContent = file.buffer.toString('utf-8');
      const isDryRun = dryRun === 'true';
      return await this.learnersService.processBulkImport(csvContent, isDryRun);
    } catch (error) {
      throw new BadRequestException(`Erreur lors de l'import: ${error.message}`);
    }
  }

  @Post('bulk-create')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer des apprenants en masse depuis des données JSON' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Création en masse terminée',
    type: BulkImportResponseDto 
  })
  async bulkCreate(
    @Body() bulkCreateDto: BulkCreateLearnersDto
  ): Promise<BulkImportResponseDto> {
    return await this.learnersService.bulkCreateLearners(bulkCreateDto.learners);
  }

  @Get('csv-template')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Télécharger le template CSV pour import en masse' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template CSV' })
  async downloadCSVTemplate(@Request() req): Promise<any> {
    const csvTemplate = this.learnersService.generateCSVTemplate();
    req.res.setHeader('Content-Type', 'text/csv');
    req.res.setHeader('Content-Disposition', 'attachment; filename="template_import_apprenants.csv"');
    return csvTemplate;
  }
  
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les apprenants' })
  async findAll() {
    return this.learnersService.findAll();
  }

  @Post(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.APPRENANT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Télécharger un document pour un apprenant' })
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('name') name: string,
  ) {
    return this.learnersService.uploadDocument(id, file, type, name);
  }

  @Get('waiting-list')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get waiting list learners' })
  @ApiResponse({ status: 200, description: 'Returns list of waiting learners' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiQuery({ name: 'promotionId', required: false })
  async getWaitingList(
    @Query('promotionId') promotionId?: string
  ): Promise<Learner[]> {
    return this.learnersService.getWaitingList(promotionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un apprenant par ID' })
  async findOne(@Param('id') id: string) {
    return this.learnersService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un apprenant' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.learnersService.update(id, data);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un apprenant' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: LearnerStatus,
  ) {
    return this.learnersService.updateStatus(id, status);
  }

  @Put(':id/kit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le kit d\'un apprenant' })
  async updateKit(@Param('id') id: string, @Body() kitData: any) {
    return this.learnersService.updateKit(id, kitData);
  }

  @Get(':id/attendance-stats')
  @ApiOperation({ summary: 'Récupérer les statistiques de présence d\'un apprenant' })
  async getAttendanceStats(@Param('id') id: string) {
    return this.learnersService.getAttendanceStats(id);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Find a learner by email' })
  @ApiResponse({ status: 200, description: 'Returns the learner' })
  @ApiResponse({ status: 404, description: 'Learner not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only access own data' })
  async findByEmail(
    @Param('email') email: string,
    @Request() req
  ): Promise<Learner> {
    console.log('Hitting findByEmail endpoint with email:', email);
    if (req.user.role !== UserRole.ADMIN && req.user.email !== email) {
      throw new ForbiddenException('You can only access your own data');
    }
    return this.learnersService.findByEmail(email);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async patchUpdateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto
  ) {
    return this.learnersService.updateLearnerStatus(id, updateStatusDto);
  }

  @Post('replace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async replaceLearner(@Body() replacementDto: ReplaceLearnerDto) {
    return this.learnersService.replaceLearner(replacementDto);
  }

  @Get(':id/status-history')
  @UseGuards(JwtAuthGuard)
  async getStatusHistory(@Param('id') id: string) {
    return this.learnersService.getStatusHistory(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get learner documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Learner not found' })
  async getDocuments(@Param('id') id: string) {
    return this.learnersService.getDocuments(id);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'Get learner attendance history' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the learner\'s attendance records ordered by date' 
  })
  @ApiResponse({ status: 404, description: 'Learner not found' })
  async getAttendance(@Param('id') id: string) {
    return this.learnersService.getAttendanceByLearner(id);
  }
  // learners.controller.ts
  @Public()
  @Get('matricule/:identifier')
  @ApiOperation({ summary: 'Trouver un apprenant par matricule (public pour scanner QR)' })
  async findByMatricule(@Param('identifier') identifier: string) {
    return this.learnersService.findByMatricule(identifier);
  }


}
