// src/pending-learners/pending-learners.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { PendingLearnersService } from '../../src/pending-learners/pending-learners.service';
import { CreatePendingLearnerDto } from './dto/create-pending-learner.dto';

@Controller('pending-learners')
export class PendingLearnersController {
  constructor(private readonly pendingLearnersService: PendingLearnersService) {}

  @Post()
  async createPendingLearner(@Body() dto: CreatePendingLearnerDto) {
    return this.pendingLearnersService.createPendingLearner(dto);
  }
}
