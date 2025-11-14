// grades.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// ❌ SUPPRIMER CETTE LIGNE si vous ne l'utilisez pas
// import { UserRole } from '@prisma/client';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@ApiTags('grades')
@Controller('grades')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GradesController {
  private readonly logger = new Logger(GradesController.name);

  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new grade' })
  async create(@Body() createGradeDto: CreateGradeDto) {
    console.log('\n========================================');
    console.log('🎯 POST /grades ENDPOINT HIT');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📦 Body received:', JSON.stringify(createGradeDto, null, 2));
    console.log('========================================\n');

    try {
      const result = await this.gradesService.create(createGradeDto);
      console.log('✅ Grade created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('❌ Error in create grade:', error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all grades' })
  async findAll() {
    this.logger.log('Fetching all grades');
    const result = await this.gradesService.findAll();
    this.logger.log(`Found ${result.length} grades`);
    return result;
  }

  @Get('learner/:learnerId')
  @ApiOperation({ summary: 'Get all grades for a specific learner' })
  @ApiParam({ name: 'learnerId', description: 'Learner ID (UUID format)' })
  async getGradesByLearner(@Param('learnerId') learnerId: string) {
    this.logger.log(`Fetching grades for learner: ${learnerId}`);
    return this.gradesService.getGradesByLearner(learnerId);
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Get all grades for a specific module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID (UUID format)' })
  async getGradesByModule(@Param('moduleId') moduleId: string) {
    this.logger.log(`Fetching grades for module: ${moduleId}`);
    return this.gradesService.getGradesByModule(moduleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a grade by ID' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching grade with ID: ${id}`);
    return this.gradesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async update(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    this.logger.log(`Updating grade with ID: ${id}`);
    return this.gradesService.update(id, updateGradeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting grade with ID: ${id}`);
    return this.gradesService.remove(id);
  }
}