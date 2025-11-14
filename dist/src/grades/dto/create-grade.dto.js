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
exports.CreateGradeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateGradeDto {
}
exports.CreateGradeDto = CreateGradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID du module',
        example: '123e4567-e89b-12d3-a456-426614174000',
        format: 'uuid'
    }),
    (0, class_validator_1.IsUUID)(4, { message: 'moduleId doit être un UUID valide' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "moduleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID de l\'apprenant',
        example: '123e4567-e89b-12d3-a456-426614174001',
        format: 'uuid'
    }),
    (0, class_validator_1.IsUUID)(4, { message: 'learnerId doit être un UUID valide' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "learnerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Note (entre 0 et 20)',
        minimum: 0,
        maximum: 20,
        example: 15.5
    }),
    (0, class_validator_1.IsNumber)({}, { message: 'La valeur doit être un nombre' }),
    (0, class_validator_1.Min)(0, { message: 'La note ne peut pas être inférieure à 0' }),
    (0, class_validator_1.Max)(20, { message: 'La note ne peut pas être supérieure à 20' }),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], CreateGradeDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Commentaire sur la note',
        example: 'Excellent travail'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "comment", void 0);
//# sourceMappingURL=create-grade.dto.js.map