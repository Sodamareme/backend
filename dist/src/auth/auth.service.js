"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
const bcrypt = require("bcrypt");
const email_service_1 = require("../email/email.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, prisma, emailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.emailService = emailService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(user) {
        this.logger.log(`Login attempt for email: ${user.email}`);
        const emailExist = await this.prisma.user.findUnique({
            where: {
                email: user.email
            }
        });
        if (!emailExist) {
            throw new common_1.UnauthorizedException('Email ou mot de passe incorrect');
        }
        const passwordMatch = await bcrypt.compare(user.password, emailExist.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Email ou mot de passe incorrect');
        }
        const token = this.jwtService.sign({
            email: user.email,
            sub: emailExist.id,
            userId: emailExist.id,
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
    async changePassword(userId, changePasswordDto) {
        this.logger.log(`🔐 Password change request for userId: ${userId}`);
        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new common_1.BadRequestException('Les nouveaux mots de passe ne correspondent pas');
        }
        if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
            throw new common_1.BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur non trouvé');
        }
        const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.UnauthorizedException('Le mot de passe actuel est incorrect');
        }
        const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
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
    validatePasswordStrength(password) {
        const errors = [];
        let strength = 'weak';
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
        if (errors.length === 0) {
            strength = 'strong';
        }
        else if (errors.length <= 2) {
            strength = 'medium';
        }
        return {
            isValid: errors.length === 0,
            errors,
            strength
        };
    }
    async forgotPassword(forgotPasswordDto) {
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
        const resetToken = this.jwtService.sign({
            userId: user.id,
            email: user.email,
            type: 'password-reset'
        }, { expiresIn: '1h' });
        this.logger.log(`✅ Reset token generated for user: ${user.email}`);
        try {
            await this.emailService.sendPasswordResetEmail(user.email, resetToken);
            this.logger.log(`📧 Reset email sent to ${user.email}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send email:`, error);
            throw new common_1.BadRequestException('Erreur lors de l\'envoi de l\'email');
        }
        return {
            success: true,
            message: 'Un email de réinitialisation vous a été envoyé',
            ...(process.env.NODE_ENV === 'development' && { token: resetToken })
        };
    }
    async resetPassword(resetPasswordDto) {
        this.logger.log(`🔐 Password reset attempt with token`);
        if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
            throw new common_1.BadRequestException('Les mots de passe ne correspondent pas');
        }
        let decoded;
        try {
            decoded = this.jwtService.verify(resetPasswordDto.token);
        }
        catch (error) {
            this.logger.error(`❌ Invalid or expired token`);
            throw new common_1.UnauthorizedException('Le lien de réinitialisation est invalide ou expiré');
        }
        if (decoded.type !== 'password-reset') {
            throw new common_1.UnauthorizedException('Token invalide');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            throw new common_1.NotFoundException('Utilisateur non trouvé');
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
        }
        catch (error) {
            this.logger.error('Failed to send confirmation email:', error);
        }
        this.logger.log(`✅ Password reset successfully for user: ${user.email}`);
        return {
            success: true,
            message: 'Votre mot de passe a été réinitialisé avec succès'
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map