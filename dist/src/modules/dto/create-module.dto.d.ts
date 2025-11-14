export declare class CreateModuleDto {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    coachId: string;
    refId: string;
    photoFile?: Express.Multer.File;
}
