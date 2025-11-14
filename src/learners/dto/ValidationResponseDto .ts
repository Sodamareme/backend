// Erreur de validation détaillée
export class ValidationErrorDto {
  field: string;
  message: string;
  value?: any;
  line?: number;
}

// Réponse de validation globale
export class ValidationResponseDto {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows?: number;
  errors?: string[];
  validationErrors?: ValidationErrorDto[];
}