import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurateursService } from './restaurateurs.service';
import { CreateRestaurateurDto } from './dto/create-restaurateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('restaurateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurateursController {
  constructor(private readonly restaurateursService: RestaurateursService) {}

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo'))
  create(@Body() createRestaurateurDto: CreateRestaurateurDto, @UploadedFile() photo?: Express.Multer.File) {
    return this.restaurateursService.create(createRestaurateurDto, photo);
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.restaurateursService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'RESTAURATEUR')
  findOne(@Param('id') id: string) {
    return this.restaurateursService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.restaurateursService.update(id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.restaurateursService.remove(id);
  }
}