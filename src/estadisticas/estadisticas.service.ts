import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class EstadisticasService {
  constructor(private readonly prisma: PrismaService) { }

  async getReservasHoy() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = new Date(todayStr + 'T12:00:00Z');
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = await this.prisma.reserva.count({
      where: {
        fechaReserva: {
          gte: startOfDay,
          lt: nextDay,
        },
      },
    });

    return { cantidad: count };
  }

  async getPlatosMasReservados() {
    const reservas = await this.prisma.reservaPlato.findMany({
      select: {
        cantidad: true,
        MenuPlato: {
          select: {
            Plato: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    const acumulado = new Map<
      number,
      { platoId: number; nombre: string; cantidad: number }
    >();

    for (const reserva of reservas) {
      const plato = reserva.MenuPlato?.Plato;

      if (!plato) continue;

      if (acumulado.has(plato.id)) {
        acumulado.get(plato.id)!.cantidad += reserva.cantidad;
      } else {
        acumulado.set(plato.id, {
          platoId: plato.id,
          nombre: plato.nombre,
          cantidad: reserva.cantidad,
        });
      }
    }

    return Array.from(acumulado.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }

  async getTotalUsuarios() {
    const count = await this.prisma.usuario.count();
    return { cantidad: count };
  }

  async getMenuHoy() {
    const today = new Date();
    const fechaInicio = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );

    const menu = await this.prisma.menu.findUnique({
      where: { fecha: fechaInicio },
      include: {
        menuPlatos: {
          include: {
            Plato: true,
          },
        },
      },
    });

    if (!menu) {
      return {
        existe: false,
        mensaje: 'No hay menú publicado para hoy',
        opciones: [],
      };
    }

    return {
      existe: true,
      fecha: menu.fecha,
      publicado: menu.publicado,
      opciones: menu.menuPlatos.map((mp) => ({
        id: mp.id,
        nombre: mp.Plato.nombre,
        descripcion: mp.Plato.descripcion,
        precio: mp.Plato.precio,
        elegible: mp.elegible,
      })),
    };
  }

  async getUsuariosConMasReservas() {
    const usuariosConReservas = await this.prisma.usuario.findMany({
      include: {
        Reservas: true,
      },
    });

    const conteo = usuariosConReservas.map((usuario) => ({
      usuarioId: usuario.id,
      nombre: `${usuario.nombre} ${usuario.apellidoPat || ''} ${usuario.apellidoMat || ''}`.trim(),
      cantidadReservas: usuario.Reservas.length,
    }));

    const top5 = conteo
      .sort((a, b) => b.cantidadReservas - a.cantidadReservas)
      .slice(0, 5);

    return top5;
  }

  async getPlatoMasReservadoHoy() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = new Date(todayStr + 'T12:00:00Z');
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const reservaPlatos = await this.prisma.reservaPlato.groupBy({
      by: ['menuPlatoId'],
      _sum: {
        cantidad: true,
      },
      where: {
        Reserva: {
          fechaReserva: {
            gte: startOfDay,
            lt: nextDay,
          },
        },
      },
      orderBy: {
        _sum: {
          cantidad: 'desc',
        },
      },
      take: 1,
    });

    if (reservaPlatos.length === 0) {
      return {
        existe: false,
        mensaje: 'No hay reservas para hoy',
      };
    }

    const menuPlato = await this.prisma.menuPlato.findUnique({
      where: { id: reservaPlatos[0].menuPlatoId },
      include: { Plato: true },
    });

    return {
      existe: true,
      platoId: reservaPlatos[0].menuPlatoId,
      nombre: menuPlato?.Plato?.nombre || 'Plato no encontrado',
      cantidad: reservaPlatos[0]._sum.cantidad || 0,
    };
  }

  async getEstadisticasDashboard() {
    const [reservasHoy, platosMasReservados, totalUsuarios, menuHoy, usuariosTop, platoMasReservadoHoy] =
      await Promise.all([
        this.getReservasHoy(),
        this.getPlatosMasReservados(),
        this.getTotalUsuarios(),
        this.getMenuHoy(),
        this.getUsuariosConMasReservas(),
        this.getPlatoMasReservadoHoy(),
      ]);

    return {
      reservasHoy,
      platosMasReservados,
      totalUsuarios,
      menuHoy,
      usuariosTop,
      platoMasReservadoHoy,
    };
  }

  async getReservaHoyUsuario(userToken: any) {
    const userId = userToken.user_id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = new Date(todayStr + 'T12:00:00Z');
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const reserva = await this.prisma.reserva.findFirst({
      where: {
        userId,
        fechaReserva: {
          gte: startOfDay,
          lt: nextDay,
        },
      },
      include: {
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

    if (!reserva) {
      return {
        tieneReserva: false,
        mensaje: 'No tienes reserva para hoy',
      };
    }

    const precioTotal = reserva.ReservaPlatos.reduce((sum, rp) => {
      const precio = rp.MenuPlato?.Plato?.precio || 0;
      return sum + precio * rp.cantidad;
    }, 0);

    return {
      tieneReserva: true,
      reserva: {
        id: reserva.id,
        fechaReserva: reserva.fechaReserva,
        precioTotal,
        platos: reserva.ReservaPlatos.map((rp) => ({
          id: rp.id,
          nombre: rp.MenuPlato?.Plato?.nombre || 'Plato no encontrado',
          cantidad: rp.cantidad,
          precio: rp.MenuPlato?.Plato?.precio || 0,
          elegible: rp.MenuPlato?.elegible ?? false,
        })),
      },
    };
  }

  async getCantidadReservasUsuario(userToken: any) {
    const userId = userToken.user_id;

    const count = await this.prisma.reserva.count({
      where: { userId },
    });

    return { cantidad: count };
  }

  async getPlatoMasReservadoUsuario(userToken: any) {
    const userId = userToken.user_id;

    // 1. Agrupar por platoId (vía MenuPlato)
    const reservasAgrupadas = await this.prisma.reservaPlato.findMany({
      where: {
        Reserva: {
          userId,
        },
      },
      select: {
        cantidad: true,
        MenuPlato: {
          select: {
            platoId: true,
            Plato: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (reservasAgrupadas.length === 0) {
      return {
        existe: false,
        mensaje: 'No tienes reservas realizadas',
      };
    }

    // 2. Agrupar manualmente por platoId (evitamos duplicados de menú)
    const mapa = new Map<number, { platoId: number; nombre: string; cantidad: number }>();

    for (const r of reservasAgrupadas) {
      const platoId = r.MenuPlato.platoId;
      const nombre = r.MenuPlato.Plato.nombre;
      const cantidad = r.cantidad;

      if (!mapa.has(platoId)) {
        mapa.set(platoId, {
          platoId,
          nombre,
          cantidad,
        });
      } else {
        mapa.get(platoId)!.cantidad += cantidad;
      }
    }

    // 3. Obtener el más reservado
    const topPlato = [...mapa.values()].sort(
      (a, b) => b.cantidad - a.cantidad,
    )[0];

    return {
      existe: true,
      platoId: topPlato.platoId,
      nombre: topPlato.nombre,
      cantidad: topPlato.cantidad,
    };
  }

  async getEstadisticasUsuario(userToken: any) {
    const [reservaHoy, cantidadReservas, platoMasReservado, menuHoy] =
      await Promise.all([
        this.getReservaHoyUsuario(userToken),
        this.getCantidadReservasUsuario(userToken),
        this.getPlatoMasReservadoUsuario(userToken),
        this.getMenuHoy(),
      ]);

    return {
      reservaHoy,
      cantidadReservas,
      platoMasReservado,
      menuHoy,
    };
  }

  async getGastoMesActual(userToken: any) {
    const userId = userToken.user_id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startOfMonth = new Date(year, month, 1, 12, 0, 0);
    const endOfMonth = new Date(year, month + 1, 1, 12, 0, 0);

    const reservas = await this.prisma.reserva.findMany({
      where: {
        userId,
        fechaReserva: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      include: {
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

    const gastoTotal = reservas.reduce((sum, reserva) => {
      const precioPlatos = reserva.ReservaPlatos.reduce((platoSum, rp) => {
        const precio = rp.MenuPlato?.Plato?.precio || 0;
        return platoSum + precio * rp.cantidad;
      }, 0);
      return sum + precioPlatos;
    }, 0);

    return {
      mes: month + 1,
      anio: year,
      mesNombre: this.getMesNombre(month),
      gasto: gastoTotal,
    };
  }

  async getGastoTotal(userToken: any) {
    const userId = userToken.user_id;

    const reservas = await this.prisma.reserva.findMany({
      where: { userId },
      include: {
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

    const gastoTotal = reservas.reduce((sum, reserva) => {
      const precioPlatos = reserva.ReservaPlatos.reduce((platoSum, rp) => {
        const precio = rp.MenuPlato?.Plato?.precio || 0;
        return platoSum + precio * rp.cantidad;
      }, 0);
      return sum + precioPlatos;
    }, 0);

    return {
      gasto: gastoTotal,
      cantidadReservas: reservas.length,
    };
  }

  async getGastoPorMes(userToken: any, anio: number) {
    const userId = userToken.user_id;

    const year = anio;
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const gastosPorMes: { mes: number; mesNombre: string; gasto: number }[] = [];

    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1, 12, 0, 0);
      const endOfMonth = new Date(year, month + 1, 1, 12, 0, 0);

      const reservas = await this.prisma.reserva.findMany({
        where: {
          userId,
          fechaReserva: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        include: {
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

      const gastoMes = reservas.reduce((sum, reserva) => {
        const precioPlatos = reserva.ReservaPlatos.reduce((platoSum, rp) => {
          const precio = rp.MenuPlato?.Plato?.precio || 0;
          return platoSum + precio * rp.cantidad;
        }, 0);
        return sum + precioPlatos;
      }, 0);

      gastosPorMes.push({
        mes: month + 1,
        mesNombre: meses[month],
        gasto: gastoMes,
      });
    }

    return {
      anio,
      meses: gastosPorMes,
    };
  }

  async getGastoMesEspecifico(userToken: any, mes: number, anio: number) {
    const userId = userToken.user_id;

    const startOfMonth = new Date(anio, mes - 1, 1, 12, 0, 0);
    const endOfMonth = new Date(anio, mes, 1, 12, 0, 0);

    const reservas = await this.prisma.reserva.findMany({
      where: {
        userId,
        fechaReserva: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      include: {
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

    const gastoTotal = reservas.reduce((sum, reserva) => {
      const precioPlatos = reserva.ReservaPlatos.reduce((platoSum, rp) => {
        const precio = rp.MenuPlato?.Plato?.precio || 0;
        return platoSum + precio * rp.cantidad;
      }, 0);
      return sum + precioPlatos;
    }, 0);

    return {
      mes,
      anio,
      mesNombre: this.getMesNombre(mes - 1),
      gasto: gastoTotal,
      cantidadReservas: reservas.length,
    };
  }

  private getMesNombre(month: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[month];
  }
}
