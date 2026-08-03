import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PendingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePendingLearnerDto } from './dto/create-pending-learner.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import { LearnersService } from '../learners/learners.service';

@Injectable()
export class PendingLearnersService {
  private readonly logger = new Logger(PendingLearnersService.name);
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
    private readonly learnersService: LearnersService,
  ) {}

  private normalizeTutor(rawTutor: CreatePendingLearnerDto['tutor']) {
    return {
      firstName: rawTutor?.firstName?.trim() || '',
      lastName: rawTutor?.lastName?.trim() || '',
      phone: rawTutor?.phone?.trim() || '',
      email: rawTutor?.email?.trim() || undefined,
      address: rawTutor?.address?.trim() || undefined,
    };
  }

  private validatePhotoFile(photoFile?: Express.Multer.File) {
    if (!photoFile) {
      return;
    }

    if (!this.allowedMimeTypes.has(photoFile.mimetype)) {
      throw new BadRequestException(
        'Le document photo doit etre au format JPG, PNG, GIF ou WebP',
      );
    }

    if (photoFile.size > this.maxFileSize) {
      throw new BadRequestException('La photo ne doit pas depasser 10 Mo');
    }
  }

  private toPublicSubmissionResponse() {
    return {
      success: true,
      message: 'Votre inscription sera verifiee par l administration avant activation.',
    };
  }

  async createPendingLearner(
    dto: CreatePendingLearnerDto,
    photoFile?: Express.Multer.File,
  ) {
    if (!dto.firstName?.trim()) {
      throw new BadRequestException('Le prenom est requis');
    }

    if (!dto.lastName?.trim()) {
      throw new BadRequestException('Le nom est requis');
    }

    if (!dto.email?.trim()) {
      throw new BadRequestException("L'email est requis");
    }

    if (!dto.phone?.trim()) {
      throw new BadRequestException('Le telephone est requis');
    }

    if (!dto.address?.trim()) {
      throw new BadRequestException("L'adresse est requise");
    }

    if (!dto.birthDate) {
      throw new BadRequestException('La date de naissance est requise');
    }

    if (!dto.birthPlace?.trim()) {
      throw new BadRequestException('Le lieu de naissance est requis');
    }

    if (!dto.promotionId?.trim()) {
      throw new BadRequestException('La promotion est requise');
    }

    if (!dto.refId?.trim()) {
      throw new BadRequestException('Le referentiel est requis');
    }

    if (!['MALE', 'FEMALE'].includes(dto.gender as string)) {
      throw new BadRequestException('Le genre doit etre MALE ou FEMALE');
    }

    const tutor = this.normalizeTutor(dto.tutor);

    if (!tutor.firstName || !tutor.lastName || !tutor.phone) {
      throw new BadRequestException(
        'Les informations du tuteur sont incompletes (prenom, nom et telephone requis)',
      );
    }

    this.validatePhotoFile(photoFile);

    const existingPending = await this.prisma.pendingLearner.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
        status: PendingStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException('Cet apprenant a deja une demande en attente');
    }

    const existingLearner = await this.prisma.learner.findFirst({
      where: {
        OR: [{ user: { email: dto.email } }, { phone: dto.phone }],
      },
    });

    if (existingLearner) {
      throw new ConflictException('Un apprenant avec cet email ou ce telephone existe deja');
    }

    const [promotion, referential] = await Promise.all([
      this.prisma.promotion.findUnique({
        where: { id: dto.promotionId },
        select: { id: true, name: true },
      }),
      this.prisma.referential.findUnique({
        where: { id: dto.refId },
        select: {
          id: true,
          name: true,
          numberOfSessions: true,
          sessions: {
            select: {
              id: true,
              name: true,
              capacity: true,
            },
          },
        },
      }),
    ]);

    if (!promotion) {
      throw new NotFoundException('Promotion introuvable');
    }

    if (!referential) {
      throw new NotFoundException('Referentiel introuvable');
    }

    if (referential.numberOfSessions > 1) {
      if (!dto.sessionId?.trim()) {
        throw new BadRequestException(
          'Ce référentiel a plusieurs sessions. Veuillez sélectionner une session.',
        );
      }

      const session = referential.sessions.find((item) => item.id === dto.sessionId);

      if (!session) {
        throw new BadRequestException('Session invalide pour ce référentiel');
      }

      const sessionLearnerCount = await this.prisma.learner.count({
        where: { sessionId: dto.sessionId },
      });

      if (sessionLearnerCount >= session.capacity) {
        throw new BadRequestException(
          `La session ${session.name} a atteint sa capacité maximale`,
        );
      }
    } else if (dto.sessionId) {
      throw new BadRequestException(
        'Un sessionId ne doit pas être fourni pour un référentiel à session unique',
      );
    }

    let photoUrl: string | undefined;
    if (photoFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(photoFile, 'pending-learners');
      photoUrl = uploadResult.url;
    }

    const pendingLearner = await this.prisma.pendingLearner.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        address: dto.address.trim(),
        gender: dto.gender,
        birthDate: new Date(dto.birthDate),
        birthPlace: dto.birthPlace.trim(),
        promotionId: dto.promotionId,
        refId: dto.refId,
        sessionId: dto.sessionId ?? null,
        photoUrl,
        tutorData: tutor,
      },
      include: {
        promotion: { select: { id: true, name: true } },
        referential: { select: { id: true, name: true } },
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { email: true },
    });

    await Promise.allSettled(
      admins
        .map((admin) => admin.email)
        .filter(Boolean)
        .map((adminEmail) =>
          this.emailService.sendPendingLearnerNotification(adminEmail, {
            firstName: pendingLearner.firstName,
            lastName: pendingLearner.lastName,
            email: pendingLearner.email,
            phone: pendingLearner.phone,
            promotionName: pendingLearner.promotion.name,
            referentialName: pendingLearner.referential.name,
            pendingLearnerId: pendingLearner.id,
          }),
        ),
    );

    return this.toPublicSubmissionResponse();
  }

  async getPendingLearners(status?: PendingStatus) {
    return this.prisma.pendingLearner.findMany({
      where: status ? { status } : undefined,
      include: {
        promotion: { select: { id: true, name: true } },
        referential: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingLearnerById(id: string) {
    const pendingLearner = await this.prisma.pendingLearner.findUnique({
      where: { id },
      include: {
        promotion: { select: { id: true, name: true } },
        referential: { select: { id: true, name: true } },
      },
    });

    if (!pendingLearner) {
      throw new NotFoundException("Demande d'inscription introuvable");
    }

    return pendingLearner;
  }

  async approvePendingLearner(id: string, reviewedBy: string) {
    const pendingLearner = await this.getPendingLearnerById(id);

    if (pendingLearner.status !== PendingStatus.PENDING) {
      throw new BadRequestException('Cette demande a deja ete traitee');
    }

    const tutor = this.normalizeTutor(pendingLearner.tutorData as CreatePendingLearnerDto['tutor']);

    const learner = await this.learnersService.create(
      {
        firstName: pendingLearner.firstName,
        lastName: pendingLearner.lastName,
        email: pendingLearner.email,
        phone: pendingLearner.phone,
        address: pendingLearner.address,
        gender: pendingLearner.gender,
        birthDate: pendingLearner.birthDate.toISOString(),
        birthPlace: pendingLearner.birthPlace,
        promotionId: pendingLearner.promotionId,
        refId: pendingLearner.refId,
        sessionId: pendingLearner.sessionId ?? undefined,
        tutor,
      },
      undefined,
      pendingLearner.photoUrl ?? undefined,
    );

    await this.prisma.pendingLearner.update({
      where: { id },
      data: {
        status: PendingStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    this.logger.log(`Pending learner approved: ${id} -> learner ${learner.id}`);

    return {
      message: "Demande d'inscription approuvee",
      learnerId: learner.id,
    };
  }

  async rejectPendingLearner(id: string, reviewedBy: string, reason?: string) {
    const pendingLearner = await this.getPendingLearnerById(id);

    if (pendingLearner.status !== PendingStatus.PENDING) {
      throw new BadRequestException('Cette demande a deja ete traitee');
    }

    await this.prisma.pendingLearner.update({
      where: { id },
      data: {
        status: PendingStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: reason?.trim() || null,
      },
    });

    await this.emailService.sendLearnerRejectionEmail(
      pendingLearner.email,
      {
        firstName: pendingLearner.firstName,
        lastName: pendingLearner.lastName,
      },
      reason?.trim() || undefined,
    );

    return {
      message: "Demande d'inscription rejetee",
    };
  }

  async deletePendingLearner(id: string) {
    const pendingLearner = await this.getPendingLearnerById(id);

    if (pendingLearner.photoUrl) {
      await this.cloudinaryService.deleteFileByUrl(pendingLearner.photoUrl).catch(() => undefined);
    }

    await this.prisma.pendingLearner.delete({
      where: { id },
    });

    return {
      message: "Demande d'inscription supprimee definitivement",
    };
  }
}
