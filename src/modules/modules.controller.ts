import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ModulesService } from './modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('modules')
@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @UseInterceptors(FileInterceptor('photoFile', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new module' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Module created successfully',
    type: CreateModuleDto
  })
  async create(
    @Body() createModuleDto: CreateModuleDto,
    @UploadedFile() photoFile?: Express.Multer.File,
  ) {
    return this.modulesService.create(createModuleDto, photoFile);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les modules' })
  async findAll(@Query('refId') refId?: string) {
    if (refId) {
      return this.modulesService.getModulesByReferential(refId);
    }

    return this.modulesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer les modules actifs' })
  async getActiveModules() {
    return this.modulesService.getActiveModules();
  }

  @Get('referential/:refId')
  @ApiOperation({ summary: 'Récupérer les modules par référentiel' })
  async getModulesByReferential(@Param('refId') refId: string) {
    return this.modulesService.getModulesByReferential(refId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un module par ID' })
  async findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  @Get(':id/grades')
  @ApiOperation({ summary: 'Get all grades for a specific module' })
  @ApiResponse({ status: 200, description: 'List of grades retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async getGradesByModule(@Param('id') id: string) {
    return this.modulesService.getGradesByModule(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @ApiOperation({ summary: 'Mettre à jour un module' })
  @ApiBody({ type: UpdateModuleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.modulesService.update(id, updateModuleDto);
  }

  @Post(':id/grades')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @ApiOperation({ summary: 'Ajouter une note à un module' })
  async addGrade(
    @Param('id') moduleId: string,
    @Body() data: { learnerId: string; value: number; comment?: string },
  ) {
    return this.modulesService.addGrade({
      moduleId,
      ...data,
    });
  }

  @Put(':moduleId/grades/:gradeId')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @ApiOperation({ summary: 'Mettre à jour une note' })
  async updateGrade(
    @Param('moduleId') moduleId: string,
    @Param('gradeId') gradeId: string,
    @Body() data: { value: number; comment?: string },
  ) {
    return this.modulesService.updateGrade(moduleId, gradeId, data);
  }
}
