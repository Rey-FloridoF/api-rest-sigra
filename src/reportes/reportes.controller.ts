import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { CreateReporteDto } from './dto/createReporte.dto';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';


@Controller('reporte')
@UseGuards(AuthGuard, AdminGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) { }
  @Get()
  findAll() {
    return this.reportesService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const reporte = await this.reportesService.findOne(id);

    if (!reporte) {
      return res.status(404).json({
        message: 'Reporte no encontrado',
      });
    }

    // Prisma devuelve Bytes como Buffer
    const buffer = Buffer.from(reporte.reporte);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${reporte.nombre}.pdf"`,
      'Content-Length': buffer.length,
    });

    return res.end(buffer);
  }

  @Post('create')
  async create(@Body() dto: CreateReporteDto) {
    return this.reportesService.create(dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.reportesService.destroy(id);
  }

  @Get('dayly/:id')
  async findReportDayly(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const reporte = await this.reportesService.generatePdfDay(id);

    if (!reporte) {
      return res.status(404).json({
        message: 'Reporte no encontrado',
      });
    }

    // Prisma devuelve Bytes como Buffer
    const buffer = Buffer.from(reporte);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Reporte diario.pdf"`,
      'Content-Length': buffer.length,
    });

    return res.end(buffer);
  }
}
