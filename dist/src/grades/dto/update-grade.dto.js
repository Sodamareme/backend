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
exports.UpdateGradeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class UpdateGradeDto {
}
exports.UpdateGradeDto = UpdateGradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Note de l\'apprenant (entre 0 et 20)',
        example: 16.0,
        minimum: 0,
        maximum: 20,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'La valeur doit être un nombre' }),
    (0, class_validator_1.Min)(0, { message: 'La note ne peut pas être inférieure à 0' }),
    (0, class_validator_1.Max)(20, { message: 'La note ne peut pas être supérieure à 20' }),
    (0, class_transformer_1.Transform)(({ value }) => value !== undefined ? parseFloat(value) : value),
    __metadata("design:type", Number)
], UpdateGradeDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Commentaire sur la note',
        example: 'Excellent travail, félicitations !',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGradeDto.prototype, "comment", void 0);
//# sourceMappingURL=update-grade.dto.js.map