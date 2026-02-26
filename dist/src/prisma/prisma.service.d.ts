import { OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    executeWithRetry<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
}
