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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        let retries = 5;
        while (retries > 0) {
            try {
                await this.$connect();
                this.logger.log('✅ Database connected');
                return;
            }
            catch (error) {
                retries--;
                this.logger.warn(`⚠️ DB not ready, retrying in 3s... (${retries} attempts left)`);
                if (retries === 0) {
                    this.logger.error('❌ Could not connect at startup, will retry on first request');
                    return;
                }
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
    async executeWithRetry(fn, retries = 3) {
        for (let i = 1; i <= retries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                const isNetworkError = error?.message?.includes("Can't reach database") ||
                    error?.message?.includes('connect ECONNREFUSED') ||
                    error?.code === 'P1001' ||
                    error?.code === 'P1002';
                if (isNetworkError && i < retries) {
                    this.logger.warn(`⚠️ Neon unreachable, retry ${i}/${retries} in ${i * 2}s...`);
                    await new Promise(r => setTimeout(r, i * 2000));
                    try {
                        await this.$disconnect();
                        await this.$connect();
                    }
                    catch { }
                    continue;
                }
                throw error;
            }
        }
        throw new Error('DB unreachable after retries');
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map