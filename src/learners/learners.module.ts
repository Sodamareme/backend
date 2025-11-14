import { Module } from '@nestjs/common';
import { LearnersService } from './learners.service';
import { LearnersController } from './learners.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
// import { PendingLearnersController } from './pending-learners.controller';
import { EmailModule } from '../../src/email/email.module';
import { EmailService } from '@/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
@Module({
  imports: [CloudinaryModule,EmailModule],
  providers: [LearnersService, PrismaService, CloudinaryService],
  controllers: [LearnersController],
  exports: [LearnersService],
  
})
export class LearnersModule {}