"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCoachDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_coach_dto_1 = require("./create-coach.dto");
class UpdateCoachDto extends (0, swagger_1.PartialType)(create_coach_dto_1.CreateCoachDto) {
}
exports.UpdateCoachDto = UpdateCoachDto;
//# sourceMappingURL=update-coach.dto.js.map