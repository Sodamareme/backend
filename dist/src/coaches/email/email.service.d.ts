import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendCoachCredentials(email: string, firstName: string, lastName: string, password: string, matricule: string): Promise<void>;
    private getCoachWelcomeEmailTemplate;
    testConnection(): Promise<boolean>;
}
