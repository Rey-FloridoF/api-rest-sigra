import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReporteDto } from './dto/createReporte.dto';
import { PrismaService } from 'src/prisma.service';
import { PrinterService } from 'src/printer/printer.service';
import { billreport } from './document/bill.report';
import { daylyReport } from './document/dayly.report';

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printer: PrinterService,
  ) { }

  async findAll() {
    const reportes = await this.prisma.reportes.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reportes.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
      createdAt: r.createdAt,
    }));
  }

  async create(dto: CreateReporteDto) {
    const { nombre, fechaInicio, fechaFin } = dto;

    const fechaInicioDate = new Date(
      fechaInicio.getFullYear(),
      fechaInicio.getMonth(),
      fechaInicio.getDate(),
      0, 0, 0, 0
    );

    const fechaFinDate = new Date(
      fechaFin.getFullYear(),
      fechaFin.getMonth(),
      fechaFin.getDate(),
      23, 59, 59, 999
    );

    const reservas = await this.prisma.reserva.findMany({
      where: {
        fechaReserva: {
          gte: fechaInicioDate,
          lte: fechaFinDate,
        },
      },
      include: {
        Usuario: true,
        ReservaPlatos: {
          include: {
            MenuPlato: {
              include: {
                Plato: true,
              },
            },
          },
        },
      },
    });

    const usuariosMap = new Map<number, any>();

    for (const reserva of reservas) {
      const user = reserva.Usuario;

      if (!usuariosMap.has(user.id)) {
        usuariosMap.set(user.id, {
          nombreCompleto: `${user.nombre} ${user.apellidoPat ?? ''} ${user.apellidoMat ?? ''}`.trim(),
          username: user.username,
          gasto: 0,
        });
      }

      const usuarioData = usuariosMap.get(user.id);

      for (const rp of reserva.ReservaPlatos) {
        const precio = rp.MenuPlato.Plato.precio;
        usuarioData.gasto += rp.cantidad * precio;
      }
    }

    const registros = Array.from(usuariosMap.values());

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const resultadoConsulta = {
      fechaInicio: formatDate(fechaInicio),
      fechaFin: formatDate(fechaFin),
      registros,
    };

    const docDefinition = billreport(resultadoConsulta);

    const pdf = await this.printer.createPdf(docDefinition);

    await this.prisma.reportes.create({
      data: {
        nombre: nombre,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        reporte: pdf
      },
    });

    return { message: 'Reporte creado satisfactoriamente' };
  }

  async generatePdfDay(id: number) {

    // 🔹 1. Buscar menú
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        menuPlatos: {
          include: { Plato: true },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException('Menú no encontrado');
    }

    // 🔹 2. Opciones del menú
    const opcionesMenu = menu.menuPlatos.map((mp) => ({
      id: mp.id,
      nombre: mp.Plato.nombre,
    }));

    // 🔹 3. Manejo correcto de fecha (sin problema timezone)
    const fechaStr = menu.fecha.toISOString().split('T')[0];
    const fechaInicio = new Date(fechaStr + 'T00:00:00');
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 1);

    // 🔹 4. Reservas del día
    const reservas = await this.prisma.reserva.findMany({
      where: {
        fechaReserva: {
          gte: fechaInicio,
          lt: fechaFin,
        },
      },
      include: {
        Usuario: true,
        ReservaPlatos: true,
      },
    });

    // 🔹 5. Inicializar totales
    const totalPorOpcion: Record<number, number> = {};
    opcionesMenu.forEach((op) => {
      totalPorOpcion[op.id] = 0;
    });

    // 🔹 6. Construcción de empleados
    const empleados = reservas.map((reserva) => {

      const opcionesEmpleado: Record<number, number> = {};

      opcionesMenu.forEach((op) => {
        opcionesEmpleado[op.id] = 0;
      });

      reserva.ReservaPlatos.forEach((rp) => {
        if (opcionesEmpleado.hasOwnProperty(rp.menuPlatoId)) {
          opcionesEmpleado[rp.menuPlatoId] += rp.cantidad;
          totalPorOpcion[rp.menuPlatoId] += rp.cantidad;
        }
      });

      return {
        nombre: `${reserva.Usuario.nombre} ${reserva.Usuario.apellidoPat || ''} ${reserva.Usuario.apellidoMat || ''}`.trim(),
        opciones: opcionesEmpleado,
      };
    });

    // 🔹 7. AQUÍ está tu resultadoConsulta 👇
    const resultadoConsulta = {
      fecha: menu.fecha,
      opciones: opcionesMenu,
      empleados,
      totalPorOpcion,
    };

    // 🔹 8. Generar PDF
    const docDefinition = daylyReport(resultadoConsulta);
    const pdf = await this.printer.createPdf(docDefinition);

    return pdf;
  }

  async findOne(id: number) {
    const reporte = await this.prisma.reportes.findUnique({
      where: { id },
    });

    if (!reporte) {
      throw new NotFoundException('No se encontro el reporte')
    }

    return reporte
  }

  async destroy(id: number) {
    const reporte = await this.prisma.reportes.findUnique({
      where: { id },
    });

    if (!reporte) {
      throw new NotFoundException('No se encontro el reporte')
    }

    await this.prisma.reportes.delete({
      where: { id },
    });

    return { message: 'Reporte eliminado exitosamente' };
  }
}
