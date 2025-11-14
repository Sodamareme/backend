export declare class AuthUtils {
    private static transporter;
    static generatePassword(): string;
    static hashPassword(password: string): Promise<string>;
    static sendPasswordEmail(email: string, password: string, role: string): Promise<void>;
}
