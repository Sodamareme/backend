import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Learner, LearnerStatus } from '@prisma/client';
import { CreateLearnerDto } from './dto/create-learner.dto';
import { ReplaceLearnerDto, UpdateStatusDto } from './dto/update-status.dto';
import { BulkCreateLearnerDto } from './dto/BulkCreateLearnerDto';
import { BulkImportResponseDto } from './dto/BulkImportResponseDto';
import { ValidationResponseDto } from './dto/ValidationResponseDto ';
import { EmailService } from '../email/email.service';
export declare class LearnersService {
    private prisma;
    private cloudinary;
    private emailService;
    private readonly logger;
    constructor(prisma: PrismaService, cloudinary: CloudinaryService, emailService: EmailService);
    validateBulkCSV(csvContent: string): Promise<ValidationResponseDto>;
    processBulkImport(csvContent: string, isDryRun?: boolean): Promise<BulkImportResponseDto>;
    bulkCreateLearners(learners: BulkCreateLearnerDto[]): Promise<BulkImportResponseDto>;
    private createSingleLearner;
    private validateLearnerData;
    private parseCSV;
    generateCSVTemplate(): string;
    private isValidEmail;
    private isValidDate;
    create(createLearnerDto: CreateLearnerDto, photoFile?: Express.Multer.File): Promise<Learner>;
    regenerateQrCode(learnerId: string): Promise<string>;
    findAll(): Promise<Learner[]>;
    findOne(id: string): Promise<Learner>;
    findByEmail(email: string): Promise<Learner>;
    findByMatricule(mat: string): Promise<Learner>;
    update(id: string, data: Partial<Learner>): Promise<Learner>;
    updateStatus(id: string, status: LearnerStatus): Promise<Learner>;
    updateKit(id: string, kitData: {
        laptop?: boolean;
        charger?: boolean;
        bag?: boolean;
        polo?: boolean;
    }): Promise<Learner>;
    uploadDocument(id: string, file: Express.Multer.File, type: string, name: string): Promise<{
        id: string;
        name: string;
        type: string;
        url: string;
        learnerId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAttendanceStats(id: string): Promise<{
        totalDays: number;
        presentDays: number;
        attendanceRate: number;
    }>;
    updateLearnerStatus(learnerId: string, updateStatusDto: UpdateStatusDto): Promise<Learner>;
    replaceLearner(replacementDto: ReplaceLearnerDto): Promise<{
        replacedLearner: Learner;
        replacementLearner: Learner;
    }>;
    getWaitingList(promotionId?: string): Promise<Learner[]>;
    getStatusHistory(learnerId: string): Promise<{
        id: string;
        learnerId: string;
        previousStatus: import(".prisma/client").$Enums.LearnerStatus | null;
        newStatus: import(".prisma/client").$Enums.LearnerStatus;
        reason: string | null;
        date: Date;
    }[]>;
    getDocuments(learnerId: string): Promise<{
        id: string;
        name: string;
        type: string;
        url: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getAttendanceByLearner(learnerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
            referential: {
                id: string;
                name: string;
            };
        };
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date;
        justification: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        documentUrl: string;
        justificationComment: string;
    }[]>;
}
