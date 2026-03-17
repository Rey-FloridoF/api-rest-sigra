import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PrismaService } from 'src/prisma.service';
import { PrinterModule } from 'src/printer/printer.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, PrismaService],
  imports: [PrinterModule, AuthModule],
})
export class ReportesModule {}
