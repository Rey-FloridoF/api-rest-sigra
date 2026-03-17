import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const DEPT_NAME = 'Administradores'

async function main() {
  // Crear departamento principal y usuario admin
  const deptAdmin = await prisma.departamento.create({
    data: { nombre: DEPT_NAME }
  })

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PWD ?? 'Admin123', 10)

  const admin = await prisma.usuario.create({
    data: {
      departamentoId: deptAdmin.id,
      nombre: 'Admin',
      apellidoPat: '-',
      apellidoMat: '-',
      username: 'admin',
      password: passwordHash,
      role: 'ADMIN'
    }
  })
  console.log(`Usuario admin creado con id=${admin.id}`)

  // Crear otros 8 departamentos
  const deptNames = [
    'Recursos Humanos',
    'Finanzas',
    'Marketing',
    'Ventas',
    'Operaciones',
    'Tecnología',
    'Logística',
    'Atención al Cliente'
  ]
  const departamentos: any[] = []
  for (const nombre of deptNames) {
    const d = await prisma.departamento.create({ data: { nombre } })
    departamentos.push(d)
  }

  // Crear 10 usuarios con nombres reales
  const nombres = [
    ['Carlos', 'García'],
    ['María', 'Fernández'],
    ['José', 'Rodríguez'],
    ['Ana', 'López'],
    ['Luis', 'Martínez'],
    ['Elena', 'González'],
    ['Miguel', 'Pérez'],
    ['Isabel', 'Torres'],
    ['Raúl', 'Ramírez'],
    ['Carmen', 'Suárez']
  ]
  const userPwd = await bcrypt.hash("Password123", 10)
  const usuarios: any[] = []
  for (let i = 0; i < nombres.length; i++) {
    const [nombre, apellidoPat] = nombres[i]
    const dept = departamentos[i % departamentos.length]
    const u = await prisma.usuario.create({
      data: {
        departamentoId: dept.id,
        nombre,
        apellidoPat,
        apellidoMat: 'Hernández',
        username: `${nombre.toLowerCase()}${i+1}`,
        password: userPwd,
        role: 'USUARIO'
      }
    })
    usuarios.push(u)
  }

  // Crear 10 platos cubanos
  const platosCubanos = [
    { nombre: 'Ropa Vieja', descripcion: 'Carne desmechada en salsa de tomate', precio: 12 },
    { nombre: 'Picadillo a la Habanera', descripcion: 'Carne molida con pasas y aceitunas', precio: 10 },
    { nombre: 'Arroz con Pollo', descripcion: 'Clásico arroz amarillo con pollo', precio: 11 },
    { nombre: 'Yuca con Mojo', descripcion: 'Yuca hervida con salsa de ajo y cítricos', precio: 8 },
    { nombre: 'Tostones', descripcion: 'Plátanos verdes fritos dos veces', precio: 6 },
    { nombre: 'Congrí', descripcion: 'Arroz con frijoles negros', precio: 9 },
    { nombre: 'Lechón Asado', descripcion: 'Cerdo marinado y asado al estilo cubano', precio: 14 },
    { nombre: 'Ajiaco Cubano', descripcion: 'Sopa criolla con viandas y carne', precio: 13 },
    { nombre: 'Tamales Cubanos', descripcion: 'Masa de maíz rellena de carne', precio: 7 },
    { nombre: 'Flan de Caramelo', descripcion: 'Postre tradicional cubano', precio: 5 }
  ]
  const platos: any[] = []
  for (const p of platosCubanos) {
    const plato = await prisma.plato.create({ data: p })
    platos.push(plato)
  }

  // Crear 10 menús desde hoy
  const hoy = new Date()
  const menus: any[] = []
  for (let i = 0; i < 10; i++) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)

    const publicado = i < 8 // últimos dos no publicados

    const shuffled = [...platos].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 5)

    const m = await prisma.menu.create({
      data: {
        fecha,
        publicado,
        menuPlatos: {
          create: selected.map(plato => ({
            platoId: plato.id,
            elegible: Math.random() < 0.5
          }))
        }
      }
    })
    menus.push(m)
  }

  // Crear reservas aleatorias de usuarios en menús publicados
  for (const user of usuarios) {
    // Decidir si el usuario reserva en todos los menús o en algunos
    const reservaTodos = Math.random() < 0.5
    const menusPublicados = menus.filter(m => m.publicado)

    let menusElegidos: any[]
    if (reservaTodos) {
      menusElegidos = menusPublicados
    } else {
      // Selecciona aleatoriamente 2–3 menús publicados
      const shuffledMenus = [...menusPublicados].sort(() => Math.random() - 0.5)
      const cantidad = 2 + Math.floor(Math.random() * 2) // 2 o 3
      menusElegidos = shuffledMenus.slice(0, cantidad)
    }

    for (const menu of menusElegidos) {
      const menuPlatos = await prisma.menuPlato.findMany({ where: { menuId: menu.id } })

      await prisma.reserva.create({
        data: {
          userId: user.id,
          fechaReserva: menu.fecha,
          ReservaPlatos: {
            create: menuPlatos.map(mp => ({
              menuPlatoId: mp.id,
              cantidad: mp.elegible ? (Math.random() < 0.5 ? 1 : 2) : 1
            }))
          }
        }
      })
      console.log(`Reserva creada: Usuario ${user.username} → Menu ${menu.id}`)
    }
  }

  console.log('Departamentos, usuarios, platos, menús y reservas creados exitosamente.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
