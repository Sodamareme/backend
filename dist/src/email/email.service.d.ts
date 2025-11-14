import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
    sendPasswordResetConfirmation(email: string): Promise<void>;
    sendPendingLearnerNotification(adminEmail: string, learnerData: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        promotionName?: string;
        referentialName?: string;
        pendingLearnerId: string;
    }): Promise<void>;
    sendLearnerApprovalEmail(email: string, password: string, learnerData: {
        firstName: string;
        lastName: string;
        matricule: string;
    }): Promise<void>;
    sendLearnerRejectionEmail(email: string, learnerData: {
        firstName: string;
        lastName: string;
    }, reason?: string): Promise<void>;
}
