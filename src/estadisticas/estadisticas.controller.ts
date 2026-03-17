import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { EstadisticasService } from './estadisticas.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { UserGuard } from 'src/auth/guards/user.guard';

@Controller('estadisticas')
@UseGuards(AuthGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('dashboard')
  @UseGuards(AdminGuard)
  getDashboard() {
    return this.estadisticasService.getEstadisticasDashboard();
  }

  @Get('dashboard-usuario')
  @UseGuards(UserGuard)
  getDashboardUsuario(@Req() req: Request) {
    const user_token = req.user;
    return this.estadisticasService.getEstadisticasUsuario(user_token);
  }

  @Get('reservas-hoy')
  @UseGuards(AdminGuard)
  getReservasHoy() {
    return this.estadisticasService.getReservasHoy();
  }

  @Get('platos-mas-reservados')
  @UseGuards(AdminGuard)
  getPlatosMasReservados() {
    return this.estadisticasService.getPlatosMasReservados();
  }

  @Get('total-usuarios')
  @UseGuards(AdminGuard)
  getTotalUsuarios() {
    return this.estadisticasService.getTotalUsuarios();
  }

  @Get('menu-hoy')
  @UseGuards(AdminGuard)
  getMenuHoy() {
    return this.estadisticasService.getMenuHoy();
  }

  @Get('usuarios-top')
  @UseGuards(AdminGuard)
  getUsuariosTop() {
    return this.estadisticasService.getUsuariosConMasReservas();
  }

  @Get('plato-mas-reservado-hoy')
  @UseGuards(AdminGuard)
  getPlatoMasReservadoHoy() {
    return this.estadisticasService.getPlatoMasReservadoHoy();
  }

  @Get('historial/gasto-mes-actual')
  @UseGuards(UserGuard)
  getGastoMesActual(@Req() req: Request) {
    const user_token = req.user;
    return this.estadisticasService.getGastoMesActual(user_token);
  }

  @Get('historial/gasto-total')
  @UseGuards(UserGuard)
  getGastoTotal(@Req() req: Request) {
    const user_token = req.user;
    return this.estadisticasService.getGastoTotal(user_token);
  }

  @Get('historial/gasto-por-mes')
  @UseGuards(UserGuard)
  getGastoPorMes(@Req() req: Request) {
    const user_token = req.user;
    return this.estadisticasService.getGastoPorMes(user_token, new Date().getFullYear());
  }
}
