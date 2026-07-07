import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'empresasetecsolar@gmail.com';
  
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: '$2b$10$xKB4z0HdoLSWDzT6WIKfzOq9Xv7vNJ2yWvEzA7k6GHsNrVtXqZdPe', // Hash de "setec2024"
        name: 'SETEC Solar e Segurança',
        role: 'SUPER_ADMIN',
      }
    });
    console.log('✅ Usuário administrador padrão criado com sucesso!');
  } else {
    console.log('ℹ️ Usuário administrador padrão já existe.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
