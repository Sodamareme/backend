import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Gender, Learner, LearnerStatus, PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { AuthUtils } from '../utils/auth.utils';
import { CreateLearnerDto } from './dto/create-learner.dto';
import { ReplaceLearnerDto, UpdateStatusDto } from './dto/update-status.dto';
import { MatriculeUtils } from '../utils/matricule.utils';
// En haut du fichier (lignes 12-14)
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

  // Méthode pour valider un fichier CSV
  async validateBulkCSV(csvContent: string): Promise<ValidationResponseDto> {
    try {
      const learners = this.parseCSV(csvContent);
      const errors: string[] = [];
      const validationErrors: ValidationError[] = [];
      let validRows = 0;

      for (let i = 0; i < learners.length; i++) {
        const learner = learners[i];
        const learnerErrors = await this.validateLearnerData(learner, i + 2); // +2 car ligne 1 = headers
        
        if (learnerErrors.length === 0) {
          validRows++;
        } else {
          learnerErrors.forEach(error => {
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
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };
    } catch (error) {
      this.logger.error('Error validating CSV:', error);
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errors: [`Erreur de parsing CSV: ${error.message}`]
      };
    }
  }

  // Méthode pour traiter l'import en masse depuis CSV
  async processBulkImport(csvContent: string, isDryRun = false): Promise<BulkImportResponseDto> {
    const learners = this.parseCSV(csvContent);
    
    if (isDryRun) {
      // Mode simulation - juste validation
      const validation = await this.validateBulkCSV(csvContent);
      return {
        totalProcessed: learners.length,
        successfulImports: validation.validRows,
        failedImports: learners.length - validation.validRows,
        results: learners.map((learner, index) => ({
          success: true, // Simulation
          email: learner.email,
          firstName: learner.firstName,
          lastName: learner.lastName
        })),
        summary: {
          duplicateEmails: 0,
          duplicatePhones: 0,
          sessionCapacityWarnings: 0,
          missingReferentials: 0,
          invalidData: learners.length - validation.validRows
        }
      };
    }

    return await this.bulkCreateLearners(learners);
  }

  // Méthode principale pour créer des apprenants en masse
  async bulkCreateLearners(learners: BulkCreateLearnerDto[]): Promise<BulkImportResponseDto> {
    const results: LearnerImportResultDto[] = [];
    let successCount = 0;
    let failCount = 0;

    // Statistiques pour le résumé
    const duplicateEmails = new Set<string>();
    const duplicatePhones = new Set<string>();
    let sessionCapacityWarnings = 0;
    let missingReferentials = 0;

    // Vérifier les doublons dans le lot
    const emailsInBatch = new Set<string>();
    const phonesInBatch = new Set<string>();

    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      this.logger.log(`Processing learner ${i + 1}/${learners.length}: ${learner.firstName} ${learner.lastName}`);

      try {
        // Vérifier les doublons dans le lot
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

        // Valider les données
        const validationErrors = await this.validateLearnerData(learner, i + 2);
        if (validationErrors.length > 0) {
          throw new Error(`Erreurs de validation: ${validationErrors.map(e => e.message).join(', ')}`);
        }

 // Vérifier les doublons en base
const existingLearner = await this.prisma.learner.findFirst({
  where: {
    OR: [
      { phone: learner.phone },
      { user: { email: learner.email } }
    ]
  },
  include: {
    user: {
      select: {
        email: true
      }
    }
  }
});

if (existingLearner) {
  // TypeScript connaît maintenant la structure
  if (existingLearner.user?.email === learner.email) {
    duplicateEmails.add(learner.email);
  }
  if (existingLearner.phone === learner.phone) {
    duplicatePhones.add(learner.phone);
  }
  throw new Error('Un apprenant avec cet email ou téléphone existe déjà');
}

        // Vérifier la promotion et le référentiel
        const promotion = await this.prisma.promotion.findUnique({
          where: { id: learner.promotionId },
          include: { referentials: true }
        });

        if (!promotion) {
          missingReferentials++;
          throw new Error(`Promotion introuvable: ${learner.promotionId}`);
        }

        // Créer l'apprenant
        const createdLearner = await this.createSingleLearner(learner);
        
        results.push({
          success: true,
          email: learner.email,
          firstName: learner.firstName,
          lastName: learner.lastName,
          learnerId: createdLearner.id,
          matricule: createdLearner.matricule,
          warnings: [] // Ajouter des avertissements si nécessaire
        });

        successCount++;

      } catch (error) {
        this.logger.error(`Error creating learner ${learner.firstName} ${learner.lastName}:`, error);
        
        results.push({
          success: false,
          email: learner.email || 'N/A',
          firstName: learner.firstName,
          lastName: learner.lastName,
          error: error.message || 'Erreur inconnue'
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
        invalidData: failCount
      }
    };
  }

  // Méthode pour créer un seul apprenant (version simplifiée pour bulk)
  private async createSingleLearner(learnerData: BulkCreateLearnerDto): Promise<Learner> {
    return this.prisma.$transaction(async (prisma) => {
      // Générer le matricule
      const referential = learnerData.refId ? 
        await prisma.referential.findUnique({ where: { id: learnerData.refId } }) 
        : null;

      const matricule = await MatriculeUtils.generateLearnerMatricule(
        prisma as PrismaClient,
        learnerData.firstName,
        learnerData.lastName,
        referential?.name
      );

      if (!matricule) {
        throw new BadRequestException('Failed to generate matricule for learner');
      }

      // Générer un mot de passe
      const password = AuthUtils.generatePassword();
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Générer le QR code
      let qrCodeUrl: string | undefined;
      try {
        const qrCodeBuffer = await QRCode.toBuffer(matricule, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
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
        this.logger.warn(`Failed to generate QR code for ${matricule}:`, error);
      }

      // Créer l'apprenant
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
          promotion: {
            connect: { id: learnerData.promotionId }
          },
          referential: learnerData.refId ? {
            connect: { id: learnerData.refId }
          } : undefined,
          kit: {
            create: {
              laptop: false,
              charger: false,
              bag: false,
              polo: false
            }
          },
          session: learnerData.sessionId ? {
            connect: { id: learnerData.sessionId }
          } : undefined,
        },
        include: {
          user: true,
          promotion: true,
          referential: true,
          tutor: true,
          kit: true,
          session: true
        }
      });

      // Créer l'historique de statut initial
      await prisma.learnerStatusHistory.create({
        data: {
          learnerId: learner.id,
          newStatus: learner.status,
          reason: 'Initial status on creation',
          date: new Date()
        }
      });

      // Envoyer l'email du mot de passe
      try {
        await AuthUtils.sendPasswordEmail(learnerData.email, password, 'Apprenant');
      } catch (emailError) {
        this.logger.error('Failed to send password email:', emailError);
      }

      return learner;
    }, { timeout: 30000 });
  }

  // Méthode pour valider les données d'un apprenant
  private async validateLearnerData(learner: BulkCreateLearnerDto, lineNumber: number): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const prefix = `Ligne ${lineNumber}:`;

    // Champs requis
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
      { field: 'tutorAddress', label: 'Adresse tuteur' }
    ];

    requiredFields.forEach(({ field, label }) => {
      const value = learner[field as keyof BulkCreateLearnerDto];
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push({
          field,
          message: `${prefix} ${label} est requis`,
          value,
          line: lineNumber
        });
      }
    });

    // Validation email
    if (learner.email && !this.isValidEmail(learner.email)) {
      errors.push({
        field: 'email',
        message: `${prefix} Format d'email invalide`,
        value: learner.email,
        line: lineNumber
      });
    }

    // Validation genre
    if (learner.gender && !['MALE', 'FEMALE', 'OTHER'].includes(learner.gender)) {
      errors.push({
        field: 'gender',
        message: `${prefix} Genre invalide (MALE, FEMALE, OTHER attendu)`,
        value: learner.gender,
        line: lineNumber
      });
    }

    // Validation date de naissance
  // Validation date de naissance
