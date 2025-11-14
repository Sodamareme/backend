// // src/learners/pending-learners.controller.ts
// import {
//   Controller,
//   Post,
//   Get,
//   Patch,
//   Body,
//   Param,
//   UseInterceptors,
//   UploadedFile,
//   UseGuards,
//   Request,
//   Query,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
// import { LearnersService } from './learners.service';
// import { CreatePendingLearnerDto } from './dto/pending-learner.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

// @ApiTags('Pending Learners')
// @Controller('pending-learners')
// export class PendingLearnersController {
//   constructor(private readonly learnersService: LearnersService) {}

//   /**
//    * Inscription publique (sans authentification)
//    */
  
//   @Post('register')
//   @ApiOperation({ summary: 'Soumettre une demande d\'inscription' })
//   @ApiConsumes('multipart/form-data')
//   @ApiBody({
//     schema: {
//       type: 'object',
//       required: [
//         'firstName', 'lastName', 'email', 'phone', 'address',
//         'gender', 'birthDate', 'birthPlace', 'promotionId', 'refId',
//         'tutorFirstName', 'tutorLastName', 'tutorPhone', 'tutorAddress'
//       ],
//       properties: {
//         firstName: { type: 'string', example: 'Moussa' },
//         lastName: { type: 'string', example: 'Diallo' },
//         email: { type: 'string', example: 'moussa.diallo@example.com' },
//         phone: { type: 'string', example: '+221771234567' },
//         address: { type: 'string', example: 'Dakar, Senegal' },
//         gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], example: 'MALE' },
//         birthDate: { type: 'string', format: 'date', example: '2000-01-15' },
//         birthPlace: { type: 'string', example: 'Dakar' },
//         promotionId: { type: 'string', example: 'promo-uuid' },
//         refId: { type: 'string', example: 'ref-uuid' },
//         'tutor[firstName]': { type: 'string', example: 'Jean' },
//         'tutor[lastName]': { type: 'string', example: 'Dupont' },
//         'tutor[phone]': { type: 'string', example: '+221771234568' },
//         'tutor[email]': { type: 'string', example: 'tuteur@example.com' },
//         'tutor[address]': { type: 'string', example: 'Dakar, Senegal' },
//         photoFile: { type: 'string', format: 'binary' },
//       },
//     },
//   })
//   @UseInterceptors(FileInterceptor('photoFile'))
//   async register(
//     @Body() createPendingLearnerDto: CreatePendingLearnerDto,
//     @UploadedFile() photoFile?: Express.Multer.File,
//   ) {
//     // Transformer les données du tuteur si elles sont au format tutor[field]
//     const tutorData = {
//       firstName: createPendingLearnerDto['tutor[firstName]'] || createPendingLearnerDto.tutor?.firstName,
//       lastName: createPendingLearnerDto['tutor[lastName]'] || createPendingLearnerDto.tutor?.lastName,
//       phone: createPendingLearnerDto['tutor[phone]'] || createPendingLearnerDto.tutor?.phone,
//       email: createPendingLearnerDto['tutor[email]'] || createPendingLearnerDto.tutor?.email,
//       address: createPendingLearnerDto['tutor[address]'] || createPendingLearnerDto.tutor?.address,
//     };

//     const dto = {
//       ...createPendingLearnerDto,
//       tutor: tutorData,
//     };

//     return this.learnersService.createPendingLearner(dto, photoFile);
//   }

//   /**
//    * Obtenir toutes les demandes (admin uniquement)
//    */
//   @Get()
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('ADMIN')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Obtenir toutes les demandes d\'inscription' })
//   async getPendingLearners(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
//     return this.learnersService.getPendingLearners(status);
//   }

//   /**
//    * Obtenir une demande par ID (admin uniquement)
//    */
//   @Get(':id')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('ADMIN')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Obtenir une demande d\'inscription par ID' })
//   async getPendingLearnerById(@Param('id') id: string) {
//     return this.learnersService.getPendingLearnerById(id);
//   }

//   /**
//    * Approuver une demande (admin uniquement)
//    */
//   @Patch(':id/approve')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('ADMIN')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Approuver une demande d\'inscription' })
//   async approvePendingLearner(@Param('id') id: string, @Request() req) {
//     return this.learnersService.approvePendingLearner(id, req.user.userId);
//   }

//   /**
//    * Rejeter une demande (admin uniquement)
//    */
//   @Patch(':id/reject')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('ADMIN')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Rejeter une demande d\'inscription' })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         reason: { type: 'string', example: 'Dossier incomplet' },
//       },
//     },
//   })
//   async rejectPendingLearner(
//     @Param('id') id: string,
//     @Request() req,
//     @Body('reason') reason?: string,
//   ) {
//     return this.learnersService.rejectPendingLearner(id, req.user.userId, reason);
//   }
// }