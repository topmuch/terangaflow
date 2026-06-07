import { hash } from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding TerangaFlow database…");

  // ─── 1. Create Tenant ────────────────────────────────────────────────────
  const tenant = await db.tenant.upsert({
    where: { slug: "teranga-demo" },
    update: {},
    create: {
      name: "TerangaFlow Demo",
      slug: "teranga-demo",
      plan: "pro",
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // ─── 2. Create Station ───────────────────────────────────────────────────
  const station = await db.station.upsert({
    where: { code: "DKR-01" },
    update: {},
    create: {
      name: "Gare Centrale de Dakar",
      code: "DKR-01",
      city: "Dakar",
      country: "SN",
      address: "Avenue Léopold Sédar Senghor, Dakar",
      lat: 14.6937,
      lng: -17.4441,
      timezone: "Africa/Dakar",
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Station created: ${station.name} (${station.id})`);

  // ─── 3. Create SuperAdmin User ─────────────────────────────────────────────
  const passwordHash = await hash("admin123", 12);

  const superAdmin = await db.user.upsert({
    where: { email: "admin@terangaflow.app" },
    update: {},
    create: {
      email: "admin@terangaflow.app",
      passwordHash,
      name: "Super Administrateur",
      role: "SUPERADMIN",
      tenantId: tenant.id,
      stationId: station.id,
    },
  });
  console.log(`✅ SuperAdmin created: ${superAdmin.name} (${superAdmin.email})`);

  // ─── 4. Create Station Manager ───────────────────────────────────────────
  const managerPassword = await hash("manager123", 12);

  const manager = await db.user.upsert({
    where: { email: "manager@terangaflow.app" },
    update: {},
    create: {
      email: "manager@terangaflow.app",
      passwordHash: managerPassword,
      name: "Mamadou Diop",
      role: "STATION_MANAGER",
      tenantId: tenant.id,
      stationId: station.id,
    },
  });
  console.log(`✅ Station Manager created: ${manager.name} (${manager.email})`);

  // ─── 5. Create Transporter ────────────────────────────────────────────────
  const transporterPassword = await hash("transport123", 12);

  const transporter = await db.user.upsert({
    where: { email: "transporteur@terangaflow.app" },
    update: {},
    create: {
      email: "transporteur@terangaflow.app",
      passwordHash: transporterPassword,
      name: "Diaspora Bus SARL",
      role: "TRANSPORTER",
      tenantId: tenant.id,
      stationId: station.id,
    },
  });
  console.log(`✅ Transporter created: ${transporter.name} (${transporter.email})`);

  // ─── 6. Create Test Lines ──────────────────────────────────────────────────
  const linesData = [
    { name: "Dakar → Saint-Louis", code: "DKR-SLS" },
    { name: "Dakar → Thiès", code: "DKR-THI" },
    { name: "Dakar → Kaolack", code: "DKR-KLK" },
    { name: "Dakar → Ziguinchor", code: "DKR-ZIG" },
    { name: "Dakar → Tambacounda", code: "DKR-TMB" },
  ];

  for (const lineData of linesData) {
    const existing = await db.line.findFirst({
      where: { code: lineData.code, stationId: station.id },
    });
    const line = existing
      ? existing
      : await db.line.create({
          data: {
            ...lineData,
            stationId: station.id,
          },
        });
    console.log(`  ✅ Line created: ${line.name}`);
  }

  // ─── 7. Create Sample Trips ──────────────────────────────────────────────
  const lines = await db.line.findMany({ where: { stationId: station.id } });

  const now = new Date();
  const tripsData = [
    { lineIdx: 0, operator: "Diaspora Bus", hoursOffset: 0, platform: "A3" },
    { lineIdx: 1, operator: "SATAS", hoursOffset: 0.5, platform: "B1" },
    { lineIdx: 2, operator: "SOTRAL", hoursOffset: 0.75, platform: "A1" },
    { lineIdx: 3, operator: "Le Transporteur", hoursOffset: 1, platform: "B2" },
    { lineIdx: 4, operator: "CSC Kaloum", hoursOffset: 1.25, platform: "A2" },
    { lineIdx: 0, operator: "Horizon Bus", hoursOffset: 2, platform: "A3" },
    { lineIdx: 1, operator: "SATAS Express", hoursOffset: 2.5, platform: "B1" },
  ];

  for (const tripData of tripsData) {
    if (!lines[tripData.lineIdx]) continue;
    const departure = new Date(now.getTime() + tripData.hoursOffset * 3600000);
    const arrival = new Date(departure.getTime() + 3 * 3600000); // +3h average

    await db.trip.create({
      data: {
        lineId: lines[tripData.lineIdx].id,
        operatorName: tripData.operator,
        departureTime: departure,
        estimatedArrival: arrival,
        status: "scheduled",
        platform: tripData.platform,
      },
    });
  }
  console.log("✅ Sample trips created");

  // ─── 8. Create Billing Subscription ────────────────────────────────────────
  const existingSub = await db.billingSubscription.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingSub) {
    await db.billingSubscription.create({
      data: {
        tenantId: tenant.id,
        plan: "pro",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("✅ Billing subscription created");
  } else {
    console.log("✅ Billing subscription already exists");
  }

  console.log("\n🎉 Seed complete! Use these credentials to login:");
  console.log("   SuperAdmin:  admin@terangaflow.app / admin123");
  console.log("   Manager:    manager@terangaflow.app / manager123");
  console.log("   Transport:  transporteur@terangaflow.app / transport123");
  console.log("");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e: Error) => {
    console.error("❌ Seed error:", e);
    await db.$disconnect();
    process.exit(1);
  });
