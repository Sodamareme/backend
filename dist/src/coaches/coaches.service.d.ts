import { PrismaService } from '../prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { EmailService } from './email/email.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
export declare class CoachesService {
    private prisma;
    private emailService;
    private cloudinary;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService, cloudinary: CloudinaryService);
    findAll(): Promise<({
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        referential: {
            id: string;
            name: string;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
        matricule: string;
        qrCode: string | null;
        refId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        referential: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            photoUrl: string | null;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        };
        modules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            photoUrl: string | null;
            refId: string;
            sessionId: string | null;
            startDate: Date;
            endDate: Date;
            description: string | null;
            coachId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
        matricule: string;
        qrCode: string | null;
        refId: string | null;
    }>;
    create(createCoachDto: CreateCoachDto, photoFile?: Express.Multer.File): Promise<{
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        referential: {
            id: string;
            name: string;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
        matricule: string;
        qrCode: string | null;
        refId: string | null;
    }>;
    update(id: string, updateCoachDto: UpdateCoachDto, photoFile?: Express.Multer.File): Promise<{
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        referential: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            photoUrl: string | null;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
        matricule: string;
        qrCode: string | null;
        refId: string | null;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    scanAttendance(qrData: string): Promise<{
        action: string;
        coach: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photoUrl: string;
        };
        isLate: boolean;
        message: string;
        time: string;
    }>;
    getTodayAttendance(): Promise<{
        id: string;
        date: Date;
        coach: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            referential: string;
        };
        checkIn: {
            time: Date;
            isLate: boolean;
        };
        checkOut: {
            time: Date;
        };
        isPresent: boolean;
        isLate: boolean;
    }[]>;
    getAttendanceHistory(coachId: string, startDate?: Date, endDate?: Date): Promise<({
        coach: {
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        coachId: string;
        isPresent: boolean;
        isLate: boolean;
        checkIn: Date | null;
        checkOut: Date | null;
    })[]>;
    findByUserId(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        referential: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
        matricule: string;
        qrCode: string | null;
        refId: string | null;
    }>;
    getCoachAttendanceHistory(coachId: string, startDate: Date, endDate: Date): Promise<{
        id: string;
        date: string;
        checkIn: {
            time: string;
            isLate: boolean;
        };
        checkOut: {
            time: string;
        };
        isPresent: boolean;
        isLate: boolean;
        duration: string;
    }[]>;
    getCoachAttendanceStats(coachId: string, year: number, month: number): Promise<{
        month: number;
        year: number;
        totalDays: number;
        presentDays: number;
        lateDays: number;
        completedDays: number;
        absentDays: number;
        attendanceRate: string;
        totalHoursWorked: string;
        averageHoursPerDay: string;
        attendances: {
            date: string;
            checkIn: string;
            checkOut: string;
            isLate: boolean;
            isPresent: boolean;
        }[];
    }>;
    getTodayAttendanceForCoach(coachId: string, today: Date): Promise<{
        id: string;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        checkIn: Date;
        checkOut: Date;
    }>;
    private generateMatricule;
    private generateRandomPassword;
    private calculateDuration;
}
