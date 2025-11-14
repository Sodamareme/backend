import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuthUtils } from '../utils/auth.utils';
import { Restaurateur } from '@prisma/client';
import { CreateRestaurateurDto } from './dto/create-restaurateur.dto';
import * as fs from 'fs';

@Injectable()
export class RestaurateursService {
  private readonly logger = new Logger(RestaurateursService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(createRestaurateurDto: CreateRestaurateurDto, photoFile?: Express.Multer.File): Promise<Restaurateur> {
    this.logger.log('Creating restaurateur with data:', {
      firstName: createRestaurateurDto.firstName,
      lastName: createRestaurateurDto.lastName,
      email: createRestaurateurDto.email
    });

    const existingRestaurateur = await this.prisma.restaurateur.findFirst({
      where: {
        OR: [
          { phone: createRestaurateurDto.phone },
          { user: { email: createRestaurateurDto.email } },
        ],
      },
    });

    if (existingRestaurateur) {
      throw new ConflictException('Un restaurateur avec cet email ou ce téléphone existe déjà');
    }

    let photoUrl: string | undefined;
    if (photoFile) {
      this.logger.log('Photo file received, processing...');
      
      try {
        this.logger.log('Attempting to upload to Cloudinary...');
        const result = await this.cloudinary.uploadFile(photoFile, 'restaurateurs');
        photoUrl = result.url;
        this.logger.log('Successfully uploaded to Cloudinary:', photoUrl);
      } catch (cloudinaryError) {
        this.logger.error('Cloudinary upload failed:', cloudinaryError);
        
        try {
          this.logger.log('Falling back to local storage...');
          if (!fs.existsSync('./uploads/restaurateurs')) {
            fs.mkdirSync('./uploads/restaurateurs', { recursive: true });
          }
          
          const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = photoFile.originalname.split('.').pop();
          const filename = `${uniquePrefix}.${extension}`;
          const filepath = `./uploads/restaurateurs/${filename}`;
          
          fs.writeFileSync(filepath, photoFile.buffer);
          
          photoUrl = `uploads/restaurateurs/${filename}`;
          this.logger.log(`File saved locally at ${filepath}`);
        } catch (localError) {
          this.logger.error('Local storage fallback failed:', localError);
        }
      }
    }

    // Generate and hash password
    const password = AuthUtils.generatePassword();
    const hashedPassword = await AuthUtils.hashPassword(password);

    try {
      const restaurateur = await this.prisma.restaurateur.create({
        data: {
          firstName: createRestaurateurDto.firstName,
          lastName: createRestaurateurDto.lastName,
          phone: createRestaurateurDto.phone,
          photoUrl,
          user: {
            create: {
              email: createRestaurateurDto.email,
              password: hashedPassword,
              role: 'RESTAURATEUR',
            },
          },
        },
        include: {
          user: true,
        },
      });

      // Send password email after successful creation
      await AuthUtils.sendPasswordEmail(createRestaurateurDto.email, password, 'Restaurateur');

      this.logger.log('Restaurateur created successfully:', restaurateur.id);
      return restaurateur;
    } catch (error) {
      this.logger.error('Failed to create restaurateur:', error);
      throw error;
    }
  }

  async findAll(): Promise<Restaurateur[]> {
    return this.prisma.restaurateur.findMany({
      include: {
        user: true,
      },
    });
  }

  async findOne(id: string): Promise<Restaurateur> {
    const restaurateur = await this.prisma.restaurateur.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!restaurateur) {
      throw new NotFoundException('Restaurateur non trouvé');
    }

    return restaurateur;
  }

  async update(id: string, updateData: Partial<Restaurateur>): Promise<Restaurateur> {
    const restaurateur = await this.findOne(id);

    return this.prisma.restaurateur.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  async remove(id: string): Promise<Restaurateur> {
    const restaurateur = await this.findOne(id);

    return this.prisma.restaurateur.delete({
      where: { id },
    });
  }
}