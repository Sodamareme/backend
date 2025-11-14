import { PendingLearnersService } from '../../src/pending-learners/pending-learners.service';
import { CreatePendingLearnerDto } from './dto/create-pending-learner.dto';
export declare class PendingLearnersController {
    private readonly pendingLearnersService;
    constructor(pendingLearnersService: PendingLearnersService);
    createPendingLearner(dto: CreatePendingLearnerDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: string;
        gender: import(".prisma/client").$Enums.Gender;
        birthDate: Date;
        birthPlace: string;
        photoUrl: string | null;
        promotionId: string;
        refId: string;
        tutorData: import("@prisma/client/runtime/library").JsonValue;
        status: import(".prisma/client").$Enums.PendingStatus;
        rejectionReason: string | null;
        createdAt: Date;
        updatedAt: Date;
        reviewedAt: Date | null;
        reviewedBy: string | null;
    }>;
}
