"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
class AuthUtils {
    static generatePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(password, salt);
    }
    static async sendPasswordEmail(email, password, role) {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Vos identifiants de connexion - ODC Inside',
            html: `
        <h1>Bienvenue sur ODC Inside</h1>
        <p>Voici vos identifiants de connexion en tant que ${role}:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mot de passe:</strong> ${password}</p>
        <p>Nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
      `
        };
        await AuthUtils.transporter.sendMail(mailOptions);
    }
}
exports.AuthUtils = AuthUtils;
AuthUtils.transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
//# sourceMappingURL=auth.utils.js.map