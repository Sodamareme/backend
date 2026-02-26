import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Gender, Learner, LearnerStatus, PrismaClient } from '@prisma/client';
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

@Injectable()
export class LearnersService {
  private readonly logger = new Logger(LearnersService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private emailService: EmailService,
  ) {}

  // ==========================================
  // CRÉATION D'UN APPRENANT
  // ==========================================
  async create(
    createLearnerDto: CreateLearnerDto,
    photoFile?: Express.Multer.File,
  ): Promise<Learner> {
    this.logger.log('=== SERVICE CREATE - données reçues ===');
    this.logger.log(`firstName: ${createLearnerDto.firstName}`);
    this.logger.log(`tutor: ${JSON.stringify(createLearnerDto.tutor)}`);
    this.logger.log(`promotionId: ${createLearnerDto.promotionId}`);
    this.logger.log(`refId: ${createLearnerDto.refId}`);
    this.logger.log(`sessionId: ${createLearnerDto.sessionId}`);
    this.logger.log(`birthDate: ${createLearnerDto.birthDate}`);

    // ✅ Validation préalable AVANT la transaction pour avoir de vrais messages d'erreur
    await this.validateBeforeCreate(createLearnerDto);

    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          // 1. Vérifier la promotion
          const promotion = await prisma.promotion.findUnique({
            where: { id: createLearnerDto.promotionId },
            include: { referentials: true },
          });

          if (!promotion) {
            throw new NotFoundException('Promotion introuvable');
          }

          // 2. Vérifier le référentiel si fourni
          if (createLearnerDto.refId) {
            const referentialExists = promotion.referentials.some(
              (ref) => ref.id === createLearnerDto.refId,
            );

            if (!referentialExists) {
              throw new BadRequestException(
                `Le référentiel ${createLearnerDto.refId} n'est pas associé à la promotion ${promotion.name}`,
              );
            }

            const referential = await prisma.referential.findUnique({
              where: { id: createLearnerDto.refId },
              include: {
                sessions: { select: { id: true, name: true, capacity: true } },
              },
            });

            if (!referential) {
              throw new NotFoundException('Référentiel introuvable');
            }

            // ✅ Vérification sessions
            if (referential.numberOfSessions > 1) {
              if (!createLearnerDto.sessionId) {
                throw new BadRequestException(
                  `Ce référentiel a plusieurs sessions. Veuillez spécifier un sessionId. Sessions disponibles: ${referential.sessions.map((s) => `${s.name} (${s.id})`).join(', ')}`,
                );
              }

              const session = referential.sessions.find(
                (s) => s.id === createLearnerDto.sessionId,
              );

              if (!session) {
                throw new BadRequestException(
                  `Session invalide. Sessions disponibles: ${referential.sessions.map((s) => s.name).join(', ')}`,
                );
              }

              const sessionLearnerCount = await prisma.learner.count({
                where: { sessionId: createLearnerDto.sessionId },
              });

              if (sessionLearnerCount >= session.capacity) {
                throw new BadRequestException(
                  `La session ${session.name} a atteint sa capacité maximale de ${session.capacity} apprenants`,
                );
              }
            } else if (createLearnerDto.sessionId) {
              throw new BadRequestException(
                'Un sessionId ne doit pas être fourni pour un référentiel à session unique',
              );
            }
          }

          // 3. Générer le matricule
          const referential = createLearnerDto.refId
            ? await prisma.referential.findUnique({
                where: { id: createLearnerDto.refId },
              })
            : null;

          const matricule = await MatriculeUtils.generateLearnerMatricule(
            prisma as PrismaClient,
            createLearnerDto.firstName,
            createLearnerDto.lastName,
            referential?.name,
          );

          if (!matricule) {
            throw new BadRequestException('Impossible de générer le matricule');
          }

          this.logger.log(`Matricule généré: ${matricule}`);

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
            this.logger.log(`QR code uploadé: ${qrCodeUrl}`);
          } catch (error) {
            this.logger.warn(`QR code génération échouée, on continue sans: ${error.message}`);
          }

