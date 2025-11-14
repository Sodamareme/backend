import { ConfigService } from '@nestjs/config';
export declare class CloudinaryService {
    private readonly configService;
    private readonly logger;
    private readonly maxRetries;
    private readonly chunkSize;
    private isConfigured;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, folder: string, retryCount?: number): Promise<{
        url: string;
    }>;
    deleteFile(publicId: string): Promise<void>;
}
