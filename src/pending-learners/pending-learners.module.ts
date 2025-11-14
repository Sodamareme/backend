// src/pending-learners/pending-learners.module.ts
import { Module } from '@nestjs/common';
import { PendingLearnersController } from './pending-learners.controller';
import { PendingLearnersService } from './pending-learners.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PendingLearnersController],
  providers: [PendingLearnersService, PrismaService],
  exports: [PendingLearnersService],
})
export class PendingLearnersModule {}
