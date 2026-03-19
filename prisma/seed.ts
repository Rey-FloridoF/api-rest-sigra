import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const DEPT_NAME = 'Administradores'

async function main() {
  // Crear o reutilizar el departamento
  const deptAdmin = await prisma.departamento.upsert({
    where: { nombre: DEPT_NAME },
    update: {}, // no actualizamos nada si ya existe
    create: { nombre: DEPT_NAME }
  })

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PWD ?? 'Admin123', 10)

  // Crear o reutilizar el usuario admin
  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      // opcional: actualizar contraseña si cambió
      password: passwordHash,
      departamentoId: deptAdmin.id
    },
    create: {
      departamentoId: deptAdmin.id,
      nombre: 'Admin',
      apellidoPat: '-',
      apellidoMat: '-',
      username: 'admin',
      password: passwordHash,
      role: 'ADMIN'
    }
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
