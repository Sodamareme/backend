import { CreateModuleDto } from './create-module.dto';
declare const UpdateModuleDto_base: import("@nestjs/common").Type<Partial<Omit<CreateModuleDto, "photoFile">>>;
export declare class UpdateModuleDto extends UpdateModuleDto_base {
    photoUrl?: string | null;
    sessionId?: string | null;
}
export {};
