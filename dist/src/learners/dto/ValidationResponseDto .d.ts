export declare class ValidationErrorDto {
    field: string;
    message: string;
    value?: any;
    line?: number;
}
export declare class ValidationResponseDto {
    isValid: boolean;
    totalRows: number;
    validRows: number;
    invalidRows?: number;
    errors?: string[];
    validationErrors?: ValidationErrorDto[];
}
