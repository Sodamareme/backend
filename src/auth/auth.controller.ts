// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Request, Body, Put, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
@ApiTags('auth') 
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authentification utilisateur' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Connexion réussie',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid',
          email: 'coach@example.com',
          role: 'COACH'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le mot de passe de l\'utilisateur connecté' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe modifié avec succès',
    schema: {
      example: {
        success: true,
        message: 'Mot de passe modifié avec succès'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Les mots de passe ne correspondent pas' })
  @ApiResponse({ status: 401, description: 'Le mot de passe actuel est incorrect' })
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    console.log('🔐 Change password request for userId:', userId);
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('validate-password-strength')
  @ApiOperation({ summary: 'Valider la force d\'un mot de passe' })
  @ApiBody({ 
    schema: { 
      type: 'object',
      properties: {
        password: { type: 'string', example: 'MyP@ssw0rd123!' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation de la force du mot de passe',
    schema: {
      example: {
        isValid: true,
        errors: [],
        strength: 'strong'
      }
    }
  })
  async validatePasswordStrength(@Body('password') password: string) {
    return this.authService.validatePasswordStrength(password);
  }
   @Post('forgot-password')
  @ApiOperation({ summary: 'Demander la réinitialisation du mot de passe' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Email de réinitialisation envoyé',
    schema: {
      example: {
        success: true,
        message: 'Un email de réinitialisation vous a été envoyé'
      }
    }
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe réinitialisé avec succès',
    schema: {
      example: {
        success: true,
        message: 'Votre mot de passe a été réinitialisé avec succès'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Les mots de passe ne correspondent pas' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  }