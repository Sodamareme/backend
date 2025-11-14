declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}
declare enum LearnerStatus {
    ACTIVE = "ACTIVE",
    WAITING = "WAITING"
}
declare class TutorDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address: string;
}
export declare class RegisterLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: string;
    birthPlace: string;
    promotionId: string;
    refId: string;
    status: LearnerStatus;
    tutor: TutorDto;
    photo?: any;
}
export {};
