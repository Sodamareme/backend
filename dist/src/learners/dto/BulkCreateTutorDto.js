"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkImportResponseDto = exports.BulkImportSummaryDto = exports.LearnerImportResultDto = exports.ValidationErrorDto = exports.BulkCreateLearnersDto = exports.BulkCreateLearnerDto = exports.BulkCreateTutorDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class BulkCreateTutorDto {
}
exports.BulkCreateTutorDto = BulkCreateTutorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTutorDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTutorDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTutorDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Email address of the tutor' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkCreateTutorDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Address of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTutorDto.prototype, "address", void 0);
class BulkCreateLearnerDto {
}
exports.BulkCreateLearnerDto = BulkCreateLearnerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address of the learner' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Address of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.Gender, description: 'Gender of the learner' }),
    (0, class_validator_1.IsEnum)(client_1.Gender),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Birth date of the learner' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Birth place of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "birthPlace", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Promotion ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "promotionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Referential ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "refId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Session ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.LearnerStatus, description: 'Status of the learner' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.LearnerStatus),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tutor first name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "tutorFirstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tutor last name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "tutorLastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tutor phone number' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "tutorPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tutor address' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "tutorAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tutor email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], BulkCreateLearnerDto.prototype, "tutorEmail", void 0);
class BulkCreateLearnersDto {
}
exports.BulkCreateLearnersDto = BulkCreateLearnersDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [BulkCreateLearnerDto], description: 'Array of learners to create' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkCreateLearnerDto),
    __metadata("design:type", Array)
], BulkCreateLearnersDto.prototype, "learners", void 0);
class ValidationErrorDto {
}
exports.ValidationErrorDto = ValidationErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Field that has the error' }),
    __metadata("design:type", String)
], ValidationErrorDto.prototype, "field", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Error message' }),
    __metadata("design:type", String)
], ValidationErrorDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Invalid value' }),
    __metadata("design:type", Object)
], ValidationErrorDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Line number in file (if applicable)' }),
    __metadata("design:type", Number)
], ValidationErrorDto.prototype, "line", void 0);
class LearnerImportResultDto {
}
exports.LearnerImportResultDto = LearnerImportResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the import was successful' }),
    __metadata("design:type", Boolean)
], LearnerImportResultDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email of the learner' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'First name of the learner' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Last name of the learner' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Generated learner ID' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "learnerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Generated matricule' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "matricule", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Error message if import failed' }),
    __metadata("design:type", String)
], LearnerImportResultDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'Warning messages' }),
    __metadata("design:type", Array)
], LearnerImportResultDto.prototype, "warnings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [ValidationErrorDto],
        description: 'Validation errors if any',
    }),
    __metadata("design:type", Array)
], LearnerImportResultDto.prototype, "validationErrors", void 0);
class BulkImportSummaryDto {
}
exports.BulkImportSummaryDto = BulkImportSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of duplicate emails found' }),
    __metadata("design:type", Number)
], BulkImportSummaryDto.prototype, "duplicateEmails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of duplicate phones found' }),
    __metadata("design:type", Number)
], BulkImportSummaryDto.prototype, "duplicatePhones", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of session capacity warnings' }),
    __metadata("design:type", Number)
], BulkImportSummaryDto.prototype, "sessionCapacityWarnings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of missing referentials' }),
    __metadata("design:type", Number)
], BulkImportSummaryDto.prototype, "missingReferentials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of invalid data entries' }),
    __metadata("design:type", Number)
], BulkImportSummaryDto.prototype, "invalidData", void 0);
class BulkImportResponseDto {
}
exports.BulkImportResponseDto = BulkImportResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of records processed' }),
    __metadata("design:type", Number)
], BulkImportResponseDto.prototype, "totalProcessed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of successful imports' }),
    __metadata("design:type", Number)
], BulkImportResponseDto.prototype, "successfulImports", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of failed imports' }),
    __metadata("design:type", Number)
], BulkImportResponseDto.prototype, "failedImports", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [LearnerImportResultDto],
        description: 'Detailed results for each record',
    }),
    __metadata("design:type", Array)
], BulkImportResponseDto.prototype, "results", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: BulkImportSummaryDto, description: 'Summary statistics' }),
    __metadata("design:type", BulkImportSummaryDto)
], BulkImportResponseDto.prototype, "summary", void 0);
//# sourceMappingURL=BulkCreateTutorDto.js.map