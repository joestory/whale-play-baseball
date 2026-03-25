import { config } from 'dotenv'
config({ path: '.env.local' })
config()
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('changeme123', 12)
  const selfCheck = await bcrypt.compare('changeme123', hash)
  console.log('bcrypt self-check:', selfCheck)

  await prisma.manager.update({ where: { username: 'admin' }, data: { passwordHash: hash } })
  console.log('Password reset done')

  const manager = await prisma.manager.findUnique({ where: { username: 'admin' } })
  const dbCheck = await bcrypt.compare('changeme123', manager!.passwordHash)
  console.log('DB verify:', dbCheck, '| isAdmin:', manager!.isAdmin)
}

main().catch(console.error).finally(() => prisma.$disconnect())
