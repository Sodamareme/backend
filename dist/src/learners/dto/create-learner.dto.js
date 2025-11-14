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
exports.CreateLearnerDto = exports.CreateTutorDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreateTutorDto {
}
exports.CreateTutorDto = CreateTutorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTutorDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTutorDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number of the tutor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTutorDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Email address of the tutor' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTutorDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Address of the tutor' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTutorDto.prototype, "address", void 0);
class CreateLearnerDto {
}
exports.CreateLearnerDto = CreateLearnerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address of the learner' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Address of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Gender of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Birth date of the learner' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateLearnerDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Birth place of the learner' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "birthPlace", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Promotion ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "promotionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Referential ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "refId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Session ID (required for multi-session referentials)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Learner status' }),
    (0, class_validator_1.IsEnum)(client_1.LearnerStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLearnerDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tutor information' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreateTutorDto),
    __metadata("design:type", CreateTutorDto)
], CreateLearnerDto.prototype, "tutor", void 0);
//# sourceMappingURL=create-learner.dto.js.map