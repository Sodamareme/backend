// src/coaches/dto/scan-attendance.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanAttendanceDto {
  @ApiProperty({ description: 'QR Code data (JSON string)' })
  @IsString()
  @IsNotEmpty()
  qrData: string;
}