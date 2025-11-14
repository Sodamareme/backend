declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
declare class TutorDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address: string;
}
export declare class CreatePendingLearnerDto {
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
    tutor: TutorDto;
    photoUrl?: any;
}
export {};
