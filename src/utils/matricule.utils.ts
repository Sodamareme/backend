import { PrismaClient } from '@prisma/client';

export class MatriculeUtils {
  /**
   * Génère les 3 premières lettres d'un nom de référentiel
   * Si le nom est plus court, complète avec 'X'
   */
  private static getReferentialInitials(referentialName?: string): string {
    if (!referentialName || referentialName.length === 0) {
      return 'XXX';
    }
    
    // Prendre les 3 premières lettres ou compléter avec 'X'
    const initials = referentialName.substring(0, 3).toUpperCase();
    return initials.padEnd(3, 'X');
  }

  static async generateLearnerMatricule(
    prisma: PrismaClient,
    firstName: string,
    lastName: string,
    referentialName?: string,
  ): Promise<string> {
    const nameInitials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
    const refInitials = this.getReferentialInitials(referentialName);
    const year = new Date().getFullYear().toString().slice(-2);
    
    let isUnique = false;
    let matricule = '';
    let attempts = 0;
    
    while (!isUnique && attempts < 1000) {
      // Generate random 3-digit number
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      matricule = `ODC-${nameInitials}${refInitials}${year}${random}`;
      
      // Check if matricule exists
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

  static async generateCoachMatricule(
    prisma: PrismaClient,
    firstName: string,
    lastName: string,
    referentialName?: string,
  ): Promise<string> {
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