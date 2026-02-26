import { PrismaService } from './prisma/prisma.service';
export declare class DatabaseKeepalive {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    keepAlive(): Promise<void>;
}
export declare class AppModule {
}
