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
exports.RegisterLearnerDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
})(Gender || (Gender = {}));
var LearnerStatus;
(function (LearnerStatus) {
    LearnerStatus["ACTIVE"] = "ACTIVE";
    LearnerStatus["WAITING"] = "WAITING";
})(LearnerStatus || (LearnerStatus = {}));
class TutorDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Jean' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TutorDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dupont' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TutorDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+221771234567' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^[0-9+]+$/, { message: 'Format de numéro invalide' }),
    __metadata("design:type", String)
], TutorDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'tuteur@example.com', required: false }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TutorDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dakar, Senegal' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], TutorDto.prototype, "address", void 0);
class RegisterLearnerDto {
}
exports.RegisterLearnerDto = RegisterLearnerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Moussa' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diallo' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'moussa.diallo@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+221771234567' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^[0-9+]+$/, { message: 'Format de numéro invalide' }),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dakar, Senegal' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: Gender, example: 'MALE' }),
    (0, class_validator_1.IsEnum)(Gender),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2000-01-15' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dakar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "birthPlace", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'promo-uuid' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "promotionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ref-uuid' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "refId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: LearnerStatus, example: 'WAITING' }),
    (0, class_validator_1.IsEnum)(LearnerStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterLearnerDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TutorDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TutorDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", TutorDto)
], RegisterLearnerDto.prototype, "tutor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'string', format: 'binary', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RegisterLearnerDto.prototype, "photo", void 0);
//# sourceMappingURL=register-learner.dto.js.map