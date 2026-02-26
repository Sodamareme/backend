import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
export declare class CoachesController {
    private readonly coachesService;
    constructor(coachesService: CoachesService);
    private getUserId;
    getMyProfile(req: any): Promise<{
        referentials: {
            id: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
        qrCode: string | null;
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
        referentials: {
            id: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
        qrCode: string | null;
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
            referentials: string[];
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
        referentials: {
            id: string;
            name: string;
            description: string;
        }[];
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
        qrCode: string | null;
    }>;
    findOne(id: string): Promise<{
        referentials: {
            id: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        modules: {
            id: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            coachId: string;
            startDate: Date;
            endDate: Date;
            refId: string;
            sessionId: string | null;
        }[];
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
        qrCode: string | null;
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
        referentials: {
            id: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
        qrCode: string | null;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
