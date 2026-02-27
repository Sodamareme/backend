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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const config_1 = require("@nestjs/config");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        const apiKey = this.configService.get('SENDGRID_API_KEY');
        if (apiKey) {
            this.transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                auth: {
                    user: 'apikey',
                    pass: apiKey,
                },
            });
        }
        else {
            this.transporter = nodemailer.createTransport({
                host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
                port: this.configService.get('SMTP_PORT', 587),
                secure: false,
                auth: {
                    user: this.configService.get('SMTP_USER'),
                    pass: this.configService.get('SMTP_PASS'),
                },
            });
        }
    }
    async sendCoachCredentials(email, firstName, lastName, password, matricule) {
        try {
            const mailOptions = {
                from: `"Sonatel Academy" <${this.configService.get('SMTP_USER')}>`,
                to: email,
                subject: '🎓 Bienvenue à Sonatel Academy - Vos identifiants de connexion',
                html: this.getCoachWelcomeEmailTemplate(firstName, lastName, email, password, matricule),
            };
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Credentials email sent successfully to ${email}`);
        }
        catch (error) {
            this.logger.error(`Failed to send credentials email to ${email}:`, error);
            throw error;
        }
    }
    getCoachWelcomeEmailTemplate(firstName, lastName, email, password, matricule) {
        return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue à Sonatel Academy</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header avec gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                      🎓 Bienvenue à Sonatel Academy
                    </h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                      Plateforme de gestion des formations
                    </p>
                  </td>
                </tr>

                <!-- Contenu principal -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">
                      Bonjour ${firstName} ${lastName},
                    </h2>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Félicitations ! Votre compte coach a été créé avec succès sur la plateforme Sonatel Academy. 
                      Vous pouvez dès maintenant accéder à votre espace personnel.
                    </p>

                    <!-- Carte d'informations -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #FF6B35; padding: 20px; margin: 30px 0; border-radius: 5px;">
                      <h3 style="color: #FF6B35; margin: 0 0 15px 0; font-size: 18px;">
                        📋 Vos informations de connexion
                      </h3>
                      
                      <table width="100%" cellpadding="8" cellspacing="0">
                        <tr>
                          <td style="color: #666666; font-weight: bold; width: 140px;">Matricule:</td>
                          <td style="color: #333333; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px; border-radius: 4px;">
                            ${matricule}
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #666666; font-weight: bold;">Email:</td>
                          <td style="color: #333333; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px; border-radius: 4px;">
                            ${email}
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #666666; font-weight: bold;">Mot de passe:</td>
                          <td style="color: #FF6B35; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px; border-radius: 4px; font-weight: bold;">
                            ${password}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Alerte sécurité -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>⚠️ Important :</strong> Pour votre sécurité, nous vous recommandons fortement de changer ce mot de passe 
                        lors de votre première connexion.
                      </p>
                    </div>

                    <!-- Bouton CTA -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${this.configService.get('FRONTEND_URL', 'https://gestionecoleodc.com')}" 
                         style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%); 
                                color: #ffffff; text-decoration: none; padding: 15px 40px; 
                                border-radius: 25px; font-size: 16px; font-weight: bold;
                                box-shadow: 0 4px 6px rgba(255, 107, 53, 0.3);">
                        Se connecter maintenant →
                      </a>
                    </div>

                    <!-- Instructions supplémentaires -->
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
                      <h4 style="color: #333333; margin: 0 0 15px 0; font-size: 16px;">
                        📌 Prochaines étapes :
                      </h4>
                      <ol style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Connectez-vous avec vos identifiants</li>
                        <li>Complétez votre profil</li>
                        <li>Changez votre mot de passe</li>
                        <li>Explorez la plateforme</li>
                      </ol>
                    </div>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                      Si vous rencontrez des difficultés pour vous connecter ou si vous avez des questions, 
                      n'hésitez pas à contacter notre équipe support.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                      © ${new Date().getFullYear()} Sonatel Academy. Tous droits réservés.
                    </p>
                    <p style="color: #999999; font-size: 12px; margin: 0;">
                      Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    }
    async testConnection() {
        try {
            await this.transporter.verify();
            this.logger.log('SMTP connection verified successfully');
            return true;
        }
        catch (error) {
            this.logger.error('SMTP connection failed:', error);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map