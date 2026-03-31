import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Module, Prisma } from '@prisma/client';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Crée un nouveau module
   */
  async create(data: CreateModuleDto, photoFile?: Express.Multer.File): Promise<Module> {
    this.logger.log(`Création d’un module : ${data.name}`);

    let photoUrl: string | undefined;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Dates de module invalides');
    }

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    // Upload photo (si fournie)
    if (photoFile) {
      try {
        const uploadResult = await this.cloudinary.uploadFile(photoFile, 'modules');
        photoUrl = uploadResult.url;
      } catch (error) {
        this.logger.error('Erreur upload Cloudinary', error);
        throw new BadRequestException('Échec de l’upload de la photo');
      }
    }

    // Création du module
    return this.prisma.module.create({
      data: {
        name: data.name,
        description: data.description,
        startDate,
        endDate,
        photoUrl,
        coach: { connect: { id: data.coachId } },
        referential: { connect: { id: data.refId } },
      },
    });
  }

  /**
   * Récupère tous les modules (avec pagination pour éviter le lag)
   */
  async findAll(page = 1, limit = 10): Promise<Module[]> {
    const skip = (page - 1) * limit;

    return this.prisma.module.findMany({
      skip,
      take: limit,
      orderBy: { startDate: 'desc' },
      include: {
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
        referential: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Trouve un module spécifique
   */
  async findOne(id: string): Promise<Module> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
        referential: {
          select: { id: true, name: true },
        },
        grades: {
          select: { id: true, value: true },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module non trouvé');
    }

    return module;
  }

  /**
   * Mise à jour d’un module
   */
  async update(id: string, data: UpdateModuleDto): Promise<Module> {
    const existingModule = await this.findOne(id); // vérifie l’existence

    const updateData: Prisma.ModuleUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.photoUrl !== undefined) {
      updateData.photoUrl = data.photoUrl;
    }

    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate);
      if (Number.isNaN(startDate.getTime())) {
        throw new BadRequestException('Date de début invalide');
      }
      updateData.startDate = startDate;
    }

    if (data.endDate !== undefined) {
      const endDate = new Date(data.endDate);
      if (Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Date de fin invalide');
      }
      updateData.endDate = endDate;
    }

    const effectiveStartDate =
      updateData.startDate instanceof Date ? updateData.startDate : existingModule.startDate;
    const effectiveEndDate =
      updateData.endDate instanceof Date ? updateData.endDate : existingModule.endDate;

    if (effectiveStartDate > effectiveEndDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    if (data.coachId !== undefined) {
      updateData.coach = { connect: { id: data.coachId } };
    }

    if (data.refId !== undefined) {
      updateData.referential = { connect: { id: data.refId } };
    }

    if (data.sessionId !== undefined) {
      updateData.session = data.sessionId ? { connect: { id: data.sessionId } } : { disconnect: true };
    }

    return this.prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
        referential: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Ajout d’une note (grade) à un module
   */
  async addGrade(data: {
    moduleId: string;
    learnerId: string;
    value: number;
    comment?: string;
  }) {
    await this.findOne(data.moduleId);

    return this.prisma.grade.create({
      data: {
        value: data.value,
        comment: data.comment,
        moduleId: data.moduleId,
        learnerId: data.learnerId,
      },
      include: {
        learner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateGrade(moduleId: string, gradeId: string, data: { value: number; comment?: string }) {
    await this.findOne(moduleId);
    const existingGrade = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        moduleId,
      },
      select: { id: true },
    });

    if (!existingGrade) {
      throw new NotFoundException('Note introuvable pour ce module');
    }

    return this.prisma.grade.update({
      where: { id: gradeId },
      data,
      include: {
        learner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Modules actifs (aujourd’hui)
   */
  async getActiveModules(): Promise<Module[]> {
    const now = new Date();

    return this.prisma.module.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        referential: { select: { id: true, name: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Modules par référentiel
   */
  async getModulesByReferential(refId: string): Promise<Module[]> {
    return this.prisma.module.findMany({
      where: { refId },
      include: {
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Notes (grades) d’un module
   */
  async getGradesByModule(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        grades: {
          include: {
            learner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
                photoUrl: true,
                referential: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!module) throw new NotFoundException(`Module ${moduleId} introuvable`);

    return module.grades.map((grade) => ({
      id: grade.id,
      value: grade.value,
      comment: grade.comment,
      createdAt: grade.createdAt,
      learner: grade.learner,
    }));
  }
}