if (learner.birthDate) {
  // Convertir en string si c'est une Date
  const birthDateStr = learner.birthDate instanceof Date 
    ? learner.birthDate.toISOString() 
    : learner.birthDate;
    
  if (!this.isValidDate(birthDateStr)) {
    errors.push({
      field: 'birthDate',
      message: `${prefix} Date de naissance invalide`,
      value: learner.birthDate,
      line: lineNumber
    });
  }
}

    return errors;
  }

  // Méthode pour parser le CSV
  private parseCSV(csvContent: string): BulkCreateLearnerDto[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-têtes et une ligne de données');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const learners: BulkCreateLearnerDto[] = [];

    // Mapping des colonnes
    const columnMapping: { [key: string]: number } = {};
    const expectedHeaders = {
      'firstName': ['firstName', 'prenom', 'prénom', 'first_name'],
      'lastName': ['lastName', 'nom', 'last_name'],
      'email': ['email', 'mail', 'e-mail'],
      'phone': ['phone', 'telephone', 'téléphone', 'tel'],
      'address': ['address', 'adresse'],
      'gender': ['gender', 'genre', 'sexe'],
      'birthDate': ['birthDate', 'dateNaissance', 'date_naissance', 'birth_date'],
      'birthPlace': ['birthPlace', 'lieuNaissance', 'lieu_naissance', 'birth_place'],
      'promotionId': ['promotionId', 'promotion', 'promotion_id'],
      'refId': ['refId', 'referentiel', 'referential', 'ref_id'],
      'sessionId': ['sessionId', 'session', 'session_id'],
      'status': ['status', 'statut'],
      'tutorFirstName': ['tutorFirstName', 'prenomTuteur', 'prenom_tuteur', 'tutor_first_name'],
      'tutorLastName': ['tutorLastName', 'nomTuteur', 'nom_tuteur', 'tutor_last_name'],
      'tutorPhone': ['tutorPhone', 'telephoneTuteur', 'telephone_tuteur', 'tutor_phone'],
      'tutorAddress': ['tutorAddress', 'adresseTuteur', 'adresse_tuteur', 'tutor_address'],
      'tutorEmail': ['tutorEmail', 'emailTuteur', 'email_tuteur', 'tutor_email']
    };

    // Créer le mapping des colonnes
    Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
      const headerIndex = headers.findIndex(header => 
        possibleNames.some(name => header.toLowerCase() === name.toLowerCase())
      );
      if (headerIndex !== -1) {
        columnMapping[field] = headerIndex;
      }
    });

    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.every(v => !v)) continue; // Ignorer les lignes vides

      const learner: Partial<BulkCreateLearnerDto> = {};
      
      Object.entries(columnMapping).forEach(([field, index]) => {
        const value = values[index]?.trim();
        if (value) {
          (learner as any)[field] = value;
        }
      });

      // Normaliser le genre
      if (learner.gender) {
        learner.gender = learner.gender.toUpperCase() as Gender;
      }

      learners.push(learner as BulkCreateLearnerDto);
    }

    return learners;
  }

  // Méthode pour générer un template CSV
  generateCSVTemplate(): string {
    const headers = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'gender',
      'birthDate', 'birthPlace', 'promotionId', 'refId', 'sessionId',
      'tutorFirstName', 'tutorLastName', 'tutorPhone', 'tutorAddress', 'tutorEmail'
    ];

    const sampleData = [
      [
        'Marie', 'Dupont', 'marie.dupont@email.com', '+33123456789', 
        '123 Rue de la Paix, Paris', 'FEMALE', '2000-05-15', 'Paris',
        'PROMO2024A', 'REF001', 'SESSION001', 'Jean', 'Dupont', '+33987654321', 
        '123 Rue de la Paix, Paris', 'jean.dupont@email.com'
      ],
      [
        'Pierre', 'Martin', 'pierre.martin@email.com', '+33234567890',
        '456 Avenue des Champs, Lyon', 'MALE', '1999-12-03', 'Lyon',
        'PROMO2024B', 'REF002', '', 'Claire', 'Martin', '+33876543210',
        '456 Avenue des Champs, Lyon', 'claire.martin@email.com'
      ]
    ];

    return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
  }

  // Utilitaires de validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date < new Date();
  }

  // Méthodes existantes (conservées)
  async create(createLearnerDto: CreateLearnerDto, photoFile?: Express.Multer.File): Promise<Learner> {
    return this.prisma.$transaction(async (prisma) => {
      // First, verify promotion and referential relationship
      const promotion = await prisma.promotion.findUnique({
        where: { id: createLearnerDto.promotionId },
        include: {
          referentials: true
        }
      });

      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      // Check if referential is provided and exists in promotion
      if (createLearnerDto.refId) {
        const referentialExists = promotion.referentials.some(
          ref => ref.id === createLearnerDto.refId
        );

        if (!referentialExists) {
          throw new BadRequestException(
            `The referential with ID ${createLearnerDto.refId} is not associated with the promotion ${promotion.name}`
          );
        }

        // Now fetch the referential with sessions for further validation
        const referential = await prisma.referential.findUnique({
          where: { id: createLearnerDto.refId },
          include: { 
            sessions: {
              select: {
                id: true,
                name: true,
                capacity: true
              }
            }
          }
        });

        if (!referential) {
          throw new NotFoundException('Referential not found');
        }

        // Validate sessions if multiple sessions exist
        if (referential.numberOfSessions > 1) {
          if (!createLearnerDto.sessionId) {
            throw new BadRequestException(
              `This referential has multiple sessions. Please specify a sessionId. Available sessions: ${referential.sessions.map(s => s.name).join(', ')}`
            );
          }

          const session = referential.sessions.find(s => s.id === createLearnerDto.sessionId);
          if (!session) {
            throw new BadRequestException(
              `Invalid session ID. Available sessions for this referential: ${referential.sessions.map(s => s.name).join(', ')}`
            );
          }

          // Check session capacity
          const sessionLearnerCount = await prisma.learner.count({
            where: { sessionId: createLearnerDto.sessionId }
          });

          if (sessionLearnerCount >= session.capacity) {
            throw new BadRequestException(
              `Session ${session.name} has reached its maximum capacity of ${session.capacity} learners`
            );
          }
        } else if (createLearnerDto.sessionId) {
          throw new BadRequestException(
            'Session ID should not be provided for single-session referentials'
          );
        }
      }

      // Generate matricule first
      const referential = createLearnerDto.refId ? 
        await prisma.referential.findUnique({ where: { id: createLearnerDto.refId } }) 
        : null;

      const matricule = await MatriculeUtils.generateLearnerMatricule(
        prisma as PrismaClient,
        createLearnerDto.firstName,
        createLearnerDto.lastName,
        referential?.name
      );

      // Vérifier que le matricule est généré
      if (!matricule) {
        throw new BadRequestException('Failed to generate matricule for learner');
      }

      this.logger.log(`Generated matricule: ${matricule} for learner ${createLearnerDto.firstName} ${createLearnerDto.lastName}`);

      // Variables pour stocker les URLs
      let photoUrl: string | undefined;
      let qrCodeUrl: string | undefined;

      // Générer et uploader le QR code - avec gestion d'erreur améliorée
      try {
        this.logger.log('Starting QR code generation...');
        
        const qrCodeBuffer = await QRCode.toBuffer(matricule, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        this.logger.log(`QR code buffer generated, size: ${qrCodeBuffer.length} bytes`);

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

        this.logger.log('Uploading QR code to Cloudinary...');
        const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
        qrCodeUrl = qrCodeResult.url;
        this.logger.log(`QR code uploaded successfully: ${qrCodeUrl}`);

      } catch (error) {
        this.logger.error('QR code generation/upload failed:', error);
        
        // Option: Continuer sans QR code mais logger l'erreur
        this.logger.warn(`Continuing learner creation without QR code for matricule: ${matricule}`);
        // Alternativement, vous pouvez lancer une erreur pour arrêter le processus:
        // throw new BadRequestException(`Failed to generate QR code: ${error.message}`);
      }

      // Handle photo upload
      if (photoFile) {
        try {
          this.logger.log('Uploading learner photo...');
          const result = await this.cloudinary.uploadFile(photoFile, 'learners');
          photoUrl = result.url;
          this.logger.log(`Photo uploaded successfully: ${photoUrl}`);
        } catch (error) {
          this.logger.error('Failed to upload photo:', error);
          this.logger.warn('Continuing learner creation without photo');
        }
      }

      // Validate session assignment (validation déjà faite plus haut, on garde pour sécurité)
      if (createLearnerDto.refId) {
        const referential = await prisma.referential.findUnique({
          where: { id: createLearnerDto.refId },
          include: { sessions: true }
        });

        if (!referential) {
          throw new NotFoundException('Referential not found');
        }

        if (referential.numberOfSessions > 1) {
          if (!createLearnerDto.sessionId) {
            throw new BadRequestException('Session ID is required for multi-session referentials');
          }

          // Verify session belongs to referential
          const sessionExists = referential.sessions.some(s => s.id === createLearnerDto.sessionId);
          if (!sessionExists) {
            throw new BadRequestException('Invalid session ID for this referential');
          }
        }
      }

      // Check for existing learner
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

      // Generate password for the new learner
      const password = AuthUtils.generatePassword();
      const hashedPassword = await AuthUtils.hashPassword(password);

      this.logger.log(`Creating learner with matricule: ${matricule}, QR code: ${qrCodeUrl ? 'YES' : 'NO'}`);

      // Create learner only if all validations pass
      const learner = await prisma.learner.create({
        data: {
          matricule,
          firstName: createLearnerDto.firstName,
          lastName: createLearnerDto.lastName,
          address: createLearnerDto.address,
          gender: createLearnerDto.gender as Gender,
          birthDate: createLearnerDto.birthDate,
          birthPlace: createLearnerDto.birthPlace,
          phone: createLearnerDto.phone,
          photoUrl,
          qrCode: qrCodeUrl, // Important: s'assurer que c'est bien défini
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
              email: createLearnerDto.tutor.email,
              address: createLearnerDto.tutor.address,
            },
          },
          promotion: {
            connect: {
              id: createLearnerDto.promotionId
            }
          },
          referential: createLearnerDto.refId ? {
            connect: {
              id: createLearnerDto.refId
            }
          } : undefined,
          kit: {
            create: {
              laptop: false,
              charger: false,
              bag: false,
              polo: false
            }
          },
          session: createLearnerDto.sessionId ? {
            connect: {
              id: createLearnerDto.sessionId
            }
          } : undefined,
        },
        include: {
          user: true,
          promotion: true,
          referential: true,
          tutor: true,
          kit: true,
          statusHistory: true,
          session: true
        }
      });

      // Logger le résultat pour debug
      this.logger.log(`Learner created successfully - ID: ${learner.id}, Matricule: ${learner.matricule}, QR code URL: ${learner.qrCode || 'NOT SET'}`);

      // Create initial status history
      await prisma.learnerStatusHistory.create({
        data: {
          learnerId: learner.id,
          newStatus: learner.status,
          reason: 'Initial status on creation',
          date: new Date()
        }
      });

      // Send password email with the plain text password
      try {
        await AuthUtils.sendPasswordEmail(createLearnerDto.email, password, 'Apprenant');
        this.logger.log(`Password email sent to: ${createLearnerDto.email}`);
      } catch (emailError) {
        this.logger.error('Failed to send password email:', emailError);
        // Ne pas faire échouer la création pour un problème d'email
      }

      return learner;
    }, {
      timeout: 30000 // Augmenter le timeout à 30 secondes
    });
  }

  // Méthodes existantes conservées...
  async regenerateQrCode(learnerId: string): Promise<string> {
    const learner = await this.findOne(learnerId);
    
    try {
      this.logger.log(`Regenerating QR code for learner ${learnerId} with matricule ${learner.matricule}`);
      
      const qrCodeBuffer = await QRCode.toBuffer(learner.matricule, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
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
      
      // Mettre à jour l'apprenant avec le nouveau QR code
      await this.prisma.learner.update({
        where: { id: learnerId },
        data: { qrCode: qrCodeResult.url }
      });

      this.logger.log(`QR code regenerated successfully: ${qrCodeResult.url}`);
      return qrCodeResult.url;
      
    } catch (error) {
      this.logger.error('Failed to regenerate QR code:', error);
      throw new BadRequestException(`Failed to regenerate QR code: ${error.message}`);
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
      where: {
        user: {
          email: email
        }
      },
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
      throw new NotFoundException(`No learner found with email ${email}`);
    }

    return learner;
  }

  async findByMatricule(mat: string): Promise<Learner> {
    const learner = await this.prisma.learner.findFirst({
      where: {
        matricule: mat
      },
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
      throw new NotFoundException(`No learner found with email ${mat}`);
    }

    return learner;
  }

  async update(id: string, data: Partial<Learner>): Promise<Learner> {
    const learner = await this.findOne(id);

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
    const learner = await this.findOne(id);

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

  async updateKit(id: string, kitData: {
    laptop?: boolean;
    charger?: boolean;
    bag?: boolean;
    polo?: boolean;
  }): Promise<Learner> {
    const learner = await this.findOne(id);

    return this.prisma.learner.update({
      where: { id },
      data: {
        kit: {
          update: kitData,
        },
      },
      include: {
        kit: true,
      },
    });
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    type: string,
    name: string,
  ) {
    this.logger.log(`Uploading document for learner ${id}`, {
      type,
      name,
      fileDetails: {
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    });

    const learner = await this.findOne(id);
    
    let documentUrl: string | undefined;
    
    try {
      // Try Cloudinary upload first
      this.logger.log('Attempting to upload document to Cloudinary...');
      const result = await this.cloudinary.uploadFile(file, 'documents');
      documentUrl = result.url;
      this.logger.log('Successfully uploaded document to Cloudinary:', documentUrl);
    } catch (cloudinaryError) {
      this.logger.error('Cloudinary document upload failed:', cloudinaryError);
      
      // Fallback to local storage
      try {
        this.logger.log('Falling back to local storage for document...');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync('./uploads/documents')) {
          fs.mkdirSync('./uploads/documents', { recursive: true });
        }
        
        // Generate unique filename
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = file.originalname.split('.').pop();
        const filename = `${uniquePrefix}.${extension}`;
        const filepath = `./uploads/documents/${filename}`;
        
        // Write the file
        fs.writeFileSync(filepath, file.buffer);
        
        documentUrl = `uploads/documents/${filename}`;
        this.logger.log(`Document saved locally at ${filepath}`);
      } catch (localError) {
        this.logger.error('Local storage fallback for document failed:', localError);
        throw new BadRequestException('Failed to upload document');
      }
    }

    return this.prisma.document.create({
      data: {
        name,
        type,
        url: documentUrl,
        learnerId: id,
      },
    });
  }

  async getAttendanceStats(id: string) {
    const learner = await this.findOne(id);
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

  async updateLearnerStatus(
    learnerId: string,
    updateStatusDto: UpdateStatusDto
  ): Promise<Learner> {
    const learner = await this.findOne(learnerId);
    
    this.logger.log(`Updating learner ${learnerId} status from ${learner.status} to ${updateStatusDto.status}`);

    return this.prisma.$transaction(async (prisma) => {
      // Create status history record
      await prisma.learnerStatusHistory.create({
        data: {
          learnerId,
          previousStatus: learner.status,
          newStatus: updateStatusDto.status,
          reason: updateStatusDto.reason,
        }
      });

      // Update learner status
      return prisma.learner.update({
        where: { id: learnerId },
        data: {
          status: updateStatusDto.status,
        },
        include: {
          user: true,
          promotion: true,
          referential: true,
          statusHistory: true
        }
      });
    });
  }

  async replaceLearner(replacementDto: ReplaceLearnerDto): Promise<{
    replacedLearner: Learner;
    replacementLearner: Learner;
  }> {
    const { activeLearnerForReplacement, replacementLearnerId, reason } = replacementDto;

    return this.prisma.$transaction(async (prisma) => {
      // 1. Verify active learner
      const activeLearner = await prisma.learner.findUnique({
        where: { id: activeLearnerForReplacement },
        include: { promotion: true }
      });

      if (!activeLearner || activeLearner.status !== 'ACTIVE') {
        throw new ConflictException('Invalid active learner or learner is not active');
      }

      // 2. Verify waiting list learner
      const waitingLearner = await prisma.learner.findUnique({
        where: { id: replacementLearnerId },
      });

      if (!waitingLearner || waitingLearner.status !== 'WAITING') {
        throw new ConflictException('Invalid replacement learner or learner is not in waiting list');
      }

      // 3. Update active learner to REPLACED
      const replacedLearner = await prisma.learner.update({
        where: { id: activeLearnerForReplacement },
        data: {
          status: 'REPLACED',
          statusHistory: {
            create: {
              previousStatus: 'ACTIVE',
              newStatus: 'REPLACED',
              reason,
              date: new Date()
            }
          }
        },
        include: { promotion: true }
      });

      // 4. Update waiting learner to REPLACEMENT
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
              date: new Date()
            }
          }
        },
        include: { promotion: true }
      });

      return { replacedLearner, replacementLearner };
    });
  }

  async getWaitingList(promotionId?: string): Promise<Learner[]> {
    try {
      const waitingLearners = await this.prisma.learner.findMany({
        where: {
          status: 'WAITING',
          ...(promotionId && { promotionId })
        },
        include: {
          user: true,
          promotion: true,
          referential: {
            include: {
              sessions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (promotionId) {
        const promotionExists = await this.prisma.promotion.findUnique({
          where: { id: promotionId }
        });

        if (!promotionExists) {
          throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
        }
      }

      return waitingLearners;
    } catch (error) {
      this.logger.error('Error fetching waiting list:', error);
      throw error;
    }
  }

  async getStatusHistory(learnerId: string) {
    return this.prisma.learnerStatusHistory.findMany({
      where: { learnerId },
      orderBy: { date: 'desc' }
    });
  }

  async getDocuments(learnerId: string) {
    const learner = await this.findOne(learnerId);

    const documents = await this.prisma.document.findMany({
      where: {
        learnerId: learnerId
      },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return documents;
  }

async getAttendanceByLearner(learnerId: string) { 
  const learnerExists = await this.prisma.learner.findUnique({
    where: { id: learnerId }
  });

  if (!learnerExists) {
    throw new NotFoundException(`Learner with ID ${learnerId} not found`);
  }

  return this.prisma.learnerAttendance.findMany({ 
    where: { learnerId: learnerId }, 
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
          referential: { 
            select: { 
              id: true,
              name: true 
            } 
          } 
        } 
      }
    }
  }); 
}
}