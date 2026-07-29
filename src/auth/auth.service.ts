// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger,NotFoundException  } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../email/email.service';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: LoginDto) {
    const normalizedEmail = user.email.trim().toLowerCase();
    
    const emailExist = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!emailExist) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(user.password, emailExist.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const token = this.jwtService.sign({ 
      email: normalizedEmail, 
      sub: emailExist.id,
      userId: emailExist.id,
      role: emailExist.role 
    });

    return {
      access_token: token,
      user: {
        id: emailExist.id,
        email: emailExist.email,
        role: emailExist.role,
      },
    };
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Les nouveaux mots de passe ne correspondent pas');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    const passwordValidation = this.validatePasswordStrength(changePasswordDto.newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(' '));
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Mot de passe modifié avec succès'
    };
  }

  /**
   * Vérifier la force du mot de passe
   */
  validatePasswordStrength(password: string): { 
    isValid: boolean; 
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // Vérifications
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    // Calculer la force
    if (errors.length === 0) {
      strength = 'strong';
    } else if (errors.length <= 2) {
      strength = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }
   /**
   * Demander la réinitialisation du mot de passe
   */
async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return {
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation'
      };
    }

    const resetToken = this.jwtService.sign(
      { 
        userId: user.id,
        email: user.email,
        type: 'password-reset'
      },
      { expiresIn: '1h' }
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      this.logger.error('Password reset email sending failed');
      throw new BadRequestException('Erreur lors de l\'envoi de l\'email');
    }

    return {
      success: true,
      message: 'Un email de réinitialisation vous a été envoyé',
      ...(process.env.NODE_ENV === 'development' && { token: resetToken })
    };
  }


  /**
   * Réinitialiser le mot de passe avec le token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const passwordValidation = this.validatePasswordStrength(resetPasswordDto.newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(' '));
    }

    let decoded: any;
    try {
      decoded = this.jwtService.verify(resetPasswordDto.token);
    } catch (error) {
      throw new UnauthorizedException('Le lien de réinitialisation est invalide ou expiré');
    }

    if (decoded.type !== 'password-reset') {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    try {
      await this.emailService.sendPasswordResetConfirmation(user.email);
    } catch (error) {
      this.logger.error('Password reset confirmation email failed');
    }

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès'
    };
  }

}
