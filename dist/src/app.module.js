"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const learners_module_1 = require("./learners/learners.module");
const coaches_module_1 = require("./coaches/coaches.module");
const promotions_module_1 = require("./promotions/promotions.module");
const referentials_module_1 = require("./referentials/referentials.module");
const attendance_module_1 = require("./attendance/attendance.module");
const modules_module_1 = require("./modules/modules.module");
const events_module_1 = require("./events/events.module");
const cloudinary_module_1 = require("./cloudinary/cloudinary.module");
const meals_module_1 = require("./meals/meals.module");
const vigils_module_1 = require("./vigils/vigils.module");
const restaurateurs_module_1 = require("./restaurateurs/restaurateurs.module");
const grades_module_1 = require("./grades/grades.module");
const email_module_1 = require("../src/email/email.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            learners_module_1.LearnersModule,
            coaches_module_1.CoachesModule,
            vigils_module_1.VigilsModule,
            restaurateurs_module_1.RestaurateursModule,
            promotions_module_1.PromotionsModule,
            referentials_module_1.ReferentialsModule,
            attendance_module_1.AttendanceModule,
            modules_module_1.ModulesModule,
            events_module_1.EventsModule,
            cloudinary_module_1.CloudinaryModule,
            meals_module_1.MealsModule,
            grades_module_1.GradesModule,
            email_module_1.EmailModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map