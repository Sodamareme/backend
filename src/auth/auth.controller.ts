import { Controller, Post, UseGuards, Body, Put, Req, Logger, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { clearAuthCookie, setAuthCookie } from './auth-cookie.util';
import { Response } from 'express';
@ApiTags('auth') 
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  private getClientIp(req: any) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

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
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = this.getClientIp(req);
    this.authRateLimitService.consume(`login:${clientIp}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message:
        'Trop de tentatives de connexion. Veuillez reessayer dans quelques minutes.',
    });
    const result = await this.authService.login(loginDto);
    setAuthCookie(res, result.access_token, req);
    return result;
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
    this.logger.debug(`Change password requested for user ${userId}`);
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
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: any) {
    const clientIp = this.getClientIp(req);
    this.authRateLimitService.consume(`forgot-password:${clientIp}`, {
      limit: 3,
      windowMs: 15 * 60 * 1000,
      message:
        'Trop de demandes de reinitialisation. Veuillez reessayer plus tard.',
    });
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
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @Req() req: any) {
    const clientIp = this.getClientIp(req);
    this.authRateLimitService.consume(`reset-password:${clientIp}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message:
        'Trop de tentatives de reinitialisation. Veuillez reessayer plus tard.',
    });
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Fermer la session utilisateur' })
  @ApiResponse({ status: 200, description: 'Session fermee avec succes' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, req);
    return {
      success: true,
      message: 'Session fermee avec succes',
    };
  }
}
