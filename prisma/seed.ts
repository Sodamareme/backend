import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ------------------ ADMIN ------------------
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sonatel-academy.sn' },
    update: {},
    create: {
      email: 'admin@sonatel-academy.sn',
      password: adminPassword,
      role: UserRole.ADMIN,
      admin: {
        create: {
          firstName: 'Admin',
          lastName: 'Sonatel',
          phone: '+221777777777',
        },
      },
    },
  });
  console.log('✅ Admin user:', adminUser.email);

  // ------------------ RESTAURATEURS ------------------
  const restaurateursData = [
    {
      firstName: 'Fatou',
      lastName: 'Diop',
      email: 'fatou.restauratrice@sonatel.sn',
      phone: '+221781111111',
    },
    {
      firstName: 'Moussa',
      lastName: 'Fall',
      email: 'moussa.restaurateur@sonatel.sn',
      phone: '+221782222222',
    },
  ];

  for (const r of restaurateursData) {
    const password = await bcrypt.hash('Restau123!', 10);
    const restaurateur = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        email: r.email,
        password,
        role: UserRole.RESTAURATEUR,
        restaurateur: {
          create: {
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
          },
        },
      },
    });
    console.log(`✅ Restaurateur ajouté : ${restaurateur.email}`);
  }

  // ------------------ VIGILS ------------------
  const vigilsData = [
    {
      firstName: 'Alioune',
      lastName: 'Ba',
      email: 'alioune.vigil@sonatel.sn',
      phone: '+221783333333',
    },
    {
      firstName: 'Mariama',
      lastName: 'Ndoye',
      email: 'mariama.vigil@sonatel.sn',
      phone: '+221784444444',
    },
  ];

  for (const v of vigilsData) {
    const password = await bcrypt.hash('Vigil123!', 10);
    const vigil = await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: {
        email: v.email,
        password,
        role: UserRole.VIGIL,
        vigil: {
          create: {
            firstName: v.firstName,
            lastName: v.lastName,
            phone: v.phone,
          },
        },
      },
    });
    console.log(`✅ Vigil ajouté : ${vigil.email}`);
  }

  // ------------------ COACHS ------------------
const coachesData = [
  {
    firstName: 'Awa',
    lastName: 'Sow',
    email: 'awa.coach@sonatel.sn',
    phone: '+221785555555',
    matricule: 'COACH001',
  },
  {
    firstName: 'Cheikh',
    lastName: 'Ndiaye',
    email: 'cheikh.coach@sonatel.sn',
    phone: '+221786666666',
    matricule: 'COACH002',
  },
];

for (const c of coachesData) {
  const password = await bcrypt.hash('Coach123!', 10);
  const coach = await prisma.user.upsert({
    where: { email: c.email },
    update: {},
    create: {
      email: c.email,
      password,
      role: UserRole.COACH,
      coach: {
        create: {
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          matricule: c.matricule, // ✅ Ajout ici
        },
      },
    },
  });
  console.log(`✅ Coach ajouté : ${coach.email}`);
}

}

main()
  .catch((e) => {
    console.error('❌ Erreur dans le seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
