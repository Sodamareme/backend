// email.module.ts
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
@Global()
@Module({
   imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService], // ⚠️ très important !
})
export class EmailModule {}
