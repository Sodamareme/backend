"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatriculeUtils = void 0;
class MatriculeUtils {
    static getReferentialInitials(referentialName) {
        if (!referentialName || referentialName.length === 0) {
            return 'XXX';
        }
        const initials = referentialName.substring(0, 3).toUpperCase();
        return initials.padEnd(3, 'X');
    }
    static async generateLearnerMatricule(prisma, firstName, lastName, referentialName) {
        const nameInitials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
        const refInitials = this.getReferentialInitials(referentialName);
        const year = new Date().getFullYear().toString().slice(-2);
        let isUnique = false;
        let matricule = '';
        let attempts = 0;
        while (!isUnique && attempts < 1000) {
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            matricule = `ODC-${nameInitials}${refInitials}${year}${random}`;
            const existing = await prisma.learner.findFirst({
                where: { matricule },
            });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }
        if (!isUnique) {
            throw new Error('Could not generate unique matricule');
        }
        return matricule;
    }
    static async generateCoachMatricule(prisma, firstName, lastName, referentialName) {
        const nameInitials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
        const refInitials = referentialName ? referentialName.charAt(0).toUpperCase() : 'X';
        const year = new Date().getFullYear().toString().slice(-2);
        let isUnique = false;
        let matricule = '';
        let attempts = 0;
        while (!isUnique && attempts < 1000) {
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            matricule = `ODC-C${nameInitials}${refInitials}${year}${random}`;
            const existing = await prisma.coach.findFirst({
                where: { matricule },
            });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }
        if (!isUnique) {
            throw new Error('Could not generate unique matricule');
        }
        return matricule;
    }
}
exports.MatriculeUtils = MatriculeUtils;
//# sourceMappingURL=matricule.utils.js.map