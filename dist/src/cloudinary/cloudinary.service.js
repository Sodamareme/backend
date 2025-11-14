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
var CloudinaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
const config_1 = require("@nestjs/config");
const streamifier = require("streamifier");
let CloudinaryService = CloudinaryService_1 = class CloudinaryService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CloudinaryService_1.name);
        this.maxRetries = 3;
        this.chunkSize = 5 * 1024 * 1024;
        this.isConfigured = false;
        const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
        this.logger.log('Initializing Cloudinary configuration...');
        this.logger.log(`Cloud Name: ${cloudName ? '✅ Found' : '❌ Missing'}`);
        this.logger.log(`API Key: ${apiKey ? '✅ Found' : '❌ Missing'}`);
        this.logger.log(`API Secret: ${apiSecret ? '✅ Found' : '❌ Missing'}`);
        if (!cloudName || !apiKey || !apiSecret) {
            this.logger.error('❌ Missing Cloudinary configuration! Check your .env file.');
            return;
        }
        try {
            cloudinary_1.v2.config({
                cloud_name: cloudName.trim(),
                api_key: apiKey.trim(),
                api_secret: apiSecret.trim(),
            });
            this.isConfigured = true;
            this.logger.log('✅ Cloudinary configured successfully.');
        }
        catch (error) {
            this.logger.error('❌ Error configuring Cloudinary:', error);
        }
    }
    async uploadFile(file, folder, retryCount = 0) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not properly configured.');
        }
        try {
            this.logger.log(`📤 Attempting to upload file "${file.originalname}" to folder "${folder}" (try #${retryCount + 1})`);
            const uploadOptions = {
                folder,
                resource_type: 'auto',
                chunk_size: this.chunkSize,
                use_filename: true,
                unique_filename: true,
            };
            const result = await Promise.race([
                new Promise((resolve, reject) => {
                    const uploadStream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
                        if (error) {
                            this.logger.error('❌ Cloudinary upload failed:', error);
                            reject(error);
                        }
                        else {
                            this.logger.log('✅ Cloudinary upload success:', {
                                public_id: result.public_id,
                                url: result.secure_url,
                            });
                            resolve(result);
                        }
                    });
                    streamifier.createReadStream(file.buffer).pipe(uploadStream);
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Upload Timeout')), 180000)),
            ]);
            return { url: result.secure_url };
        }
        catch (error) {
            this.logger.error(`⚠️ Upload failed (attempt ${retryCount + 1}): ${error.message}`);
            if (retryCount < this.maxRetries) {
                const delay = 1000 * (retryCount + 1);
                this.logger.warn(`⏳ Retrying upload in ${delay / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.uploadFile(file, folder, retryCount + 1);
            }
            throw new Error(`Failed to upload file after ${this.maxRetries} attempts: ${error.message}`);
        }
    }
    async deleteFile(publicId) {
        if (!this.isConfigured) {
            this.logger.error('Cloudinary is not configured');
            throw new Error('Cloudinary is not configured');
        }
        this.logger.log(`🗑 Attempting to delete file with public ID: ${publicId}`);
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId);
            if (result.result === 'ok') {
                this.logger.log(`✅ Successfully deleted file: ${publicId}`);
            }
            else {
                this.logger.warn(`⚠️ Could not delete file: ${JSON.stringify(result)}`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Error deleting file: ${error.message}`);
            throw error;
        }
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = CloudinaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map