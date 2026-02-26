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
var DatabaseKeepalive_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = exports.DatabaseKeepalive = void 0;
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
const prisma_service_1 = require("./prisma/prisma.service");
const schedule_2 = require("@nestjs/schedule");
let DatabaseKeepalive = DatabaseKeepalive_1 = class DatabaseKeepalive {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DatabaseKeepalive_1.name);
    }
    async keepAlive() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
        }
        catch (e) {
            this.logger.warn('Keepalive failed, reconnecting...');
            await this.prisma.$disconnect();
            await this.prisma.$connect();
        }
    }
};
exports.DatabaseKeepalive = DatabaseKeepalive;
__decorate([
    (0, schedule_2.Cron)('*/4 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DatabaseKeepalive.prototype, "keepAlive", null);
exports.DatabaseKeepalive = DatabaseKeepalive = DatabaseKeepalive_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DatabaseKeepalive);
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
        providers: [
            prisma_service_1.PrismaService,
            DatabaseKeepalive,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map