import { PrismaClient } from '@prisma/client';
export declare class MatriculeUtils {
    private static getReferentialInitials;
    static generateLearnerMatricule(prisma: PrismaClient, firstName: string, lastName: string, referentialName?: string): Promise<string>;
    static generateCoachMatricule(prisma: PrismaClient, firstName: string, lastName: string, referentialName?: string): Promise<string>;
}
