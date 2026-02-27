import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT')),
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    // Vérifier la connexion
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('❌ Email configuration error:', error);
      } else {
        this.logger.log('✅ Email server is ready to send messages');
      }
    });
  }

  /**
   * Envoyer l'email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://gestionecoleodc.com';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: {
        name: 'ODC Inside',
        address: this.configService.get('SMTP_USER'),
      },
      to: email,
      subject: '🔐 Réinitialisation de votre mot de passe - ODC Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 3px solid #f97316;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin: 0;
            }
            .content {
              padding: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(to right, #f97316, #dc2626);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(to right, #ea580c, #b91c1c);
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .link {
              color: #f97316;
              word-break: break-all;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://res.cloudinary.com/drxouwbms/image/upload/v1743507686/image_27_qtiin4.png" alt="ODC Inside" class="logo">
              <h1>🔐 Réinitialisation de mot de passe</h1>
            </div>
            
            <div class="content">
              <p>Bonjour,</p>
              
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>ODC Inside</strong>.</p>
              
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              
              <div class="warning">
                <strong>⏰ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong> uniquement.
              </div>
              
              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p class="link">${resetLink}</p>
              
              <p><strong>Vous n'avez pas demandé cette réinitialisation ?</strong></p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email. Votre mot de passe actuel reste inchangé.</p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par <strong>ODC Inside</strong></p>
              <p>© ${new Date().getFullYear()} Sonatel - Orange Digital Center. Tous droits réservés.</p>
              <p style="font-size: 12px; color: #9ca3af;">
                Ceci est un email automatique, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Réinitialisation de votre mot de passe - ODC Inside

Bonjour,

Vous avez demandé à réinitialiser votre mot de passe.

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetLink}

⏰ Ce lien est valide pendant 1 heure uniquement.

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.

---
ODC Inside - Orange Digital Center
© ${new Date().getFullYear()} Sonatel. Tous droits réservés.
      `,
    };
 try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password reset email sent to ${email}`);
      this.logger.log(`📧 Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un email de confirmation après réinitialisation
   */
  async sendPasswordResetConfirmation(email: string): Promise<void> {
    const mailOptions = {
      from: {
        name: 'ODC Inside',
        address: this.configService.get('SMTP_USER'),
      },
      to: email,
      subject: '✅ Votre mot de passe a été modifié - ODC Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 10px; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #10b981; }
            .success-icon { font-size: 48px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1 style="color: #10b981;">Mot de passe modifié avec succès</h1>
            </div>
            <p>Bonjour,</p>
            <p>Votre mot de passe <strong>ODC Inside</strong> a été modifié avec succès.</p>
            <p>Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement l'administrateur système.</p>
            <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe ODC Inside</strong></p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password reset confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send confirmation to ${email}:`, error);
    }
 }
   async sendPendingLearnerNotification(
    adminEmail: string,
    learnerData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      promotionName?: string;
      referentialName?: string;
      pendingLearnerId: string;
    }
  ): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://gestionecoleodc.com';
    const validationLink = `${frontendUrl}/admin/pending-learners?id=${learnerData.pendingLearnerId}`;

    const mailOptions = {
      from: {
        name: 'ODC Inside',
        address: this.configService.get('SMTP_USER'),
      },
      to: adminEmail,
      subject: '🔔 Nouvelle demande d\'inscription - ODC Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 3px solid #f97316;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin: 0;
            }
            .content {
              padding: 30px 0;
            }
            .info-box {
              background-color: #f3f4f6;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              color: #6b7280;
            }
            .info-value {
              color: #1f2937;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(to right, #10b981, #059669);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(to right, #059669, #047857);
            }
            .button-reject {
              background: linear-gradient(to right, #ef4444, #dc2626);
              margin-left: 10px;
            }
            .button-reject:hover {
              background: linear-gradient(to right, #dc2626, #b91c1c);
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://res.cloudinary.com/drxouwbms/image/upload/v1743507686/image_27_qtiin4.png" alt="ODC Inside" class="logo">
              <h1>🔔 Nouvelle demande d'inscription</h1>
            </div>
            
            <div class="content">
              <p>Bonjour Administrateur,</p>
              
              <p>Une nouvelle demande d'inscription a été soumise sur <strong>ODC Inside</strong>.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Informations de l'apprenant</h3>
                <div class="info-row">
                  <span class="info-label">Nom complet:</span>
                  <span class="info-value">${learnerData.firstName} ${learnerData.lastName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${learnerData.email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Téléphone:</span>
                  <span class="info-value">${learnerData.phone}</span>
                </div>
                ${learnerData.promotionName ? `
                <div class="info-row">
                  <span class="info-label">Promotion:</span>
                  <span class="info-value">${learnerData.promotionName}</span>
                </div>
                ` : ''}
                ${learnerData.referentialName ? `
                <div class="info-row">
                  <span class="info-label">Référentiel:</span>
                  <span class="info-value">${learnerData.referentialName}</span>
                </div>
                ` : ''}
              </div>
              
              <p><strong>Action requise:</strong> Veuillez valider ou rejeter cette demande d'inscription.</p>
              
              <div style="text-align: center;">
                <a href="${validationLink}" class="button">Examiner la demande</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Vous pouvez également accéder à la liste des demandes en attente depuis votre tableau de bord administrateur.
              </p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par <strong>ODC Inside</strong></p>
              <p>© ${new Date().getFullYear()} Sonatel - Orange Digital Center. Tous droits réservés.</p>
              <p style="font-size: 12px; color: #9ca3af;">
                Ceci est un email automatique, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nouvelle demande d'inscription - ODC Inside

Bonjour Administrateur,

Une nouvelle demande d'inscription a été soumise.

Informations de l'apprenant:
- Nom: ${learnerData.firstName} ${learnerData.lastName}
- Email: ${learnerData.email}
- Téléphone: ${learnerData.phone}
${learnerData.promotionName ? `- Promotion: ${learnerData.promotionName}` : ''}
${learnerData.referentialName ? `- Référentiel: ${learnerData.referentialName}` : ''}

Veuillez examiner cette demande: ${validationLink}

---
ODC Inside - Orange Digital Center
© ${new Date().getFullYear()} Sonatel. Tous droits réservés.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Pending learner notification sent to admin ${adminEmail}`);
      this.logger.log(`📧 Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send notification to ${adminEmail}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un email de confirmation à l'apprenant après validation
   */
  async sendLearnerApprovalEmail(
    email: string,
    password: string,
    learnerData: {
      firstName: string;
      lastName: string;
      matricule: string;
    }
  ): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://gestionecoleodc.com';
    const loginLink = `${frontendUrl}/login`;

    const mailOptions = {
      from: {
        name: 'ODC Inside',
        address: this.configService.get('SMTP_USER'),
      },
      to: email,
      subject: '🎉 Inscription validée - Bienvenue à ODC Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 3px solid #10b981;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 20px;
            }
            .success-icon {
              font-size: 64px;
              margin: 20px 0;
            }
            h1 {
              color: #10b981;
              font-size: 28px;
              margin: 10px 0;
            }
            .content {
              padding: 30px 0;
            }
            .credentials-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 12px;
              padding: 25px;
              margin: 25px 0;
              color: white;
            }
            .credential-item {
              background-color: rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
            }
            .credential-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.9;
              margin-bottom: 5px;
            }
            .credential-value {
              font-size: 18px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(to right, #10b981, #059669);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(to right, #059669, #047857);
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://res.cloudinary.com/drxouwbms/image/upload/v1743507686/image_27_qtiin4.png" alt="ODC Inside" class="logo">
              <div class="success-icon">🎉</div>
              <h1>Inscription validée !</h1>
            </div>
            
            <div class="content">
              <p>Bonjour <strong>${learnerData.firstName} ${learnerData.lastName}</strong>,</p>
              
              <p>Félicitations ! Votre demande d'inscription à <strong>ODC Inside</strong> a été validée par notre équipe administrative.</p>
              
              <p>Vous pouvez dès maintenant accéder à votre espace personnel avec vos identifiants ci-dessous :</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; text-align: center;">🔐 Vos identifiants de connexion</h3>
                
                <div class="credential-item">
                  <div class="credential-label">Matricule</div>
                  <div class="credential-value">${learnerData.matricule}</div>
                </div>
                
                <div class="credential-item">
                  <div class="credential-label">Email</div>
                  <div class="credential-value">${email}</div>
                </div>
                
                <div class="credential-item">
                  <div class="credential-label">Mot de passe</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important :</strong> Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe lors de votre première connexion.
              </div>
              
              <div style="text-align: center;">
                <a href="${loginLink}" class="button">Se connecter maintenant</a>
              </div>
              
              <p style="margin-top: 30px;">Si vous rencontrez des difficultés pour vous connecter, n'hésitez pas à contacter notre support technique.</p>
              
              <p><strong>Bienvenue dans la communauté ODC Inside ! 🚀</strong></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par <strong>ODC Inside</strong></p>
              <p>© ${new Date().getFullYear()} Sonatel - Orange Digital Center. Tous droits réservés.</p>
              <p style="font-size: 12px; color: #9ca3af;">
                Ceci est un email automatique, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Inscription validée - Bienvenue à ODC Inside

Bonjour ${learnerData.firstName} ${learnerData.lastName},

Félicitations ! Votre inscription a été validée.

Vos identifiants de connexion:
- Matricule: ${learnerData.matricule}
- Email: ${email}
- Mot de passe: ${password}

⚠️ Changez votre mot de passe lors de votre première connexion.

Connectez-vous ici: ${loginLink}

Bienvenue dans la communauté ODC Inside !

---
ODC Inside - Orange Digital Center
© ${new Date().getFullYear()} Sonatel. Tous droits réservés.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Approval email sent to ${email}`);
      this.logger.log(`📧 Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send approval email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un email de rejet à l'apprenant
   */
  async sendLearnerRejectionEmail(
    email: string,
    learnerData: {
      firstName: string;
      lastName: string;
    },
    reason?: string
  ): Promise<void> {
    const mailOptions = {
      from: {
        name: 'ODC Inside',
        address: this.configService.get('SMTP_USER'),
      },
      to: email,
      subject: 'Mise à jour de votre demande d\'inscription - ODC Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 10px; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #ef4444;">Demande d'inscription</h1>
            </div>
            <p>Bonjour <strong>${learnerData.firstName} ${learnerData.lastName}</strong>,</p>
            <p>Nous vous remercions pour votre intérêt envers ODC Inside.</p>
            <p>Malheureusement, nous ne pouvons pas donner suite à votre demande d'inscription pour le moment.</p>
            ${reason ? `<p><strong>Motif:</strong> ${reason}</p>` : ''}
            <p>N'hésitez pas à nous contacter si vous avez des questions ou si vous souhaitez soumettre une nouvelle demande ultérieurement.</p>
            <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe ODC Inside</strong></p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Rejection email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send rejection email to ${email}:`, error);
    }
  }
}