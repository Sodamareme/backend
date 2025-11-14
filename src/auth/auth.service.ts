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
    this.logger.log(`Login attempt for email: ${user.email}`);
    
    // Vérifier si l'email existe
    const emailExist = await this.prisma.user.findUnique({
      where: {
        email: user.email
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

    // Générer le token JWT
    const token = this.jwtService.sign({ 
      email: user.email, 
      sub: emailExist.id,
      userId: emailExist.id, // Ajouter userId pour cohérence
      role: emailExist.role 
    });
   
    this.logger.log(`✅ Login successful for user: ${emailExist.email}`);

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
    this.logger.log(`🔐 Password change request for userId: ${userId}`);

    // 1. Vérifier que les mots de passe correspondent
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Les nouveaux mots de passe ne correspondent pas');
    }

    // 2. Vérifier que le nouveau mot de passe est différent de l'ancien
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    // 3. Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // 4. Vérifier l'ancien mot de passe
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect');
    }

    // 5. Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // 6. Mettre à jour le mot de passe
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    this.logger.log(`✅ Password changed successfully for user: ${user.email}`);

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
    this.logger.log(`📧 Password reset request for email: ${forgotPasswordDto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email }
    });

    if (!user) {
      this.logger.warn(`❌ User not found for email: ${forgotPasswordDto.email}`);
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

    this.logger.log(`✅ Reset token generated for user: ${user.email}`);

    // ✅ ENVOYER L'EMAIL
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`📧 Reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email:`, error);
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
    this.logger.log(`🔐 Password reset attempt with token`);

    // Vérifier que les mots de passe correspondent
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    // Vérifier et décoder le token
    let decoded: any;
    try {
      decoded = this.jwtService.verify(resetPasswordDto.token);
    } catch (error) {
      this.logger.error(`❌ Invalid or expired token`);
      throw new UnauthorizedException('Le lien de réinitialisation est invalide ou expiré');
    }

    // Vérifier que c'est bien un token de réinitialisation
    if (decoded.type !== 'password-reset') {
      throw new UnauthorizedException('Token invalide');
    }

    // Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Mettre à jour le mot de passe
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // ✅ Envoyer email de confirmation
    try {
      await this.emailService.sendPasswordResetConfirmation(user.email);
    } catch (error) {
      this.logger.error('Failed to send confirmation email:', error);
    }

    this.logger.log(`✅ Password reset successfully for user: ${user.email}`);

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès'
    };
  }

}