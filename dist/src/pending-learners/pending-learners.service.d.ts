import { PrismaService } from '../prisma/prisma.service';
import { CreatePendingLearnerDto } from '../pending-learners/dto/create-pending-learner.dto';
export declare class PendingLearnersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPendingLearner(dto: CreatePendingLearnerDto): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string;
        photoUrl: string | null;
        address: string;
        gender: import(".prisma/client").$Enums.Gender;
        birthDate: Date;
        birthPlace: string;
        status: import(".prisma/client").$Enums.PendingStatus;
        refId: string;
        promotionId: string;
        tutorData: import("@prisma/client/runtime/library").JsonValue;
        rejectionReason: string | null;
        reviewedAt: Date | null;
        reviewedBy: string | null;
    }>;
}