          // 5. Upload photo (sans bloquer si erreur)
          let photoUrl: string | undefined;
         if (photoFile) {
  try {
    this.logger.log(`=== UPLOAD PHOTO === size: ${photoFile.size}, type: ${photoFile.mimetype}`);
    const result = await this.cloudinary.uploadFile(photoFile, 'learners');
    photoUrl = result.url;
    this.logger.log(`=== PHOTO URL === ${photoUrl}`);
  } catch (error) {
    this.logger.error(`=== PHOTO UPLOAD ÉCHOUÉE ===`);
    this.logger.error(`Message: ${error.message}`);
    this.logger.error(`Stack: ${error.stack}`);
  }
}

          // 6. Vérifier doublons
          const existingLearner = await prisma.learner.findFirst({
            where: {
              OR: [
                { phone: createLearnerDto.phone },
                { user: { email: createLearnerDto.email } },
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
              firstName: createLearnerDto.firstName,
              lastName: createLearnerDto.lastName,
              address: createLearnerDto.address,
              gender: createLearnerDto.gender as Gender,
              birthDate: new Date(createLearnerDto.birthDate),
              birthPlace: createLearnerDto.birthPlace,
              phone: createLearnerDto.phone,
              photoUrl,
              qrCode: qrCodeUrl,
              status: createLearnerDto.status || LearnerStatus.ACTIVE,
              user: {
                create: {
                  email: createLearnerDto.email,
                  password: hashedPassword,
                  role: 'APPRENANT',
                },
              },
              tutor: {
                create: {
                  firstName: createLearnerDto.tutor.firstName,
                  lastName: createLearnerDto.tutor.lastName,
                  phone: createLearnerDto.tutor.phone,
                  email: createLearnerDto.tutor.email || '',
                  address: createLearnerDto.tutor.address || '',
                },
              },
              promotion: { connect: { id: createLearnerDto.promotionId } },
              referential: createLearnerDto.refId
                ? { connect: { id: createLearnerDto.refId } }
                : undefined,
              kit: {
                create: {
                  laptop: false,
                  charger: false,
                  bag: false,
                  polo: false,
                },
              },
              session: createLearnerDto.sessionId
                ? { connect: { id: createLearnerDto.sessionId } }
                : undefined,
            },
            include: {
              user: true,
              promotion: true,
              referential: true,
              tutor: true,
              kit: true,
              statusHistory: true,
              session: true,
            },
          });

          this.logger.log(`Apprenant créé: ${learner.id} - ${learner.matricule}`);

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
            await AuthUtils.sendPasswordEmail(
              createLearnerDto.email,
              password,
              'Apprenant',
            );
            this.logger.log(`Email envoyé à: ${createLearnerDto.email}`);
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
      this.logger.error('=== ERREUR INATTENDUE CREATE LEARNER ===');
      this.logger.error(`Type: ${error.constructor.name}`);
      this.logger.error(`Message: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

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

      if (referential && referential.numberOfSessions > 1 && !dto.sessionId) {
        throw new BadRequestException(
          `Ce référentiel a plusieurs sessions. Veuillez spécifier un sessionId. ` +
          `Sessions disponibles: ${referential.sessions.map((s) => `${s.name} (id: ${s.id})`).join(', ')}`,
        );
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
      const learner = learners[i];
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
              { user: { email: learner.email } },
            ],
          },
          include: { user: { select: { email: true } } },
        });

        if (existingLearner) {
          if (existingLearner.user?.email === learner.email) {
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
    return this.prisma.$transaction(
      async (prisma) => {
        const referential = learnerData.refId
          ? await prisma.referential.findUnique({ where: { id: learnerData.refId } })
          : null;

        const matricule = await MatriculeUtils.generateLearnerMatricule(
          prisma as PrismaClient,
          learnerData.firstName,
          learnerData.lastName,
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
            firstName: learnerData.firstName,
            lastName: learnerData.lastName,
            address: learnerData.address,
            gender: learnerData.gender,
            birthDate: learnerData.birthDate,
            birthPlace: learnerData.birthPlace,
            phone: learnerData.phone,
            qrCode: qrCodeUrl,
            status: learnerData.status || LearnerStatus.ACTIVE,
            user: {
              create: {
                email: learnerData.email,
                password: hashedPassword,
                role: 'APPRENANT',
              },
            },
            tutor: {
              create: {
                firstName: learnerData.tutorFirstName,
                lastName: learnerData.tutorLastName,
                phone: learnerData.tutorPhone,
                email: learnerData.tutorEmail,
                address: learnerData.tutorAddress,
              },
            },
            promotion: { connect: { id: learnerData.promotionId } },
            referential: learnerData.refId
              ? { connect: { id: learnerData.refId } }
              : undefined,
            kit: {
              create: {
                laptop: false,
                charger: false,
                bag: false,
                polo: false,
              },
            },
            session: learnerData.sessionId
              ? { connect: { id: learnerData.sessionId } }
              : undefined,
          },
          include: {
            user: true,
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
          await AuthUtils.sendPasswordEmail(learnerData.email, password, 'Apprenant');
        } catch (emailError) {
          this.logger.error('Échec envoi email:', emailError);
        }

        return learner;
      },
      { timeout: 30000 },
    );
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
          (learner as any)[field] = value;
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

  async findAll(): Promise<Learner[]> {
    return this.prisma.learner.findMany({
      include: {
        user: true,
        referential: true,
        promotion: true,
        tutor: true,
        kit: true,
        attendances: true,
        grades: true,
      },
    });
  }

  async findOne(id: string): Promise<Learner> {
    const learner = await this.prisma.learner.findUnique({
      where: { id },
      include: {
        user: true,
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

  async findByEmail(email: string): Promise<Learner> {
    const learner = await this.prisma.learner.findFirst({
      where: { user: { email } },
      include: {
        user: true,
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
      throw new NotFoundException(`Aucun apprenant trouvé avec l'email ${email}`);
    }

    return learner;
  }

