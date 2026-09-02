import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AbsenceStatus, Gender, Learner, LearnerStatus, Prisma, PrismaClient, UserRole } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { AuthUtils } from '../utils/auth.utils';
import { CreateLearnerDto } from './dto/create-learner.dto';
import { ReplaceLearnerDto, UpdateStatusDto } from './dto/update-status.dto';
import { MatriculeUtils } from '../utils/matricule.utils';
import { BulkCreateLearnerDto, BulkCreateLearnersDto, LearnerImportResultDto } from './dto/BulkCreateLearnerDto';
import { BulkImportResponseDto, ValidationError } from './dto/BulkImportResponseDto';
import { ValidationResponseDto } from './dto/ValidationResponseDto ';
import { EmailService } from '../email/email.service';
import { LearnersReferenceQueryDto } from './dto/learners-reference-query.dto';
import { EventsService } from '../events/events.service';
import { normalizeEmail, normalizeEmailOrUndefined } from '../utils/email.utils';

@Injectable()
export class LearnersService {
  private readonly logger = new Logger(LearnersService.name);
  private readonly safeUserSelect = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private emailService: EmailService,
    private eventsService: EventsService,
  ) {}

  private normalizeCreateLearnerDto(dto: CreateLearnerDto): CreateLearnerDto {
    return {
      ...dto,
      email: normalizeEmail(dto.email),
      tutor: {
        ...dto.tutor,
        email: normalizeEmailOrUndefined(dto.tutor?.email),
      },
    };
  }

  private normalizeBulkLearnerDto(dto: BulkCreateLearnerDto): BulkCreateLearnerDto {
    return {
      ...dto,
      email: normalizeEmail(dto.email),
      tutorEmail: normalizeEmailOrUndefined(dto.tutorEmail),
    };
  }

  private getAttendanceDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isPastOrCurrentAttendanceDay(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const comparedDate = new Date(date);
    comparedDate.setHours(0, 0, 0, 0);

    return comparedDate.getTime() <= today.getTime();
  }

  private isInstructionDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6 && this.isPastOrCurrentAttendanceDay(date);
  }

  private async getBlockedAttendanceDayKeys(
    promotionId: string | null | undefined,
    dates: Date[],
  ): Promise<Set<string>> {
    if (!promotionId || dates.length === 0) {
      return new Set<string>();
    }

    const timestamps = dates.map((date) => this.normalizeAttendanceBoundary(date).getTime());
    const startDate = new Date(Math.min(...timestamps));
    const endDate = new Date(Math.max(...timestamps));
    const blockedByPromotion = await this.eventsService.getBlockedDateKeysByPromotion(
      [promotionId],
      startDate,
      endDate,
      'attendance',
    );

    return blockedByPromotion.get(promotionId) ?? new Set<string>();
  }

  private async getLearnerAttendanceStartDateMap(
    learnerIds: string[],
  ): Promise<Map<string, Date | null>> {
    const uniqueLearnerIds = Array.from(new Set(learnerIds)).filter(Boolean);

    if (uniqueLearnerIds.length === 0) {
      return new Map();
    }

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string; attendanceStartDate: Date | null }>
      >(
        Prisma.sql`SELECT id, "attendanceStartDate" FROM "Learner" WHERE id IN (${Prisma.join(uniqueLearnerIds)})`,
      );

      return new Map(
        rows.map((row) => [
          row.id,
          row.attendanceStartDate
            ? this.normalizeAttendanceBoundary(row.attendanceStartDate)
            : null,
        ]),
      );
    } catch (error) {
      this.logger.warn(
        `attendanceStartDate indisponible sur Learner, fallback à null: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return new Map(uniqueLearnerIds.map((id) => [id, null]));
    }
  }

  private normalizeAttendanceBoundary(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private async getLearnerAttendanceWindow(learner: {
    id: string;
    status: LearnerStatus;
    createdAt?: Date | null;
    attendanceStartDate?: Date | null;
  }): Promise<{
    startDate: Date | null;
    shouldCountAttendance: boolean;
  }> {
    const explicitStartDate = learner.attendanceStartDate
      ? this.normalizeAttendanceBoundary(learner.attendanceStartDate)
      : null;

    if (learner.status !== LearnerStatus.REPLACEMENT) {
      return {
        startDate: this.getLatestAttendanceStartDate(
          learner.createdAt,
          explicitStartDate,
        ),
        shouldCountAttendance: true,
      };
    }

    const firstRealScan = await this.prisma.learnerAttendance.findFirst({
      where: {
        learnerId: learner.id,
        scanTime: {
          not: null,
        },
      },
      orderBy: {
        scanTime: 'asc',
      },
      select: {
        scanTime: true,
        date: true,
      },
    });

    if (!firstRealScan) {
      return {
        startDate: null,
        shouldCountAttendance: false,
      };
    }

    return {
      startDate: this.getLatestAttendanceStartDate(
        firstRealScan.scanTime ?? firstRealScan.date,
        explicitStartDate,
      ),
      shouldCountAttendance: true,
    };
  }

  private isAttendanceOnOrAfterStart(date: Date, startDate: Date | null): boolean {
    if (!startDate) {
      return true;
    }

    return this.normalizeAttendanceBoundary(date).getTime() >= startDate.getTime();
  }

  private getLatestAttendanceStartDate(...dates: Array<Date | null | undefined>): Date | null {
    const normalizedDates = dates
      .filter((date): date is Date => Boolean(date))
      .map((date) => this.normalizeAttendanceBoundary(date));

    if (normalizedDates.length === 0) {
      return null;
    }

    return new Date(Math.max(...normalizedDates.map((date) => date.getTime())));
  }

  // ==========================================
  // CRÉATION D'UN APPRENANT
  // ==========================================
  async create(
    createLearnerDto: CreateLearnerDto,
    photoFile?: Express.Multer.File,
    existingPhotoUrl?: string,
  ): Promise<Learner> {
    this.logger.debug('Creating learner');
    const normalizedCreateLearnerDto = this.normalizeCreateLearnerDto(createLearnerDto);

    // ✅ Validation préalable AVANT la transaction pour avoir de vrais messages d'erreur
    await this.validateBeforeCreate(normalizedCreateLearnerDto);

    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          // 1. Vérifier la promotion
          const promotion = await prisma.promotion.findUnique({
            where: { id: normalizedCreateLearnerDto.promotionId },
            include: { referentials: true },
          });

          if (!promotion) {
            throw new NotFoundException('Promotion introuvable');
          }

          // 2. Vérifier le référentiel si fourni
          if (normalizedCreateLearnerDto.refId) {
            const referentialExists = promotion.referentials.some(
              (ref) => ref.id === normalizedCreateLearnerDto.refId,
            );

            if (!referentialExists) {
              throw new BadRequestException(
                `Le référentiel ${normalizedCreateLearnerDto.refId} n'est pas associé à la promotion ${promotion.name}`,
              );
            }

            const referential = await prisma.referential.findUnique({
              where: { id: normalizedCreateLearnerDto.refId },
              include: {
                sessions: { select: { id: true, name: true, capacity: true } },
              },
            });

            if (!referential) {
              throw new NotFoundException('Référentiel introuvable');
            }

            const referentialClosureRows = await prisma.$queryRaw<
              Array<{ attendanceClosedAt: Date | null }>
            >(
              Prisma.sql`SELECT "attendanceClosedAt" FROM "Referential" WHERE id = ${normalizedCreateLearnerDto.refId}`,
            );

            const isSessionBasedReferential = referential.numberOfSessions > 1;

            if (!isSessionBasedReferential && referentialClosureRows[0]?.attendanceClosedAt) {
              throw new BadRequestException(
                'Les inscriptions sont fermées pour ce référentiel.',
              );
            }

            // ✅ Vérification sessions
            if (isSessionBasedReferential) {
              if (!normalizedCreateLearnerDto.sessionId) {
                throw new BadRequestException(
                  `Ce référentiel a plusieurs sessions. Veuillez spécifier un sessionId. Sessions disponibles: ${referential.sessions.map((s) => `${s.name} (${s.id})`).join(', ')}`,
                );
              }

              const session = referential.sessions.find(
                (s) => s.id === normalizedCreateLearnerDto.sessionId,
              );

              if (!session) {
                throw new BadRequestException(
                  `Session invalide. Sessions disponibles: ${referential.sessions.map((s) => s.name).join(', ')}`,
                );
              }

              const sessionClosureRows = await prisma.$queryRaw<
                Array<{ attendanceClosedAt: Date | null }>
              >(
                Prisma.sql`SELECT "attendanceClosedAt" FROM "Session" WHERE id = ${normalizedCreateLearnerDto.sessionId}`,
              );

              if (sessionClosureRows[0]?.attendanceClosedAt) {
                throw new BadRequestException(
                  `Les inscriptions sont fermées pour ${session.name}. Veuillez choisir une session ouverte.`,
                );
              }

              const sessionLearnerCount = await prisma.learner.count({
                where: { sessionId: normalizedCreateLearnerDto.sessionId },
              });

              if (sessionLearnerCount >= session.capacity) {
                throw new BadRequestException(
                  `La session ${session.name} a atteint sa capacité maximale de ${session.capacity} apprenants`,
                );
              }
            } else if (normalizedCreateLearnerDto.sessionId) {
              throw new BadRequestException(
                'Un sessionId ne doit pas être fourni pour un référentiel à session unique',
              );
            }
          }

          // 3. Générer le matricule
          const referential = normalizedCreateLearnerDto.refId
            ? await prisma.referential.findUnique({
                where: { id: normalizedCreateLearnerDto.refId },
              })
            : null;

          const matricule = await MatriculeUtils.generateLearnerMatricule(
            prisma as PrismaClient,
            normalizedCreateLearnerDto.firstName,
            normalizedCreateLearnerDto.lastName,
            referential?.name,
          );

          if (!matricule) {
            throw new BadRequestException('Impossible de générer le matricule');
          }

          this.logger.debug('Learner matricule generated');

          // 4. Générer le QR code (sans bloquer si erreur)
          let qrCodeUrl: string | undefined;
          try {
            const qrCodeBuffer = await QRCode.toBuffer(matricule, {
              width: 200,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' },
            });

            const qrCodeFile = {
              fieldname: 'qrCode',
              originalname: `qrcode-${matricule}.png`,
              encoding: '7bit',
              mimetype: 'image/png',
              buffer: qrCodeBuffer,
              size: qrCodeBuffer.length,
              stream: null,
              destination: '',
              filename: `qrcode-${matricule}.png`,
              path: '',
            } as Express.Multer.File;

            const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
            qrCodeUrl = qrCodeResult.url;
            this.logger.debug('Learner QR code uploaded');
          } catch (error) {
            this.logger.warn(`QR code génération échouée, on continue sans: ${error.message}`);
          }

          // 5. Upload photo (sans bloquer si erreur)
          let photoUrl: string | undefined = existingPhotoUrl;
          if (photoFile) {
            try {
              this.logger.debug('Uploading learner photo');
              const result = await this.cloudinary.uploadFile(photoFile, 'learners');
              photoUrl = result.url;
              this.logger.debug('Learner photo uploaded');
            } catch (error) {
              this.logger.error('Learner photo upload failed');
            }
          }

          // 6. Vérifier doublons
          const existingLearner = await prisma.learner.findFirst({
            where: {
              OR: [
                { phone: normalizedCreateLearnerDto.phone },
                { user: { email: { equals: normalizedCreateLearnerDto.email, mode: 'insensitive' } } },
              ],
            },
          });

          if (existingLearner) {
            throw new ConflictException(
              'Un apprenant avec cet email ou ce téléphone existe déjà',
            );
          }

          // 7. Générer mot de passe
          const password = AuthUtils.generatePassword();
          const hashedPassword = await AuthUtils.hashPassword(password);

          // 8. Créer l'apprenant
          const learner = await prisma.learner.create({
            data: {
              matricule,
              firstName: normalizedCreateLearnerDto.firstName,
              lastName: normalizedCreateLearnerDto.lastName,
              address: normalizedCreateLearnerDto.address,
              gender: normalizedCreateLearnerDto.gender as Gender,
              birthDate: new Date(normalizedCreateLearnerDto.birthDate),
              birthPlace: normalizedCreateLearnerDto.birthPlace,
              phone: normalizedCreateLearnerDto.phone,
              photoUrl,
              qrCode: qrCodeUrl,
              status: normalizedCreateLearnerDto.status || LearnerStatus.ACTIVE,
              user: {
                create: {
                  email: normalizedCreateLearnerDto.email,
                  password: hashedPassword,
                  role: 'APPRENANT',
                },
              },
              tutor: {
                create: {
                  firstName: normalizedCreateLearnerDto.tutor.firstName,
                  lastName: normalizedCreateLearnerDto.tutor.lastName,
                  phone: normalizedCreateLearnerDto.tutor.phone,
                  email: normalizedCreateLearnerDto.tutor.email || '',
                  address: normalizedCreateLearnerDto.tutor.address || '',
                },
              },
              promotion: { connect: { id: normalizedCreateLearnerDto.promotionId } },
              referential: normalizedCreateLearnerDto.refId
                ? { connect: { id: normalizedCreateLearnerDto.refId } }
                : undefined,
              kit: {
                create: {
                  laptop: false,
                  charger: false,
                  bag: false,
                  polo: false,
                },
              },
              session: normalizedCreateLearnerDto.sessionId
                ? { connect: { id: normalizedCreateLearnerDto.sessionId } }
                : undefined,
            },
            include: {
              user: { select: this.safeUserSelect },
              promotion: true,
              referential: true,
              tutor: true,
              kit: true,
              statusHistory: true,
              session: true,
            },
          });

          this.logger.log(`Learner created: ${learner.id}`);

          // 9. Historique de statut initial
          await prisma.learnerStatusHistory.create({
            data: {
              learnerId: learner.id,
              newStatus: learner.status,
              reason: 'Initial status on creation',
              date: new Date(),
            },
          });

          // 10. Email (sans bloquer si erreur)
          try {
            await this.emailService.sendLearnerApprovalEmail(normalizedCreateLearnerDto.email, password, {
              firstName: normalizedCreateLearnerDto.firstName,
              lastName: normalizedCreateLearnerDto.lastName,
              matricule: learner.matricule,
            });
            this.logger.debug('Learner onboarding email sent');
          } catch (emailError) {
            this.logger.error('Échec envoi email:', emailError.message);
          }

          return learner;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      // ✅ Repropager les erreurs HTTP NestJS correctement (ne pas les transformer en 500)
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Erreurs Prisma connues
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'champ';
        throw new ConflictException(`Ce ${field} est déjà utilisé`);
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          `Référence invalide: ${error.meta?.field_name || 'champ inconnu'}`,
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          error.meta?.cause || 'Enregistrement non trouvé',
        );
      }

      // Erreur inconnue — log complet + message lisible
      this.logger.error(`Unexpected learner creation error: ${error.message}`);

      throw new InternalServerErrorException(
        `Erreur lors de la création: ${error.message}`,
      );
    }
  }

  // ✅ Validation AVANT transaction pour avoir de vrais messages d'erreur 400
  private async validateBeforeCreate(dto: CreateLearnerDto): Promise<void> {
    // Vérifier champs obligatoires
    if (!dto.firstName?.trim()) throw new BadRequestException('Le prénom est requis');
    if (!dto.lastName?.trim()) throw new BadRequestException('Le nom est requis');
    if (!dto.email?.trim()) throw new BadRequestException("L'email est requis");
    if (!dto.phone?.trim()) throw new BadRequestException('Le téléphone est requis');
    if (!dto.promotionId?.trim()) throw new BadRequestException('La promotion est requise');
    if (!dto.birthDate) throw new BadRequestException('La date de naissance est requise');
    if (!dto.gender) throw new BadRequestException('Le genre est requis');

    // Vérifier tuteur
    if (!dto.tutor) throw new BadRequestException('Les informations du tuteur sont requises');
    if (!dto.tutor.firstName?.trim()) throw new BadRequestException('Le prénom du tuteur est requis');
    if (!dto.tutor.lastName?.trim()) throw new BadRequestException('Le nom du tuteur est requis');
    if (!dto.tutor.phone?.trim()) throw new BadRequestException('Le téléphone du tuteur est requis');

    // Vérifier genre valide
    if (!['MALE', 'FEMALE'].includes(dto.gender)) {
      throw new BadRequestException('Le genre doit être MALE ou FEMALE');
    }

    // Vérifier date valide
    const date = new Date(dto.birthDate);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('La date de naissance est invalide');
    }

    // ✅ Vérifier sessions disponibles pour le référentiel AVANT la transaction
    if (dto.refId) {
      const referential = await this.prisma.referential.findUnique({
        where: { id: dto.refId },
        include: { sessions: { select: { id: true, name: true, capacity: true } } },
      });

      const referentialClosureRows = await this.prisma.$queryRaw<
        Array<{ attendanceClosedAt: Date | null }>
      >(
        Prisma.sql`SELECT "attendanceClosedAt" FROM "Referential" WHERE id = ${dto.refId}`,
      );

      const isSessionBasedReferential = Boolean(referential && referential.numberOfSessions > 1);

      if (!isSessionBasedReferential && referentialClosureRows[0]?.attendanceClosedAt) {
        throw new BadRequestException(
          'Les inscriptions sont fermées pour ce référentiel.',
        );
      }

      if (isSessionBasedReferential && !dto.sessionId) {
        throw new BadRequestException(
          `Ce référentiel a plusieurs sessions. Veuillez spécifier un sessionId. ` +
          `Sessions disponibles: ${referential.sessions.map((s) => `${s.name} (id: ${s.id})`).join(', ')}`,
        );
      }

      if (isSessionBasedReferential && dto.sessionId) {
        const session = referential.sessions.find((item) => item.id === dto.sessionId);

        if (!session) {
          throw new BadRequestException('La session sélectionnée est invalide.');
        }

        const sessionClosureRows = await this.prisma.$queryRaw<
          Array<{ attendanceClosedAt: Date | null }>
        >(
          Prisma.sql`SELECT "attendanceClosedAt" FROM "Session" WHERE id = ${dto.sessionId}`,
        );

        if (sessionClosureRows[0]?.attendanceClosedAt) {
          throw new BadRequestException(
            `Les inscriptions sont fermées pour ${session.name}. Veuillez choisir une session ouverte.`,
          );
        }
      }
    }
  }

  // ==========================================
  // BULK CREATE
  // ==========================================
  async validateBulkCSV(csvContent: string): Promise<ValidationResponseDto> {
    try {
      const learners = this.parseCSV(csvContent);
      const errors: string[] = [];
      const validationErrors: ValidationError[] = [];
      let validRows = 0;

      for (let i = 0; i < learners.length; i++) {
        const learner = learners[i];
        const learnerErrors = await this.validateLearnerData(learner, i + 2);

        if (learnerErrors.length === 0) {
          validRows++;
        } else {
          learnerErrors.forEach((error) => {
            errors.push(error.message);
            validationErrors.push(error);
          });
        }
      }

      return {
        isValid: errors.length === 0,
        totalRows: learners.length,
        validRows,
        errors: errors.length > 0 ? errors : undefined,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };
    } catch (error) {
      this.logger.error('Error validating CSV:', error);
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errors: [`Erreur de parsing CSV: ${error.message}`],
      };
    }
  }

  async processBulkImport(csvContent: string, isDryRun = false): Promise<BulkImportResponseDto> {
    const learners = this.parseCSV(csvContent);

    if (isDryRun) {
      const validation = await this.validateBulkCSV(csvContent);
      return {
        totalProcessed: learners.length,
        successfulImports: validation.validRows,
        failedImports: learners.length - validation.validRows,
        results: learners.map((learner) => ({
          success: true,
          email: learner.email,
          firstName: learner.firstName,
          lastName: learner.lastName,
        })),
        summary: {
          duplicateEmails: 0,
          duplicatePhones: 0,
          sessionCapacityWarnings: 0,
          missingReferentials: 0,
          invalidData: learners.length - validation.validRows,
        },
      };
    }

    return await this.bulkCreateLearners(learners);
  }

  async bulkCreateLearners(learners: BulkCreateLearnerDto[]): Promise<BulkImportResponseDto> {
    const results: LearnerImportResultDto[] = [];
    let successCount = 0;
    let failCount = 0;

    const duplicateEmails = new Set<string>();
    const duplicatePhones = new Set<string>();
    let sessionCapacityWarnings = 0;
    let missingReferentials = 0;

    const emailsInBatch = new Set<string>();
    const phonesInBatch = new Set<string>();

    for (let i = 0; i < learners.length; i++) {
      const learner = this.normalizeBulkLearnerDto(learners[i]);
      this.logger.log(`Processing learner ${i + 1}/${learners.length}: ${learner.firstName} ${learner.lastName}`);

      try {
        if (emailsInBatch.has(learner.email)) {
          duplicateEmails.add(learner.email);
          throw new Error(`Email dupliqué dans le lot: ${learner.email}`);
        }

        if (phonesInBatch.has(learner.phone)) {
          duplicatePhones.add(learner.phone);
          throw new Error(`Téléphone dupliqué dans le lot: ${learner.phone}`);
        }

        emailsInBatch.add(learner.email);
        phonesInBatch.add(learner.phone);

        const validationErrors = await this.validateLearnerData(learner, i + 2);
        if (validationErrors.length > 0) {
          throw new Error(`Erreurs de validation: ${validationErrors.map((e) => e.message).join(', ')}`);
        }

        const existingLearner = await this.prisma.learner.findFirst({
          where: {
            OR: [
              { phone: learner.phone },
              { user: { email: { equals: learner.email, mode: 'insensitive' } } },
            ],
          },
          include: { user: { select: { email: true } } },
        });

        if (existingLearner) {
          if (normalizeEmail(existingLearner.user?.email) === learner.email) {
            duplicateEmails.add(learner.email);
          }
          if (existingLearner.phone === learner.phone) {
            duplicatePhones.add(learner.phone);
          }
          throw new Error('Un apprenant avec cet email ou téléphone existe déjà');
        }

        const promotion = await this.prisma.promotion.findUnique({
          where: { id: learner.promotionId },
          include: { referentials: true },
        });

        if (!promotion) {
          missingReferentials++;
          throw new Error(`Promotion introuvable: ${learner.promotionId}`);
        }

        const createdLearner = await this.createSingleLearner(learner);

        results.push({
          success: true,
          email: learner.email,
          firstName: learner.firstName,
          lastName: learner.lastName,
          learnerId: createdLearner.id,
          matricule: createdLearner.matricule,
          warnings: [],
        });

        successCount++;
      } catch (error) {
        this.logger.error(`Error creating learner ${learner.firstName} ${learner.lastName}:`, error);

        results.push({
          success: false,
          email: learner.email || 'N/A',
          firstName: learner.firstName,
          lastName: learner.lastName,
          error: error.message || 'Erreur inconnue',
        });

        failCount++;
      }
    }

    return {
      totalProcessed: learners.length,
      successfulImports: successCount,
      failedImports: failCount,
      results,
      summary: {
        duplicateEmails: duplicateEmails.size,
        duplicatePhones: duplicatePhones.size,
        sessionCapacityWarnings,
        missingReferentials,
        invalidData: failCount,
      },
    };
  }

  private async createSingleLearner(learnerData: BulkCreateLearnerDto): Promise<Learner> {
    const normalizedLearner = this.normalizeBulkLearnerDto(learnerData);

    return this.prisma.$transaction(
      async (prisma) => {
        const referential = normalizedLearner.refId
          ? await prisma.referential.findUnique({ where: { id: normalizedLearner.refId } })
          : null;

        const matricule = await MatriculeUtils.generateLearnerMatricule(
          prisma as PrismaClient,
          normalizedLearner.firstName,
          normalizedLearner.lastName,
          referential?.name,
        );

        if (!matricule) {
          throw new BadRequestException('Impossible de générer le matricule');
        }

        const password = AuthUtils.generatePassword();
        const hashedPassword = await AuthUtils.hashPassword(password);

        let qrCodeUrl: string | undefined;
        try {
          const qrCodeBuffer = await QRCode.toBuffer(matricule, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });

          const qrCodeFile = {
            fieldname: 'qrCode',
            originalname: `qrcode-${matricule}.png`,
            encoding: '7bit',
            mimetype: 'image/png',
            buffer: qrCodeBuffer,
            size: qrCodeBuffer.length,
            stream: null,
            destination: '',
            filename: `qrcode-${matricule}.png`,
            path: '',
          } as Express.Multer.File;

          const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
          qrCodeUrl = qrCodeResult.url;
        } catch (error) {
          this.logger.warn(`QR code génération échouée: ${error.message}`);
        }

        const learner = await prisma.learner.create({
          data: {
            matricule,
            firstName: normalizedLearner.firstName,
            lastName: normalizedLearner.lastName,
            address: normalizedLearner.address,
            gender: normalizedLearner.gender,
            birthDate: normalizedLearner.birthDate,
            birthPlace: normalizedLearner.birthPlace,
            phone: normalizedLearner.phone,
            qrCode: qrCodeUrl,
            status: normalizedLearner.status || LearnerStatus.ACTIVE,
            user: {
              create: {
                email: normalizedLearner.email,
                password: hashedPassword,
                role: 'APPRENANT',
              },
            },
            tutor: {
              create: {
                firstName: normalizedLearner.tutorFirstName,
                lastName: normalizedLearner.tutorLastName,
                phone: normalizedLearner.tutorPhone,
                email: normalizedLearner.tutorEmail,
                address: normalizedLearner.tutorAddress,
              },
            },
            promotion: { connect: { id: normalizedLearner.promotionId } },
            referential: normalizedLearner.refId
              ? { connect: { id: normalizedLearner.refId } }
              : undefined,
            kit: {
              create: {
                laptop: false,
                charger: false,
                bag: false,
                polo: false,
              },
            },
            session: normalizedLearner.sessionId
              ? { connect: { id: normalizedLearner.sessionId } }
              : undefined,
          },
          include: {
            user: { select: this.safeUserSelect },
            promotion: true,
            referential: true,
            tutor: true,
            kit: true,
            session: true,
          },
        });

        await prisma.learnerStatusHistory.create({
          data: {
            learnerId: learner.id,
            newStatus: learner.status,
            reason: 'Initial status on creation',
            date: new Date(),
          },
        });

        try {
          await this.emailService.sendLearnerApprovalEmail(normalizedLearner.email, password, {
            firstName: normalizedLearner.firstName,
            lastName: normalizedLearner.lastName,
            matricule: learner.matricule,
          });
        } catch (emailError) {
          this.logger.error('Échec envoi email:', emailError);
        }

        return learner;
      },
      { timeout: 30000 },
    );
  }

  async resendCredentialsByEmail(email: string): Promise<{ success: true; message: string }> {
    const normalizedEmail = normalizeEmail(email);

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      include: {
        learner: {
          select: {
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });

    if (!user || user.role !== 'APPRENANT' || !user.learner) {
      throw new NotFoundException(`Aucun apprenant trouvé avec l'email ${normalizedEmail}`);
    }

    const password = AuthUtils.generatePassword();
    const hashedPassword = await AuthUtils.hashPassword(password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    let emailSent = true;
    try {
      await this.emailService.sendLearnerApprovalEmail(normalizedEmail, password, {
        firstName: user.learner.firstName,
        lastName: user.learner.lastName,
        matricule: user.learner.matricule,
      });
    } catch (error) {
      this.logger.error(`Échec du renvoi des identifiants à ${normalizedEmail}:`, error);
      emailSent = false;
    }

    return {
      success: true,
      message: emailSent
        ? `Les identifiants ont été renvoyés à ${normalizedEmail}`
        : `Le mot de passe a été réinitialisé pour ${normalizedEmail}, mais l'email n'a pas pu être envoyé`,
    };
  }

  private async validateLearnerData(
    learner: BulkCreateLearnerDto,
    lineNumber: number,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const prefix = `Ligne ${lineNumber}:`;

    const requiredFields = [
      { field: 'firstName', label: 'Prénom' },
      { field: 'lastName', label: 'Nom' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Téléphone' },
      { field: 'address', label: 'Adresse' },
      { field: 'birthDate', label: 'Date de naissance' },
      { field: 'birthPlace', label: 'Lieu de naissance' },
      { field: 'promotionId', label: 'ID Promotion' },
      { field: 'tutorFirstName', label: 'Prénom tuteur' },
      { field: 'tutorLastName', label: 'Nom tuteur' },
      { field: 'tutorPhone', label: 'Téléphone tuteur' },
      { field: 'tutorAddress', label: 'Adresse tuteur' },
    ];

    requiredFields.forEach(({ field, label }) => {
      const value = learner[field as keyof BulkCreateLearnerDto];
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push({
          field,
          message: `${prefix} ${label} est requis`,
          value,
          line: lineNumber,
        });
      }
    });

    if (learner.email && !this.isValidEmail(learner.email)) {
      errors.push({
        field: 'email',
        message: `${prefix} Format d'email invalide`,
        value: learner.email,
        line: lineNumber,
      });
    }

    if (learner.gender && !['MALE', 'FEMALE', 'OTHER'].includes(learner.gender)) {
      errors.push({
        field: 'gender',
        message: `${prefix} Genre invalide (MALE, FEMALE, OTHER attendu)`,
        value: learner.gender,
        line: lineNumber,
      });
    }

    if (learner.birthDate) {
      const birthDateStr =
        learner.birthDate instanceof Date
          ? learner.birthDate.toISOString()
          : learner.birthDate;

      if (!this.isValidDate(birthDateStr)) {
        errors.push({
          field: 'birthDate',
          message: `${prefix} Date de naissance invalide`,
          value: learner.birthDate,
          line: lineNumber,
        });
      }
    }

    return errors;
  }

  private parseCSV(csvContent: string): BulkCreateLearnerDto[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("Le fichier CSV doit contenir au moins une ligne d'en-têtes et une ligne de données");
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const learners: BulkCreateLearnerDto[] = [];

    const columnMapping: { [key: string]: number } = {};
    const expectedHeaders = {
      firstName: ['firstName', 'prenom', 'prénom', 'first_name'],
      lastName: ['lastName', 'nom', 'last_name'],
      email: ['email', 'mail', 'e-mail'],
      phone: ['phone', 'telephone', 'téléphone', 'tel'],
      address: ['address', 'adresse'],
      gender: ['gender', 'genre', 'sexe'],
      birthDate: ['birthDate', 'dateNaissance', 'date_naissance', 'birth_date'],
      birthPlace: ['birthPlace', 'lieuNaissance', 'lieu_naissance', 'birth_place'],
      promotionId: ['promotionId', 'promotion', 'promotion_id'],
      refId: ['refId', 'referentiel', 'referential', 'ref_id'],
      sessionId: ['sessionId', 'session', 'session_id'],
      status: ['status', 'statut'],
      tutorFirstName: ['tutorFirstName', 'prenomTuteur', 'prenom_tuteur', 'tutor_first_name'],
      tutorLastName: ['tutorLastName', 'nomTuteur', 'nom_tuteur', 'tutor_last_name'],
      tutorPhone: ['tutorPhone', 'telephoneTuteur', 'telephone_tuteur', 'tutor_phone'],
      tutorAddress: ['tutorAddress', 'adresseTuteur', 'adresse_tuteur', 'tutor_address'],
      tutorEmail: ['tutorEmail', 'emailTuteur', 'email_tuteur', 'tutor_email'],
    };

    Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
      const headerIndex = headers.findIndex((header) =>
        possibleNames.some((name) => header.toLowerCase() === name.toLowerCase()),
      );
      if (headerIndex !== -1) {
        columnMapping[field] = headerIndex;
      }
    });

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));

      if (values.every((v) => !v)) continue;

      const learner: Partial<BulkCreateLearnerDto> = {};

      Object.entries(columnMapping).forEach(([field, index]) => {
        const value = values[index]?.trim();
        if (value) {
          (learner as any)[field] = field === 'email' || field === 'tutorEmail'
            ? normalizeEmail(value)
            : value;
        }
      });

      if (learner.gender) {
        learner.gender = learner.gender.toUpperCase() as Gender;
      }

      learners.push(learner as BulkCreateLearnerDto);
    }

    return learners;
  }

  generateCSVTemplate(): string {
    const headers = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'gender',
      'birthDate', 'birthPlace', 'promotionId', 'refId', 'sessionId',
      'tutorFirstName', 'tutorLastName', 'tutorPhone', 'tutorAddress', 'tutorEmail',
    ];

    const sampleData = [
      [
        'Marie', 'Dupont', 'marie.dupont@email.com', '+33123456789',
        '123 Rue de la Paix, Paris', 'FEMALE', '2000-05-15', 'Paris',
        'PROMO2024A', 'REF001', 'SESSION001', 'Jean', 'Dupont', '+33987654321',
        '123 Rue de la Paix, Paris', 'jean.dupont@email.com',
      ],
    ];

    return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date < new Date();
  }

  // ==========================================
  // AUTRES MÉTHODES
  // ==========================================
  async regenerateQrCode(learnerId: string): Promise<string> {
    const learner = await this.findOne(learnerId);

    try {
      const qrCodeBuffer = await QRCode.toBuffer(learner.matricule, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      const qrCodeFile = {
        fieldname: 'qrCode',
        originalname: `qrcode-${learner.matricule}.png`,
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: qrCodeBuffer,
        size: qrCodeBuffer.length,
        stream: null,
        destination: '',
        filename: `qrcode-${learner.matricule}.png`,
        path: '',
      } as Express.Multer.File;

      const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');

      await this.prisma.learner.update({
        where: { id: learnerId },
        data: { qrCode: qrCodeResult.url },
      });

      return qrCodeResult.url;
    } catch (error) {
      this.logger.error('Échec régénération QR code:', error);
      throw new BadRequestException(`Échec régénération QR code: ${error.message}`);
    }
  }

  async findAll(currentUser?: { id?: string; role?: UserRole | string }) {
    const where: Prisma.LearnerWhereInput = {};

    if (currentUser?.role === UserRole.COACH && currentUser.id) {
      const coach = await this.prisma.coach.findUnique({
        where: { userId: currentUser.id },
        select: {
          referentials: {
            select: { id: true },
          },
        },
      });

      const referentialIds = coach?.referentials.map((referential) => referential.id) ?? [];

      if (referentialIds.length === 0) {
        return [];
      }

      where.refId = { in: referentialIds };
    }

    return this.prisma.learner.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        phone: true,
        photoUrl: true,
        status: true,
        qrCode: true,
        userId: true,
        refId: true,
        promotionId: true,
        createdAt: true,
        updatedAt: true,
        matricule: true,
        sessionId: true,
        user: { select: this.safeUserSelect },
        referential: true,
        promotion: true,
        session: true,
        tutor: true,
        kit: true,
        attendances: true,
        grades: true,
      },
    });
  }

  async findReferenceList(query: LearnersReferenceQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.LearnerWhereInput = {
      ...(query.promotionId ? { promotionId: query.promotionId } : {}),
      ...(query.refId ? { refId: query.refId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { matricule: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.learner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          matricule: true,
          phone: true,
          status: true,
          user: {
            select: {
              email: true,
            },
          },
          promotion: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          referential: {
            select: {
              id: true,
              name: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.learner.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string): Promise<Learner> {
    const learner = await this.prisma.learner.findUnique({
      where: { id },
      include: {
        user: { select: this.safeUserSelect },
        referential: true,
        promotion: true,
        tutor: true,
        kit: true,
        attendances: true,
        grades: true,
        documents: true,
      },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant non trouvé');
    }

    return learner;
  }

  async findByEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return [];
    }
    const learners = await this.prisma.learner.findMany({
      where: {
        user: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        phone: true,
        photoUrl: true,
        status: true,
        qrCode: true,
        matricule: true,
        user: {
          select: {
            email: true,
          },
        },
        referential: {
          select: {
            id: true,
            name: true,
          },
        },
        promotion: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
        tutor: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            address: true,
          },
        },
        kit: {
          select: {
            laptop: true,
            charger: true,
            bag: true,
            polo: true,
          },
        },
      },
    });

    const learner =
      learners.find((item) => item.status === 'ACTIVE') ??
      learners.find((item) => item.status === 'REPLACEMENT') ??
      learners[0];

    if (!learner) {
      throw new NotFoundException(`Aucun apprenant trouvé avec l'email ${email}`);
    }

    return learner;
  }

  async findByMatricule(mat: string) {
    const learner = await this.prisma.learner.findFirst({
      where: { matricule: mat },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        matricule: true,
        status: true,
        referential: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        promotion: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException(`Aucun apprenant trouvé avec le matricule ${mat}`);
    }

    const enrollmentDate = learner.promotion?.startDate ?? new Date();
    const currentYear = new Date().getFullYear();
    const enrollmentYear = new Date(enrollmentDate).getFullYear();
    const computedYear = Math.max(1, currentYear - enrollmentYear + 1);

    return {
      id: learner.id,
      firstName: learner.firstName,
      lastName: learner.lastName,
      photoUrl: learner.photoUrl,
      photo: learner.photoUrl,
      matricule: learner.matricule,
      studentNumber: learner.matricule,
      program: learner.referential?.name ?? 'N/A',
      year: computedYear,
      status:
        learner.status === LearnerStatus.ABANDONED ||
        learner.status === LearnerStatus.REPLACED ||
        learner.status === LearnerStatus.WAITING
            ? 'inactive'
            : 'active',
      enrollmentDate: enrollmentDate.toISOString(),
      referential: learner.referential,
      promotion: learner.promotion
        ? {
            id: learner.promotion.id,
            name: learner.promotion.name,
            startDate: learner.promotion.startDate,
          }
        : null,
    };
  }

  async update(
    id: string,
    data: Partial<Learner> & {
      tutor?: Partial<{
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
        address: string | null;
      }>;
    },
  ): Promise<Learner> {
    const learner = await this.findOne(id);

    const normalizedData: Prisma.LearnerUpdateInput = {};

    if (typeof data.firstName === 'string') {
      const firstName = data.firstName.trim();
      if (!firstName) {
        throw new BadRequestException('Le prénom ne peut pas être vide');
      }
      normalizedData.firstName = firstName;
    }

    if (typeof data.lastName === 'string') {
      const lastName = data.lastName.trim();
      if (!lastName) {
        throw new BadRequestException('Le nom ne peut pas être vide');
      }
      normalizedData.lastName = lastName;
    }

    if (typeof data.phone === 'string') {
      normalizedData.phone = data.phone.trim();
    }

    if (typeof data.address === 'string') {
      normalizedData.address = data.address.trim();
    }

    if (typeof data.birthPlace === 'string') {
      normalizedData.birthPlace = data.birthPlace.trim();
    }

    if (data.gender !== undefined) {
      const normalizedGender =
        typeof data.gender === 'string' ? data.gender.trim().toUpperCase() : data.gender;

      if (!Object.values(Gender).includes(normalizedGender as Gender)) {
        throw new BadRequestException('Le genre doit être MALE ou FEMALE');
      }

      normalizedData.gender = normalizedGender as Gender;
    }

    if (data.birthDate !== undefined) {
      const birthDate = data.birthDate instanceof Date ? data.birthDate : new Date(data.birthDate);

      if (Number.isNaN(birthDate.getTime())) {
        throw new BadRequestException('La date de naissance est invalide');
      }

      normalizedData.birthDate = birthDate;
    }

    if (data.tutor && typeof data.tutor === 'object') {
      const tutorUpdateData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string | null;
        address?: string | null;
      } = {};

      if (typeof data.tutor.firstName === 'string') {
        const firstName = data.tutor.firstName.trim();
        if (!firstName) {
          throw new BadRequestException('Le prénom du tuteur ne peut pas être vide');
        }
        tutorUpdateData.firstName = firstName;
      }

      if (typeof data.tutor.lastName === 'string') {
        const lastName = data.tutor.lastName.trim();
        if (!lastName) {
          throw new BadRequestException('Le nom du tuteur ne peut pas être vide');
        }
        tutorUpdateData.lastName = lastName;
      }

      if (typeof data.tutor.phone === 'string') {
        const phone = data.tutor.phone.trim();
        if (!phone) {
          throw new BadRequestException('Le téléphone du tuteur ne peut pas être vide');
        }
        tutorUpdateData.phone = phone;
      }

      if (data.tutor.email !== undefined) {
        tutorUpdateData.email =
          typeof data.tutor.email === 'string'
            ? normalizeEmailOrUndefined(data.tutor.email) ?? null
            : null;
      }

      if (data.tutor.address !== undefined) {
        tutorUpdateData.address =
          typeof data.tutor.address === 'string' ? data.tutor.address.trim() || null : null;
      }

      const hasTutorUpdates = Object.keys(tutorUpdateData).length > 0;
      const currentTutor = (learner as Learner & {
        tutor?: {
          firstName: string;
          lastName: string;
          phone: string;
          email?: string | null;
          address?: string | null;
        } | null;
      }).tutor;

      if (hasTutorUpdates) {
        if (currentTutor) {
          normalizedData.tutor = { update: tutorUpdateData };
        } else {
          const firstName = tutorUpdateData.firstName;
          const lastName = tutorUpdateData.lastName;
          const phone = tutorUpdateData.phone;

          if (!firstName || !lastName || !phone) {
            throw new BadRequestException('Le prénom, le nom et le téléphone du tuteur sont requis');
          }

          normalizedData.tutor = {
            create: {
              firstName,
              lastName,
              phone,
              email: tutorUpdateData.email ?? null,
              address: tutorUpdateData.address ?? null,
            },
          };
        }
      }
    }

    return this.prisma.learner.update({
      where: { id },
      data: normalizedData,
      include: {
        user: { select: this.safeUserSelect },
        referential: true,
        promotion: true,
        tutor: true,
        kit: true,
      },
    });
  }

  async updateStatus(id: string, status: LearnerStatus): Promise<Learner> {
    await this.findOne(id);

    return this.prisma.learner.update({
      where: { id },
      data: { status },
      include: {
        user: { select: this.safeUserSelect },
        referential: true,
        promotion: true,
      },
    });
  }

  async updateKit(
    id: string,
    kitData: { laptop?: boolean; charger?: boolean; bag?: boolean; polo?: boolean },
  ): Promise<Learner> {
    const learner = await this.findOne(id);

    const normalizedKitData = {
      laptop: kitData.laptop ?? Boolean((learner as Learner & { kit?: { laptop?: boolean } | null }).kit?.laptop),
      charger: kitData.charger ?? Boolean((learner as Learner & { kit?: { charger?: boolean } | null }).kit?.charger),
      bag: kitData.bag ?? Boolean((learner as Learner & { kit?: { bag?: boolean } | null }).kit?.bag),
      polo: kitData.polo ?? Boolean((learner as Learner & { kit?: { polo?: boolean } | null }).kit?.polo),
    };

    return this.prisma.learner.update({
      where: { id },
      data: {
        kit: {
          upsert: {
            create: normalizedKitData,
            update: normalizedKitData,
          },
        },
      },
      include: {
        user: { select: this.safeUserSelect },
        referential: true,
        promotion: true,
        tutor: true,
        kit: true,
      },
    });
  }

  async uploadDocument(id: string, file: Express.Multer.File, type: string, name: string) {
    await this.findOne(id);

    let documentUrl: string | undefined;

    try {
      const result = await this.cloudinary.uploadFile(file, 'documents');
      documentUrl = result.url;
    } catch (cloudinaryError) {
      this.logger.error('Cloudinary document upload failed:', cloudinaryError);

      try {
        if (!fs.existsSync('./uploads/documents')) {
          fs.mkdirSync('./uploads/documents', { recursive: true });
        }
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = file.originalname.split('.').pop();
        const filename = `${uniquePrefix}.${extension}`;
        const filepath = `./uploads/documents/${filename}`;
        fs.writeFileSync(filepath, file.buffer);
        documentUrl = `uploads/documents/${filename}`;
      } catch (localError) {
        this.logger.error('Local storage fallback failed:', localError);
        throw new BadRequestException('Échec upload document');
      }
    }

    return this.prisma.document.create({
      data: { name, type, url: documentUrl, learnerId: id },
    });
  }

  async getAttendanceStats(id: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        promotionId: true,
        refId: true,
        sessionId: true,
        statusHistory: {
          where: {
            newStatus: LearnerStatus.REPLACEMENT,
          },
          orderBy: {
            date: 'asc',
          },
          select: {
            date: true,
            newStatus: true,
          },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException('Apprenant non trouvé');
    }

    const learnerAttendanceStartDateMap =
      await this.getLearnerAttendanceStartDateMap([learner.id]);
    const attendanceWindow = await this.getLearnerAttendanceWindow({
      ...learner,
      attendanceStartDate:
        learnerAttendanceStartDateMap.get(learner.id) ?? null,
    });

    const cohortLearners = await this.prisma.learner.findMany({
      where: {
        promotionId: learner.promotionId,
        ...(learner.sessionId
          ? { sessionId: learner.sessionId }
          : learner.refId
            ? { refId: learner.refId }
            : {}),
        status: {
          in: ['ACTIVE', 'REPLACEMENT'],
        },
      },
      select: {
        id: true,
      },
    });

    const cohortAttendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        learnerId: {
          in: cohortLearners.map((cohortLearner) => cohortLearner.id),
        },
      },
      select: {
        learnerId: true,
        date: true,
        isPresent: true,
        isLate: true,
        status: true,
      },
    });

    const blockedAttendanceDays = await this.getBlockedAttendanceDayKeys(
      learner.promotionId,
      cohortAttendanceRecords.map((record) => record.date),
    );

    const cohortExpectedDays = attendanceWindow.shouldCountAttendance
      ? new Set(
          cohortAttendanceRecords
            .filter(
              (record) =>
                this.isInstructionDay(record.date) &&
                !blockedAttendanceDays.has(this.getAttendanceDayKey(record.date)) &&
                this.isAttendanceOnOrAfterStart(record.date, attendanceWindow.startDate),
            )
            .map((record) => this.getAttendanceDayKey(record.date))
        )
      : new Set<string>();

    const learnerAttendanceRecords = attendanceWindow.shouldCountAttendance
      ? cohortAttendanceRecords.filter(
          (record) =>
            record.learnerId === id &&
            this.isInstructionDay(record.date) &&
            !blockedAttendanceDays.has(this.getAttendanceDayKey(record.date)),
        )
      : [];
    const expectedDays = new Set([
      ...cohortExpectedDays,
      ...learnerAttendanceRecords.map((record) =>
        this.getAttendanceDayKey(record.date),
      ),
    ]);

    const attendedDays = new Set(
      learnerAttendanceRecords
        .filter((record) => record.isPresent)
        .map((record) => this.getAttendanceDayKey(record.date))
    );

    const lateDays = new Set(
      learnerAttendanceRecords
        .filter((record) => record.isPresent && record.isLate)
        .map((record) => this.getAttendanceDayKey(record.date))
    );

    const justifiedAbsentDays = new Set(
      learnerAttendanceRecords
        .filter((record) => !record.isPresent && record.status === 'APPROVED')
        .map((record) => this.getAttendanceDayKey(record.date))
    );

    const totalDays = expectedDays.size;
    const presentDays = attendedDays.size;
    const absentDays = Math.max(totalDays - presentDays, 0);
    const justifiedAbsenceDays = Math.min(justifiedAbsentDays.size, absentDays);
    const unjustifiedAbsentDays = Math.max(absentDays - justifiedAbsenceDays, 0);

    return {
      totalDays,
      presentDays,
      lateDays: lateDays.size,
      absentDays,
      justifiedAbsentDays: justifiedAbsenceDays,
      unjustifiedAbsentDays,
      attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
    };
  }

  async updateLearnerStatus(learnerId: string, updateStatusDto: UpdateStatusDto): Promise<Learner> {
    const learner = await this.findOne(learnerId);

    return this.prisma.$transaction(async (prisma) => {
      await prisma.learnerStatusHistory.create({
        data: {
          learnerId,
          previousStatus: learner.status,
          newStatus: updateStatusDto.status,
          reason: updateStatusDto.reason,
        },
      });

      return prisma.learner.update({
        where: { id: learnerId },
        data: { status: updateStatusDto.status },
        include: {
          user: { select: this.safeUserSelect },
          promotion: true,
          referential: true,
          statusHistory: true,
        },
      });
    });
  }

  async replaceLearner(replacementDto: ReplaceLearnerDto): Promise<{
    replacedLearner: Learner;
    replacementLearner: Learner;
  }> {
    const { activeLearnerForReplacement, replacementLearnerId, reason } = replacementDto;

    return this.prisma.$transaction(async (prisma) => {
      const activeLearner = await prisma.learner.findUnique({
        where: { id: activeLearnerForReplacement },
        include: { promotion: true },
      });

      if (!activeLearner || activeLearner.status !== 'ACTIVE') {
        throw new ConflictException("Apprenant actif invalide ou n'est pas actif");
      }

      const waitingLearner = await prisma.learner.findUnique({
        where: { id: replacementLearnerId },
      });

      if (!waitingLearner || waitingLearner.status !== 'WAITING') {
        throw new ConflictException("Apprenant de remplacement invalide ou n'est pas en liste d'attente");
      }

      const replacedLearner = await prisma.learner.update({
        where: { id: activeLearnerForReplacement },
        data: {
          status: 'REPLACED',
          statusHistory: {
            create: {
              previousStatus: 'ACTIVE',
              newStatus: 'REPLACED',
              reason,
              date: new Date(),
            },
          },
        },
        include: { promotion: true },
      });

      const replacementLearner = await prisma.learner.update({
        where: { id: replacementLearnerId },
        data: {
          status: 'REPLACEMENT',
          promotionId: activeLearner.promotionId,
          statusHistory: {
            create: {
              previousStatus: 'WAITING',
              newStatus: 'REPLACEMENT',
              reason,
              date: new Date(),
            },
          },
        },
        include: { promotion: true },
      });

      return { replacedLearner, replacementLearner };
    });
  }

  async getWaitingList(promotionId?: string): Promise<Learner[]> {
    try {
      if (promotionId) {
        const promotionExists = await this.prisma.promotion.findUnique({
          where: { id: promotionId },
        });

        if (!promotionExists) {
          throw new NotFoundException(`Promotion ${promotionId} introuvable`);
        }
      }

      return this.prisma.learner.findMany({
        where: {
          status: 'WAITING',
          ...(promotionId && { promotionId }),
        },
        include: {
          user: { select: this.safeUserSelect },
          promotion: true,
          referential: { include: { sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching waiting list:', error);
      throw error;
    }
  }

  async getStatusHistory(learnerId: string) {
    return this.prisma.learnerStatusHistory.findMany({
      where: { learnerId },
      orderBy: { date: 'desc' },
    });
  }

  async getDocuments(learnerId: string) {
    await this.findOne(learnerId);

    return this.prisma.document.findMany({
      where: { learnerId },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttendanceByLearner(learnerId: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        statusHistory: {
          where: {
            newStatus: LearnerStatus.REPLACEMENT,
          },
          orderBy: {
            date: 'asc',
          },
          select: {
            date: true,
            newStatus: true,
          },
        },
        referential: {
          select: {
            id: true,
            name: true,
          },
        },
        promotion: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException(`Apprenant ${learnerId} introuvable`);
    }

    const learnerAttendanceStartDateMap =
      await this.getLearnerAttendanceStartDateMap([learner.id]);
    const attendanceWindow = await this.getLearnerAttendanceWindow({
      ...learner,
      attendanceStartDate:
        learnerAttendanceStartDateMap.get(learner.id) ?? null,
    });

    const cohortLearners = await this.prisma.learner.findMany({
      where: {
        promotionId: learner.promotionId,
        ...(learner.sessionId
          ? { sessionId: learner.sessionId }
          : learner.refId
            ? { refId: learner.refId }
            : {}),
        status: {
          in: [LearnerStatus.ACTIVE, LearnerStatus.REPLACEMENT],
        },
      },
      select: {
        id: true,
      },
    });

    const cohortAttendanceRecords = await this.prisma.learnerAttendance.findMany({
      where: {
        learnerId: {
          in: cohortLearners.map((cohortLearner) => cohortLearner.id),
        },
      },
      include: {
        learner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            photoUrl: true,
            referential: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const learnerRecordsByDay = new Map<string, (typeof cohortAttendanceRecords)[number]>();

    for (const record of cohortAttendanceRecords) {
      if (
        record.learnerId !== learnerId ||
        !attendanceWindow.shouldCountAttendance ||
        !this.isInstructionDay(record.date)
      ) {
        continue;
      }

      const shouldKeepHistoricalRecord =
        record.isPresent || Boolean(record.scanTime);

      if (
        !shouldKeepHistoricalRecord &&
        !this.isAttendanceOnOrAfterStart(record.date, attendanceWindow.startDate)
      ) {
        continue;
      }

      const dateKey = this.getAttendanceDayKey(record.date);
      const existingRecord = learnerRecordsByDay.get(dateKey);

      if (!existingRecord) {
        learnerRecordsByDay.set(dateKey, record);
        continue;
      }

      const currentUpdatedAt = record.updatedAt?.getTime?.() ?? record.date.getTime();
      const existingUpdatedAt = existingRecord.updatedAt?.getTime?.() ?? existingRecord.date.getTime();

      if (currentUpdatedAt > existingUpdatedAt) {
        learnerRecordsByDay.set(dateKey, record);
      }
    }

    const learnerRecords = Array.from(learnerRecordsByDay.values());
    const learnerDates = new Set(
      learnerRecords.map((record) => this.getAttendanceDayKey(record.date)),
    );

    const blockedAttendanceDays = await this.getBlockedAttendanceDayKeys(
      learner.promotionId,
      cohortAttendanceRecords.map((record) => record.date),
    );

    const expectedDates = attendanceWindow.shouldCountAttendance
      ? Array.from(
          new Set(
            cohortAttendanceRecords
              .filter(
                (record) =>
                  this.isInstructionDay(record.date) &&
                  !blockedAttendanceDays.has(this.getAttendanceDayKey(record.date)) &&
                  this.isAttendanceOnOrAfterStart(record.date, attendanceWindow.startDate),
              )
              .map((record) => this.getAttendanceDayKey(record.date))
          ),
        )
      : [];

    const generatedAbsentRecords = expectedDates
      .filter((dateKey) => !learnerDates.has(dateKey))
      .map((dateKey) => ({
        id: `absent-${learnerId}-${dateKey}`,
        learnerId,
        date: new Date(dateKey),
        scanTime: null,
        isPresent: false,
        isLate: false,
        status: AbsenceStatus.TO_JUSTIFY,
        justification: null,
        documentUrl: null,
        justificationComment: null,
        createdAt: new Date(dateKey),
        updatedAt: new Date(dateKey),
        learner: {
          id: learner.id,
          firstName: learner.firstName,
          lastName: learner.lastName,
          matricule: learner.matricule,
          photoUrl: learner.photoUrl,
          referential: learner.referential
            ? {
                id: learner.referential.id,
                name: learner.referential.name,
              }
            : null,
        },
      }));

    return [...learnerRecords, ...generatedAbsentRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
async updatePhoto(id: string, photoFile: Express.Multer.File): Promise<{ photoUrl: string }> {
  await this.findOne(id);

  const result = await this.cloudinary.uploadFile(photoFile, 'learners');

  await this.prisma.learner.update({
    where: { id },
    data: { photoUrl: result.url },
  });

  return { photoUrl: result.url };
}
}
