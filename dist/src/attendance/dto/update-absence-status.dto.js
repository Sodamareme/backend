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
exports.UpdateAbsenceStatusDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UpdateAbsenceStatusDto {
}
exports.UpdateAbsenceStatusDto = UpdateAbsenceStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.AbsenceStatus,
        description: 'Status of the absence justification',
        example: 'PENDING'
    }),
    (0, class_validator_1.IsEnum)(client_1.AbsenceStatus),
    __metadata("design:type", String)
], UpdateAbsenceStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Optional comment for the status update'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAbsenceStatusDto.prototype, "comment", void 0);
//# sourceMappingURL=update-absence-status.dto.js.map