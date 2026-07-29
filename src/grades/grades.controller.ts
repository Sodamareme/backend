// grades.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('grades')
@Controller('grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COACH)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new grade' })
  async create(@Body() createGradeDto: CreateGradeDto) {
    return this.gradesService.create(createGradeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all grades' })
  async findAll() {
    return this.gradesService.findAll();
  }

  @Get('learner/:learnerId')
  @ApiOperation({ summary: 'Get all grades for a specific learner' })
  @ApiParam({ name: 'learnerId', description: 'Learner ID (UUID format)' })
  async getGradesByLearner(
    @Param('learnerId', ParseUUIDPipe) learnerId: string,
  ) {
    return this.gradesService.getGradesByLearner(learnerId);
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Get all grades for a specific module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID (UUID format)' })
  async getGradesByModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.gradesService.getGradesByModule(moduleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a grade by ID' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    return this.gradesService.update(id, updateGradeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID (UUID format)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.remove(id);
  }
}
