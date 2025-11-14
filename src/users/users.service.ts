import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { email: string; password: string; role: UserRole }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getUserPhotoByEmail(email: string): Promise<{ photoUrl: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        learner: {
          select: { photoUrl: true }
        },
        coach: {
          select: { photoUrl: true }
        },
        vigil: {
          select: { photoUrl: true }
        },
        restaurateur: {
          select: { photoUrl: true }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    let photoUrl = null;
    switch (user.role) {
      case UserRole.APPRENANT:
        photoUrl = user.learner?.photoUrl || null;
        break;
      case UserRole.COACH:
        photoUrl = user.coach?.photoUrl || null;
        break;
      case UserRole.VIGIL:
        photoUrl = user.vigil?.photoUrl || null;
        break;
      case UserRole.RESTAURATEUR:
        photoUrl = user.restaurateur?.photoUrl || null;
        break;
    }

    return { photoUrl };
  }

  async getUserDetailsByRole(user: User) {
    switch (user.role) {
      case UserRole.APPRENANT:
        return this.prisma.learner.findFirst({
          where: { userId: user.id },
          include: {
            promotion: true,
            referential: true
          }
        });
      case UserRole.COACH:
        return this.prisma.coach.findFirst({
          where: { userId: user.id },
          include: {
            referential: true,
           // promotions: true,  Replace 'learners' with a valid property like 'promotions'
            modules: true   // Include modules if needed
          }
        });
      case UserRole.VIGIL:
        return this.prisma.vigil.findFirst({
          where: { userId: user.id }
        });
      case UserRole.RESTAURATEUR:
        return this.prisma.restaurateur.findFirst({
          where: { userId: user.id }
        });
      default:
        return null;
    }
  }
}