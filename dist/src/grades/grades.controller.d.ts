import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
export declare class GradesController {
    private readonly gradesService;
    private readonly logger;
    constructor(gradesService: GradesService);
    create(createGradeDto: CreateGradeDto): Promise<{
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
            refId: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
        };
        module: {
            id: string;
            name: string;
            refId: string;
            startDate: Date;
            endDate: Date;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    }>;
    findAll(): Promise<({
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
        };
        module: {
            id: string;
            name: string;
            startDate: Date;
            endDate: Date;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    })[]>;
    getGradesByLearner(learnerId: string): Promise<({
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
        };
        module: {
            id: string;
            name: string;
            startDate: Date;
            endDate: Date;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    })[]>;
    getGradesByModule(moduleId: string): Promise<({
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
            refId: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
        };
        module: {
            id: string;
            name: string;
            photoUrl: string;
            refId: string;
            startDate: Date;
            endDate: Date;
            description: string;
            coachId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    })[]>;
    findOne(id: string): Promise<{
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
        };
        module: {
            id: string;
            name: string;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    }>;
    update(id: string, updateGradeDto: UpdateGradeDto): Promise<{
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
        };
        module: {
            id: string;
            name: string;
            description: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        learnerId: string;
        value: number;
        comment: string | null;
        moduleId: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
