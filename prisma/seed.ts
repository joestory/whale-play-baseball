import { config } from 'dotenv'
config({ path: '.env.local' })
config()
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123'

  const existing = await prisma.manager.findUnique({ where: { username: adminUsername } })
  if (existing) {
    console.log(`Admin user "${adminUsername}" already exists.`)
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await prisma.manager.create({
    data: { username: adminUsername, passwordHash, isAdmin: true },
  })

  console.log(`Created admin user: ${adminUsername}`)
  console.log('Change the password immediately via the admin panel!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
