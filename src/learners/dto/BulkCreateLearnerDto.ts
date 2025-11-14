import { Gender, LearnerStatus } from '@prisma/client';

// DTO pour UN seul apprenant
export class BulkCreateLearnerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gender: Gender;
  birthDate: Date | string;
  birthPlace: string;
  promotionId: string;
  refId?: string;
  sessionId?: string;
  status?: LearnerStatus;
  tutorFirstName: string;
  tutorLastName: string;
  tutorPhone: string;
  tutorEmail?: string;
  tutorAddress: string;
}

// DTO pour un tableau d'apprenants
export class BulkCreateLearnersDto {
  learners: BulkCreateLearnerDto[];
}

// DTO pour le résultat d'import individuel
export class LearnerImportResultDto {
  success: boolean;
  email: string;
  firstName: string;
  lastName: string;
  learnerId?: string;
  matricule?: string;
  error?: string;
  warnings?: string[];
}