  async findByMatricule(mat: string): Promise<Learner> {
    const learner = await this.prisma.learner.findFirst({
      where: { matricule: mat },
      include: {
        user: true,
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
      throw new NotFoundException(`Aucun apprenant trouvé avec le matricule ${mat}`);
    }

    return learner;
  }

  async update(id: string, data: Partial<Learner>): Promise<Learner> {
    await this.findOne(id);

    return this.prisma.learner.update({
      where: { id },
      data,
      include: {
        user: true,
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
        user: true,
        referential: true,
        promotion: true,
      },
    });
  }

  async updateKit(
    id: string,
    kitData: { laptop?: boolean; charger?: boolean; bag?: boolean; polo?: boolean },
  ): Promise<Learner> {
    await this.findOne(id);

    return this.prisma.learner.update({
      where: { id },
      data: { kit: { update: kitData } },
      include: { kit: true },
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
    await this.findOne(id);

    const totalDays = await this.prisma.learnerAttendance.count({
      where: { learnerId: id },
    });
    const presentDays = await this.prisma.learnerAttendance.count({
      where: { learnerId: id, isPresent: true },
    });

    return {
      totalDays,
      presentDays,
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
          user: true,
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
          user: true,
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
    const learnerExists = await this.prisma.learner.findUnique({
      where: { id: learnerId },
    });

    if (!learnerExists) {
      throw new NotFoundException(`Apprenant ${learnerId} introuvable`);
    }

    return this.prisma.learnerAttendance.findMany({
      where: { learnerId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        isPresent: true,
        isLate: true,
        scanTime: true,
        status: true,
        justification: true,
        documentUrl: true,
        justificationComment: true,
        createdAt: true,
        updatedAt: true,
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
    });
  }
}