// ─── prisma/seed-rules.ts ─────────────────────────────────────────────────────────
//
// Seeds notification rules for the existing station.
// Run with: bunx tsx prisma/seed-rules.ts
//

import { db } from "../src/lib/db";

interface SeedRule {
  name: string;
  triggerFrom: string;
  triggerTo: string;
  channel: string;
  template: string;
  repeatEveryMin: number;
  repeatMaxTimes: number;
  priority: number;
}

const RULES: SeedRule[] = [
  {
    name: "Embarquement ouvert",
    triggerFrom: "SCHEDULED",
    triggerTo: "BOARDING",
    channel: "voice",
    template:
      "Le départ pour {destination} au quai {platform} est ouvert. Embarquement immédiat.",
    repeatEveryMin: 0,
    repeatMaxTimes: 0,
    priority: 10,
  },
  {
    name: "Retard signalé",
    triggerFrom: "SCHEDULED",
    triggerTo: "DELAYED",
    channel: "voice",
    template:
      "Attention, le départ pour {destination} est retardé de {delay}. Nouvelle heure à venir.",
    repeatEveryMin: 5,
    repeatMaxTimes: 3,
    priority: 20,
  },
  {
    name: "Annulation départ",
    triggerFrom: "SCHEDULED",
    triggerTo: "CANCELLED",
    channel: "voice",
    template:
      "Le départ pour {destination} est annulé. Merci de contacter le guichet.",
    repeatEveryMin: 0,
    repeatMaxTimes: 0,
    priority: 30,
  },
  {
    name: "Départ effectif",
    triggerFrom: "BOARDING",
    triggerTo: "DEPARTED",
    channel: "voice",
    template:
      "Le véhicule pour {destination} vient de quitter la gare. Bon voyage !",
    repeatEveryMin: 0,
    repeatMaxTimes: 0,
    priority: 10,
  },
  {
    name: "Reprise embarquement après retard",
    triggerFrom: "DELAYED",
    triggerTo: "BOARDING",
    channel: "voice",
    template:
      "Le départ pour {destination} est maintenant ouvert au quai {platform}. Embarquement.",
    repeatEveryMin: 0,
    repeatMaxTimes: 0,
    priority: 15,
  },
];

async function main() {
  console.log("🌱 Seeding notification rules…");

  // ─── Look up the first station ──────────────────────────────────────────────
  const station = await db.station.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (!station) {
    console.error("❌ Aucune gare trouvée. Exécutez d'abord le seed principal.");
    process.exit(1);
  }

  console.log(`📍 Station: ${station.name} (${station.id})`);

  // ─── Upsert each rule (delete-then-create to avoid unique constraint) ──────
  for (const ruleData of RULES) {
    // Delete existing rule with same name + stationId if it exists
    const existing = await db.notificationRule.findFirst({
      where: {
        name: ruleData.name,
        stationId: station.id,
      },
    });

    if (existing) {
      await db.notificationRule.delete({ where: { id: existing.id } });
      console.log(`   🗑️  Deleted existing rule: "${ruleData.name}"`);
    }

    // Create fresh
    await db.notificationRule.create({
      data: {
        ...ruleData,
        stationId: station.id,
        isActive: true,
      },
    });

    console.log(`   ✅ Created rule: "${ruleData.name}"`);
  }

  console.log(`\n🎉 ${RULES.length} notification rules seeded for "${station.name}".`);
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
