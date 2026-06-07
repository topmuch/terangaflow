import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

const LINES_DATA = [
  { name: 'Dakar — Saint-Louis', code: 'DSL' },
  { name: 'Dakar — Thiès', code: 'DTH' },
  { name: 'Dakar — Kaolack', code: 'DKK' },
  { name: 'Dakar — Ziguinchor', code: 'DZG' },
  { name: 'Dakar — Tambacounda', code: 'DTA' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'terangaflow' },
    update: {},
    create: {
      name: 'TerangaFlow',
      slug: 'terangaflow',
      plan: 'pro',
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // Create station
  const station = await db.station.upsert({
    where: { code: 'DKR' },
    update: {},
    create: {
      name: 'Gare de Dakar — Centrale',
      code: 'DKR',
      city: 'Dakar',
      country: 'SN',
      address: 'Avenue Blaise Diagne, Dakar',
      lat: 14.6937,
      lng: -17.4441,
      timezone: 'Africa/Dakar',
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Station: ${station.name}`);

  // Create admin user
  const passwordHash = await hash('admin123', 12);
  const admin = await db.user.upsert({
    where: { email: 'admin@terangaflow.app' },
    update: {},
    create: {
      email: 'admin@terangaflow.app',
      passwordHash,
      name: 'Admin TerangaFlow',
      role: 'SUPERADMIN',
      tenantId: tenant.id,
      stationId: station.id,
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Create demo lines
  for (const line of LINES_DATA) {
    const exists = await db.line.findFirst({ where: { code: line.code, stationId: station.id } });
    if (!exists) {
      await db.line.create({
        data: {
          name: line.name,
          code: line.code,
          stationId: station.id,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ Lines: ${LINES_DATA.length} created`);

  console.log('🎉 Seed completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
