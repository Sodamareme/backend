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
var LearnersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearnersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const client_1 = require("@prisma/client");
const QRCode = require("qrcode");
const fs = require("fs");
const auth_utils_1 = require("../utils/auth.utils");
const matricule_utils_1 = require("../utils/matricule.utils");
const email_service_1 = require("../email/email.service");
let LearnersService = LearnersService_1 = class LearnersService {
    constructor(prisma, cloudinary, emailService) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
        this.emailService = emailService;
        this.logger = new common_1.Logger(LearnersService_1.name);
    }
    async validateBulkCSV(csvContent) {
        try {
            const learners = this.parseCSV(csvContent);
            const errors = [];
            const validationErrors = [];
            let validRows = 0;
            for (let i = 0; i < learners.length; i++) {
                const learner = learners[i];
                const learnerErrors = await this.validateLearnerData(learner, i + 2);
                if (learnerErrors.length === 0) {
                    validRows++;
                }
                else {
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
        }
        catch (error) {
            this.logger.error('Error validating CSV:', error);
            return {
                isValid: false,
                totalRows: 0,
                validRows: 0,
                errors: [`Erreur de parsing CSV: ${error.message}`]
            };
        }
    }
    async processBulkImport(csvContent, isDryRun = false) {
        const learners = this.parseCSV(csvContent);
        if (isDryRun) {
            const validation = await this.validateBulkCSV(csvContent);
            return {
                totalProcessed: learners.length,
                successfulImports: validation.validRows,
                failedImports: learners.length - validation.validRows,
                results: learners.map((learner, index) => ({
                    success: true,
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
    async bulkCreateLearners(learners) {
        const results = [];
        let successCount = 0;
        let failCount = 0;
        const duplicateEmails = new Set();
        const duplicatePhones = new Set();
        let sessionCapacityWarnings = 0;
        let missingReferentials = 0;
        const emailsInBatch = new Set();
        const phonesInBatch = new Set();
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
                    throw new Error(`Erreurs de validation: ${validationErrors.map(e => e.message).join(', ')}`);
                }
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
                    include: { referentials: true }
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
                    warnings: []
                });
                successCount++;
            }
            catch (error) {
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
    async createSingleLearner(learnerData) {
        return this.prisma.$transaction(async (prisma) => {
            const referential = learnerData.refId ?
                await prisma.referential.findUnique({ where: { id: learnerData.refId } })
                : null;
            const matricule = await matricule_utils_1.MatriculeUtils.generateLearnerMatricule(prisma, learnerData.firstName, learnerData.lastName, referential?.name);
            if (!matricule) {
                throw new common_1.BadRequestException('Failed to generate matricule for learner');
            }
            const password = auth_utils_1.AuthUtils.generatePassword();
            const hashedPassword = await auth_utils_1.AuthUtils.hashPassword(password);
            let qrCodeUrl;
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
                };
                const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
                qrCodeUrl = qrCodeResult.url;
            }
            catch (error) {
                this.logger.warn(`Failed to generate QR code for ${matricule}:`, error);
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
                    status: learnerData.status || client_1.LearnerStatus.ACTIVE,
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
            await prisma.learnerStatusHistory.create({
                data: {
                    learnerId: learner.id,
                    newStatus: learner.status,
                    reason: 'Initial status on creation',
                    date: new Date()
                }
            });
            try {
                await auth_utils_1.AuthUtils.sendPasswordEmail(learnerData.email, password, 'Apprenant');
            }
            catch (emailError) {
                this.logger.error('Failed to send password email:', emailError);
            }
            return learner;
        }, { timeout: 30000 });
    }
    async validateLearnerData(learner, lineNumber) {
        const errors = [];
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
            { field: 'tutorAddress', label: 'Adresse tuteur' }
        ];
        requiredFields.forEach(({ field, label }) => {
            const value = learner[field];
            if (!value || (typeof value === 'string' && !value.trim())) {
                errors.push({
                    field,
                    message: `${prefix} ${label} est requis`,
                    value,
                    line: lineNumber
                });
            }
        });
        if (learner.email && !this.isValidEmail(learner.email)) {
            errors.push({
                field: 'email',
                message: `${prefix} Format d'email invalide`,
                value: learner.email,
                line: lineNumber
            });
        }
        if (learner.gender && !['MALE', 'FEMALE', 'OTHER'].includes(learner.gender)) {
            errors.push({
                field: 'gender',
                message: `${prefix} Genre invalide (MALE, FEMALE, OTHER attendu)`,
                value: learner.gender,
                line: lineNumber
            });
        }
        if (learner.birthDate) {
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
    parseCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-têtes et une ligne de données');
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const learners = [];
        const columnMapping = {};
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
        Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
            const headerIndex = headers.findIndex(header => possibleNames.some(name => header.toLowerCase() === name.toLowerCase()));
            if (headerIndex !== -1) {
                columnMapping[field] = headerIndex;
            }
        });
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.every(v => !v))
                continue;
            const learner = {};
            Object.entries(columnMapping).forEach(([field, index]) => {
                const value = values[index]?.trim();
                if (value) {
                    learner[field] = value;
                }
            });
            if (learner.gender) {
                learner.gender = learner.gender.toUpperCase();
            }
            learners.push(learner);
        }
        return learners;
    }
    generateCSVTemplate() {
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
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date < new Date();
    }
    async create(createLearnerDto, photoFile) {
        return this.prisma.$transaction(async (prisma) => {
            const promotion = await prisma.promotion.findUnique({
                where: { id: createLearnerDto.promotionId },
                include: {
                    referentials: true
                }
            });
            if (!promotion) {
                throw new common_1.NotFoundException('Promotion not found');
            }
            if (createLearnerDto.refId) {
                const referentialExists = promotion.referentials.some(ref => ref.id === createLearnerDto.refId);
                if (!referentialExists) {
                    throw new common_1.BadRequestException(`The referential with ID ${createLearnerDto.refId} is not associated with the promotion ${promotion.name}`);
                }
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
                    throw new common_1.NotFoundException('Referential not found');
                }
                if (referential.numberOfSessions > 1) {
                    if (!createLearnerDto.sessionId) {
                        throw new common_1.BadRequestException(`This referential has multiple sessions. Please specify a sessionId. Available sessions: ${referential.sessions.map(s => s.name).join(', ')}`);
                    }
                    const session = referential.sessions.find(s => s.id === createLearnerDto.sessionId);
                    if (!session) {
                        throw new common_1.BadRequestException(`Invalid session ID. Available sessions for this referential: ${referential.sessions.map(s => s.name).join(', ')}`);
                    }
                    const sessionLearnerCount = await prisma.learner.count({
                        where: { sessionId: createLearnerDto.sessionId }
                    });
                    if (sessionLearnerCount >= session.capacity) {
                        throw new common_1.BadRequestException(`Session ${session.name} has reached its maximum capacity of ${session.capacity} learners`);
                    }
                }
                else if (createLearnerDto.sessionId) {
                    throw new common_1.BadRequestException('Session ID should not be provided for single-session referentials');
                }
            }
            const referential = createLearnerDto.refId ?
                await prisma.referential.findUnique({ where: { id: createLearnerDto.refId } })
                : null;
            const matricule = await matricule_utils_1.MatriculeUtils.generateLearnerMatricule(prisma, createLearnerDto.firstName, createLearnerDto.lastName, referential?.name);
            if (!matricule) {
                throw new common_1.BadRequestException('Failed to generate matricule for learner');
            }
            this.logger.log(`Generated matricule: ${matricule} for learner ${createLearnerDto.firstName} ${createLearnerDto.lastName}`);
            let photoUrl;
            let qrCodeUrl;
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
                };
                this.logger.log('Uploading QR code to Cloudinary...');
                const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
                qrCodeUrl = qrCodeResult.url;
                this.logger.log(`QR code uploaded successfully: ${qrCodeUrl}`);
            }
            catch (error) {
                this.logger.error('QR code generation/upload failed:', error);
                this.logger.warn(`Continuing learner creation without QR code for matricule: ${matricule}`);
            }
            if (photoFile) {
                try {
                    this.logger.log('Uploading learner photo...');
                    const result = await this.cloudinary.uploadFile(photoFile, 'learners');
                    photoUrl = result.url;
                    this.logger.log(`Photo uploaded successfully: ${photoUrl}`);
                }
                catch (error) {
                    this.logger.error('Failed to upload photo:', error);
                    this.logger.warn('Continuing learner creation without photo');
                }
            }
            if (createLearnerDto.refId) {
                const referential = await prisma.referential.findUnique({
                    where: { id: createLearnerDto.refId },
                    include: { sessions: true }
                });
                if (!referential) {
                    throw new common_1.NotFoundException('Referential not found');
                }
                if (referential.numberOfSessions > 1) {
                    if (!createLearnerDto.sessionId) {
                        throw new common_1.BadRequestException('Session ID is required for multi-session referentials');
                    }
                    const sessionExists = referential.sessions.some(s => s.id === createLearnerDto.sessionId);
                    if (!sessionExists) {
                        throw new common_1.BadRequestException('Invalid session ID for this referential');
                    }
                }
            }
            const existingLearner = await prisma.learner.findFirst({
                where: {
                    OR: [
                        { phone: createLearnerDto.phone },
                        { user: { email: createLearnerDto.email } },
                    ],
                },
            });
            if (existingLearner) {
                throw new common_1.ConflictException('Un apprenant avec cet email ou ce téléphone existe déjà');
            }
            const password = auth_utils_1.AuthUtils.generatePassword();
            const hashedPassword = await auth_utils_1.AuthUtils.hashPassword(password);
            this.logger.log(`Creating learner with matricule: ${matricule}, QR code: ${qrCodeUrl ? 'YES' : 'NO'}`);
            const learner = await prisma.learner.create({
                data: {
                    matricule,
                    firstName: createLearnerDto.firstName,
                    lastName: createLearnerDto.lastName,
                    address: createLearnerDto.address,
                    gender: createLearnerDto.gender,
                    birthDate: createLearnerDto.birthDate,
                    birthPlace: createLearnerDto.birthPlace,
                    phone: createLearnerDto.phone,
                    photoUrl,
                    qrCode: qrCodeUrl,
                    status: createLearnerDto.status || client_1.LearnerStatus.ACTIVE,
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
            this.logger.log(`Learner created successfully - ID: ${learner.id}, Matricule: ${learner.matricule}, QR code URL: ${learner.qrCode || 'NOT SET'}`);
            await prisma.learnerStatusHistory.create({
                data: {
                    learnerId: learner.id,
                    newStatus: learner.status,
                    reason: 'Initial status on creation',
                    date: new Date()
                }
            });
            try {
                await auth_utils_1.AuthUtils.sendPasswordEmail(createLearnerDto.email, password, 'Apprenant');
                this.logger.log(`Password email sent to: ${createLearnerDto.email}`);
            }
            catch (emailError) {
                this.logger.error('Failed to send password email:', emailError);
            }
            return learner;
        }, {
            timeout: 30000
        });
    }
    async regenerateQrCode(learnerId) {
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
            };
            const qrCodeResult = await this.cloudinary.uploadFile(qrCodeFile, 'qrcodes');
            await this.prisma.learner.update({
                where: { id: learnerId },
                data: { qrCode: qrCodeResult.url }
            });
            this.logger.log(`QR code regenerated successfully: ${qrCodeResult.url}`);
            return qrCodeResult.url;
        }
        catch (error) {
            this.logger.error('Failed to regenerate QR code:', error);
            throw new common_1.BadRequestException(`Failed to regenerate QR code: ${error.message}`);
        }
    }
    async findAll() {
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
    async findOne(id) {
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
            throw new common_1.NotFoundException('Apprenant non trouvé');
        }
        return learner;
    }
    async findByEmail(email) {
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
            throw new common_1.NotFoundException(`No learner found with email ${email}`);
        }
        return learner;
    }
    async findByMatricule(mat) {
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
            throw new common_1.NotFoundException(`No learner found with email ${mat}`);
        }
        return learner;
    }
    async update(id, data) {
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
    async updateStatus(id, status) {
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
    async updateKit(id, kitData) {
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
    async uploadDocument(id, file, type, name) {
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
        let documentUrl;
        try {
            this.logger.log('Attempting to upload document to Cloudinary...');
            const result = await this.cloudinary.uploadFile(file, 'documents');
            documentUrl = result.url;
            this.logger.log('Successfully uploaded document to Cloudinary:', documentUrl);
        }
        catch (cloudinaryError) {
            this.logger.error('Cloudinary document upload failed:', cloudinaryError);
            try {
                this.logger.log('Falling back to local storage for document...');
                if (!fs.existsSync('./uploads/documents')) {
                    fs.mkdirSync('./uploads/documents', { recursive: true });
                }
                const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = file.originalname.split('.').pop();
                const filename = `${uniquePrefix}.${extension}`;
                const filepath = `./uploads/documents/${filename}`;
                fs.writeFileSync(filepath, file.buffer);
                documentUrl = `uploads/documents/${filename}`;
                this.logger.log(`Document saved locally at ${filepath}`);
            }
            catch (localError) {
                this.logger.error('Local storage fallback for document failed:', localError);
                throw new common_1.BadRequestException('Failed to upload document');
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
    async getAttendanceStats(id) {
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
    async updateLearnerStatus(learnerId, updateStatusDto) {
        const learner = await this.findOne(learnerId);
        this.logger.log(`Updating learner ${learnerId} status from ${learner.status} to ${updateStatusDto.status}`);
        return this.prisma.$transaction(async (prisma) => {
            await prisma.learnerStatusHistory.create({
                data: {
                    learnerId,
                    previousStatus: learner.status,
                    newStatus: updateStatusDto.status,
                    reason: updateStatusDto.reason,
                }
            });
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
    async replaceLearner(replacementDto) {
        const { activeLearnerForReplacement, replacementLearnerId, reason } = replacementDto;
        return this.prisma.$transaction(async (prisma) => {
            const activeLearner = await prisma.learner.findUnique({
                where: { id: activeLearnerForReplacement },
                include: { promotion: true }
            });
            if (!activeLearner || activeLearner.status !== 'ACTIVE') {
                throw new common_1.ConflictException('Invalid active learner or learner is not active');
            }
            const waitingLearner = await prisma.learner.findUnique({
                where: { id: replacementLearnerId },
            });
            if (!waitingLearner || waitingLearner.status !== 'WAITING') {
                throw new common_1.ConflictException('Invalid replacement learner or learner is not in waiting list');
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
                            date: new Date()
                        }
                    }
                },
                include: { promotion: true }
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
                            date: new Date()
                        }
                    }
                },
                include: { promotion: true }
            });
            return { replacedLearner, replacementLearner };
        });
    }
    async getWaitingList(promotionId) {
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
                    throw new common_1.NotFoundException(`Promotion with ID ${promotionId} not found`);
                }
            }
            return waitingLearners;
        }
        catch (error) {
            this.logger.error('Error fetching waiting list:', error);
            throw error;
        }
    }
    async getStatusHistory(learnerId) {
        return this.prisma.learnerStatusHistory.findMany({
            where: { learnerId },
            orderBy: { date: 'desc' }
        });
    }
    async getDocuments(learnerId) {
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
    async getAttendanceByLearner(learnerId) {
        const learnerExists = await this.prisma.learner.findUnique({
            where: { id: learnerId }
        });
        if (!learnerExists) {
            throw new common_1.NotFoundException(`Learner with ID ${learnerId} not found`);
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
};
exports.LearnersService = LearnersService;
exports.LearnersService = LearnersService = LearnersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService,
        email_service_1.EmailService])
], LearnersService);
//# sourceMappingURL=learners.service.js.map