// grades.module.ts
import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
  imports: [PrismaModule],
  
})
export class GradesModule {}
