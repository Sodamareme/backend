import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly maxRetries = 3;
  private readonly chunkSize = 5 * 1024 * 1024; // 5 MB
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
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
      cloudinary.config({
        cloud_name: cloudName.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });

      this.isConfigured = true;
      this.logger.log('✅ Cloudinary configured successfully.');
    } catch (error) {
      this.logger.error('❌ Error configuring Cloudinary:', error);
    }
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Retries automatically in case of network timeout or transient errors.
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    retryCount = 0
  ): Promise<{ url: string }> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not properly configured.');
    }

    try {
      this.logger.log(
        `📤 Attempting to upload file "${file.originalname}" to folder "${folder}" (try #${retryCount + 1})`
      );

      const uploadOptions = {
        folder,
        resource_type: 'auto' as const,
        chunk_size: this.chunkSize,
        use_filename: true,
        unique_filename: true,
      };

      // Upload stream wrapped in a manual timeout
      const result: any = await Promise.race([
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                this.logger.error('❌ Cloudinary upload failed:', error);
                reject(error);
              } else {
                this.logger.log('✅ Cloudinary upload success:', {
                  public_id: result.public_id,
                  url: result.secure_url,
                });
                resolve(result);
              }
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload Timeout')), 180000) // 3 minutes
        ),
      ]);

      return { url: result.secure_url };
    } catch (error) {
      this.logger.error(
        `⚠️ Upload failed (attempt ${retryCount + 1}): ${error.message}`
      );

      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = 1000 * (retryCount + 1);
        this.logger.warn(`⏳ Retrying upload in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.uploadFile(file, folder, retryCount + 1);
      }

      throw new Error(`Failed to upload file after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Delete a file from Cloudinary.
   */
  async deleteFile(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.error('Cloudinary is not configured');
      throw new Error('Cloudinary is not configured');
    }

    this.logger.log(`🗑 Attempting to delete file with public ID: ${publicId}`);

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result === 'ok') {
        this.logger.log(`✅ Successfully deleted file: ${publicId}`);
      } else {
        this.logger.warn(`⚠️ Could not delete file: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error deleting file: ${error.message}`);
      throw error;
    }
  }

  extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('res.cloudinary.com')) {
      return null;
    }

    const uploadMarker = '/upload/';
    const uploadIndex = url.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return null;
    }

    let publicPath = url.slice(uploadIndex + uploadMarker.length);
    publicPath = publicPath.replace(/^v\d+\//, '');

    const extensionIndex = publicPath.lastIndexOf('.');
    if (extensionIndex !== -1) {
      publicPath = publicPath.slice(0, extensionIndex);
    }

    return publicPath || null;
  }

  async deleteFileByUrl(url: string): Promise<void> {
    const publicId = this.extractPublicIdFromUrl(url);

    if (!publicId) {
      this.logger.warn(`⚠️ Could not extract Cloudinary public ID from URL: ${url}`);
      return;
    }

    await this.deleteFile(publicId);
  }
}
