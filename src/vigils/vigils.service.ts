import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuthUtils } from '../utils/auth.utils';
import { Vigil } from '@prisma/client';
import { CreateVigilDto } from './dto/create-vigil.dto';
import * as fs from 'fs';

@Injectable()
export class VigilsService {
  private readonly logger = new Logger(VigilsService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(createVigilDto: CreateVigilDto, photoFile?: Express.Multer.File): Promise<Vigil> {
    this.logger.log('Creating vigil with data:', {
      firstName: createVigilDto.firstName,
      lastName: createVigilDto.lastName,
      email: createVigilDto.email,
    });

    const existingVigil = await this.prisma.vigil.findFirst({
      where: {
        OR: [
          { phone: createVigilDto.phone },
          { user: { email: createVigilDto.email } },
        ],
      },
    });

    if (existingVigil) {
      throw new ConflictException('Un vigil avec cet email ou ce téléphone existe déjà');
    }

    let photoUrl: string | undefined;
    
    if (photoFile) {
      this.logger.log('Photo file received, processing...');
      try {
        const result = await this.cloudinary.uploadFile(photoFile, 'vigils');
        photoUrl = result.url; // Use secure_url instead of url
        this.logger.log('Successfully uploaded to Cloudinary:', photoUrl);
      } catch (error) {
        this.logger.error('Failed to upload photo to Cloudinary:', error);
      }
    }

    // Generate and hash password
    const password = AuthUtils.generatePassword();
    const hashedPassword = await AuthUtils.hashPassword(password);

    try {
      const vigil = await this.prisma.vigil.create({
        data: {
          firstName: createVigilDto.firstName,
          lastName: createVigilDto.lastName,
          phone: createVigilDto.phone,
          photoUrl,
          user: {
            create: {
              email: createVigilDto.email,
              password: hashedPassword,
              role: 'VIGIL',
            },
          },
        },
        include: {
          user: true,
        },
      });

      // Send password email after successful creation
      await AuthUtils.sendPasswordEmail(createVigilDto.email, password, 'Vigil');

      this.logger.log('Vigil created successfully:', vigil.id);
      return vigil;
    } catch (error) {
      this.logger.error('Failed to create vigil:', error);
      throw error;
    }
  }

  async findAll(): Promise<Vigil[]> {
    return this.prisma.vigil.findMany({
      include: {
        user: true,
      },
    });
  }

  async findOne(id: string): Promise<Vigil> {
    const vigil = await this.prisma.vigil.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!vigil) {
      throw new NotFoundException('Vigil non trouvé');
    }

    return vigil;
  }

  async update(id: string, updateData: Partial<Vigil>): Promise<Vigil> {
    const vigil = await this.findOne(id);

    return this.prisma.vigil.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  async remove(id: string): Promise<Vigil> {
    const vigil = await this.findOne(id);

    return this.prisma.vigil.delete({
      where: { id },
    });
  }
}