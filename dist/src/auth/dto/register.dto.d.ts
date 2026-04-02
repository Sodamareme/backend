export declare class RegisterDto {
    email: string;
    password: string;
    enum: ['ADMIN', 'COACH', 'APPRENANT', 'VIGIL', 'RESTAURATEUR', 'SURVEILLANT'];
    role?: string;
}
