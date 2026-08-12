import { Controller, Get, Put, Body, Param, UseGuards, NotFoundException, Request, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { normalizeEmail } from '../utils/email.utils';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertAdminOrOwner(req: any, email: string) {
    const currentEmail = normalizeEmail(req.user.email);
    const targetEmail = normalizeEmail(email);

    if (req.user.role !== UserRole.ADMIN && currentEmail !== targetEmail) {
      throw new ForbiddenException('You can only access your own data');
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Get('photo/:email')
  @ApiOperation({ summary: 'Get user photo URL by email' })
  async getUserPhoto(@Param('email') email: string, @Request() req) {
    const normalizedEmail = normalizeEmail(email);
    this.assertAdminOrOwner(req, normalizedEmail);
    return this.usersService.getUserPhotoByEmail(normalizedEmail);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email with details' })
  async getUserByEmail(@Param('email') email: string, @Request() req) {
    const normalizedEmail = normalizeEmail(email);
    this.assertAdminOrOwner(req, normalizedEmail);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException(`User with email ${normalizedEmail} not found`);
    }
    const details = await this.usersService.getUserDetailsByRole(user);
    const { password, ...safeUser } = user;
    return { ...safeUser, details };
  }
}
