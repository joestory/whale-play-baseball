import { config } from 'dotenv'
config({ path: '.env.local' })
config()
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const MANAGERS = [
  'Dash', 'Brady', 'Bubba', 'Childs', 'Cogan', 'Devin', 'Doty',
  'Dubov', 'Dundon', 'Heff', 'J Til', 'Keagen', 'Miz', 'Nate',
  'P@', 'PoC', 'Pugs', 'Scott', 'USJ', 'Benson',
]

async function main() {
  for (const username of MANAGERS) {
    const existing = await prisma.manager.findUnique({ where: { username } })
    if (existing) {
      console.log(`  skip: ${username} (already exists)`)
      continue
    }
    const passwordHash = await bcrypt.hash(username, 12)
    await prisma.manager.create({ data: { username, passwordHash } })
    console.log(`  created: ${username}`)
  }
  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
