import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
export declare class CoachesController {
    private readonly coachesService;
    constructor(coachesService: CoachesService);
    private getUserId;
    getMyProfile(req: any): Promise<{
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
    getMyAttendance(req: any, startDate?: string, endDate?: string): Promise<{
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
    getMyAttendanceStats(req: any, month?: string, year?: string): Promise<{
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
    getMyTodayAttendance(req: any): Promise<{
        id: string;
        date: string;
        checkIn: string;
        checkOut: string;
        isPresent: boolean;
        isLate: boolean;
    }>;
    selfCheckIn(req: any): Promise<{
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
    create(createCoachDto: CreateCoachDto, photo?: Express.Multer.File): Promise<{
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
            description: string | null;
            startDate: Date;
            endDate: Date;
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
    getAttendanceHistory(coachId: string, startDate?: string, endDate?: string): Promise<{
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
    update(id: string, updateCoachDto: UpdateCoachDto, photo?: Express.Multer.File): Promise<{
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
}
