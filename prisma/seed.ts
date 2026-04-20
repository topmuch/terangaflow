import { db } from '@/lib/db'

async function main() {
  console.log('🌱 Seeding SmartTicketQR database...')

  // --- TENANTS ---
  const dakarStation = await db.tenant.create({
    data: {
      name: 'Gare Routière de Dakar',
      slug: 'dakar-station',
      type: 'STATION',
      settings: JSON.stringify({
        theme: 'dark',
        primaryColor: '#10b981',
        displayLayout: 'classic',
        language: 'fr',
      }),
    },
  })

  const saintLouisStation = await db.tenant.create({
    data: {
      name: 'Gare Routière de Saint-Louis',
      slug: 'saint-louis-station',
      type: 'STATION',
      settings: JSON.stringify({
        theme: 'dark',
        primaryColor: '#f59e0b',
        displayLayout: 'classic',
        language: 'fr',
      }),
    },
  })

  const thermesTransport = await db.tenant.create({
    data: {
      name: 'Transports Thèrmes',
      slug: 'thermes-transport',
      type: 'TRANSPORTER',
      settings: JSON.stringify({ fleetSize: 45 }),
    },
  })

  const dmaTransport = await db.tenant.create({
    data: {
      name: 'DMA Express',
      slug: 'dma-express',
      type: 'TRANSPORTER',
      settings: JSON.stringify({ fleetSize: 30 }),
    },
  })

  // --- USERS ---
  await db.user.create({
    data: {
      email: 'admin@smartticketqr.com',
      name: 'Super Admin',
      role: 'SUPERADMIN',
      tenantId: dakarStation.id,
    },
  })

  await db.user.create({
    data: {
      email: 'manager@dakar-station.sn',
      name: 'Mamadou Diallo',
      role: 'STATION_MANAGER',
      tenantId: dakarStation.id,
    },
  })

  await db.user.create({
    data: {
      email: 'thermes@transport.sn',
      name: 'Ousmane Thèrmes',
      role: 'TRANSPORTER',
      tenantId: thermesTransport.id,
    },
  })

  // --- STATIONS ---
  const station1 = await db.station.create({
    data: {
      name: 'Gare Routière de Dakar',
      code: 'DKR',
      city: 'Dakar',
      country: 'Sénégal',
      address: 'Avenue Blaise Diagne, Dakar',
      timezone: 'Africa/Dakar',
      tenantId: dakarStation.id,
      lat: 14.6937,
      lng: -17.4441,
      settings: JSON.stringify({
        tickerSpeed: 3,
        autoRefreshSeconds: 30,
        highlightMinutes: 10,
        displayFormat: '1080p',
      }),
    },
  })

  const station2 = await db.station.create({
    data: {
      name: 'Gare Routière de Saint-Louis',
      code: 'SLS',
      city: 'Saint-Louis',
      country: 'Sénégal',
      address: 'Route de l\'Aéroport, Saint-Louis',
      timezone: 'Africa/Dakar',
      tenantId: saintLouisStation.id,
      lat: 16.0336,
      lng: -16.4831,
      settings: JSON.stringify({
        tickerSpeed: 3,
        autoRefreshSeconds: 30,
        highlightMinutes: 10,
        displayFormat: '1080p',
      }),
    },
  })

  const station3 = await db.station.create({
    data: {
      name: 'Gare Maritime de Dakar',
      code: 'GMD',
      city: 'Dakar',
      country: 'Sénégal',
      address: 'Port Autonome de Dakar',
      timezone: 'Africa/Dakar',
      tenantId: dakarStation.id,
      lat: 14.6832,
      lng: -17.4354,
      settings: JSON.stringify({
        tickerSpeed: 4,
        autoRefreshSeconds: 25,
        highlightMinutes: 15,
        displayFormat: '4K',
      }),
    },
  })

  // --- PLATFORMS ---
  const platforms1 = []
  for (let i = 1; i <= 12; i++) {
    const p = await db.platform.create({
      data: {
        number: i,
        name: `Quai ${i}`,
        stationId: station1.id,
        type: i <= 8 ? 'STANDARD' : i <= 10 ? 'EXPRESS' : 'VIP',
      },
    })
    platforms1.push(p)
  }

  const platforms2 = []
  for (let i = 1; i <= 6; i++) {
    const p = await db.platform.create({
      data: {
        number: i,
        name: `Quai ${i}`,
        stationId: station2.id,
        type: 'STANDARD',
      },
    })
    platforms2.push(p)
  }

  // --- LINES ---
  const lines = [
    { name: 'Dakar - Saint-Louis', code: 'D1', destination: 'Saint-Louis', color: '#10b981', type: 'BUS', freq: 30, price: '2500-5000', station: station1, tenant: thermesTransport },
    { name: 'Dakar - Thiès', code: 'D2', destination: 'Thiès', color: '#f59e0b', type: 'BUS', freq: 15, price: '1500-2500', station: station1, tenant: dmaTransport },
    { name: 'Dakar - Kaolack', code: 'D3', destination: 'Kaolack', color: '#ef4444', type: 'BUS', freq: 45, price: '5000-8000', station: station1, tenant: thermesTransport },
    { name: 'Dakar - Ziguinchor', code: 'D4', destination: 'Ziguinchor', color: '#8b5cf6', type: 'BUS', freq: 60, price: '10000-15000', station: station1, tenant: dmaTransport },
    { name: 'Dakar - Tambacounda', code: 'D5', destination: 'Tambacounda', color: '#06b6d4', type: 'BUS', freq: 120, price: '8000-12000', station: station1, tenant: thermesTransport },
    { name: 'Dakar - Louga', code: 'D6', destination: 'Louga', color: '#ec4899', type: 'BUS', freq: 30, price: '2000-3500', station: station1, tenant: dmaTransport },
    { name: 'Express Dakar - AIBD', code: 'E1', destination: 'Aéroport Blaise Diagne', color: '#f97316', type: 'BUS', freq: 20, price: '2000-3000', station: station1, tenant: dmaTransport },
    { name: 'Navette Maritime Gorée', code: 'M1', destination: 'Île de Gorée', color: '#3b82f6', type: 'FERRY', freq: 45, price: '2500-5000', station: station3, tenant: thermesTransport },
    { name: 'Saint-Louis - Dakar', code: 'SL1', destination: 'Dakar', color: '#10b981', type: 'BUS', freq: 30, price: '2500-5000', station: station2, tenant: thermesTransport },
    { name: 'Saint-Louis - Richard-Toll', code: 'SL2', destination: 'Richard-Toll', color: '#a855f7', type: 'BUS', freq: 60, price: '1500-3000', station: station2, tenant: dmaTransport },
  ]

  const createdLines = []
  for (const l of lines) {
    const platform = l.station.id === station1.id
      ? platforms1[Math.floor(Math.random() * 8)]
      : platforms2[Math.floor(Math.random() * 4)]

    const line = await db.line.create({
      data: {
        name: l.name,
        code: l.code,
        destination: l.destination,
        stationId: l.station.id,
        transporterId: l.tenant?.id,
        color: l.color,
        type: l.type,
        frequencyMinutes: l.freq,
        priceRange: JSON.stringify({ min: parseInt(l.price.split('-')[0]), max: parseInt(l.price.split('-')[1]) }),
      },
    })
    createdLines.push(line)

    // Assign platform to line
    await db.platform.update({
      where: { id: platform.id },
      data: { lineId: line.id },
    })
  }

  // --- SCHEDULES ---
  const statuses: Array<'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'CANCELLED'> = ['SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'BOARDING', 'DEPARTED', 'DEPARTED', 'DELAYED', 'SCHEDULED']
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const line of createdLines) {
    const station = line.stationId === station1.id ? station1 : line.stationId === station2.id ? station2 : station3
    const platforms = station.id === station1.id ? platforms1 : station.id === station2.id ? platforms2 : []
    const platform = platforms.length > 0 ? platforms.find(p => p.lineId === line.id) || platforms[0] : null

    // Generate schedules from 2 hours ago to 6 hours from now
    for (let offsetMinutes = -120; offsetMinutes <= 360; offsetMinutes += line.frequencyMinutes) {
      const scheduleTime = currentMinutes + offsetMinutes
      const hours = Math.floor(scheduleTime / 60) % 24
      const minutes = scheduleTime % 60
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      let status: string
      if (offsetMinutes < -30) status = 'DEPARTED'
      else if (offsetMinutes < -10) status = 'DEPARTED'
      else if (offsetMinutes < 0) status = 'DEPARTED'
      else if (offsetMinutes <= 5) status = 'BOARDING'
      else if (offsetMinutes > 0 && offsetMinutes <= 30 && Math.random() > 0.7) status = 'DELAYED'
      else status = 'SCHEDULED'

      const delayMinutes = status === 'DELAYED' ? Math.floor(Math.random() * 30) + 5 : 0

      await db.schedule.create({
        data: {
          lineId: line.id,
          stationId: station.id,
          platformId: platform?.id,
          departureTime: timeStr,
          daysOfWeek: '1,2,3,4,5,6,7',
          status,
          delayMinutes,
          vehicleNumber: `${line.code}-${Math.floor(Math.random() * 900) + 100}`,
        },
      })
    }
  }

  // --- TICKER MESSAGES ---
  await db.tickerMessage.createMany({
    data: [
      { stationId: station1.id, content: '🚌 Bienvenue à la Gare Routière de Dakar — Votre trajet, notre priorité', priority: 10, type: 'INFO' },
      { stationId: station1.id, content: '⚠️ Attention : Fermeture temporaire du Quai 5 pour travaux — Prévoyez 15 min de plus', priority: 20, type: 'ALERT', startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { stationId: station1.id, content: '📱 Scannez le QR code pour recevoir des alertes en temps réel sur votre téléphone', priority: 5, type: 'INFO' },
      { stationId: station1.id, content: '🍕 Restaurant Le Terranga — Menu du jour à 2500 FCFA — Hall Principal', priority: 3, type: 'AD' },
      { stationId: station2.id, content: 'Bienvenue à la Gare de Saint-Louis — Départs toutes les 30 min vers Dakar', priority: 10, type: 'INFO' },
      { stationId: station3.id, content: '⛵ Prochain départ pour Gorée dans 15 minutes — Embarquement Quai A', priority: 15, type: 'ALERT' },
    ],
  })

  // --- MERCHANTS ---
  await db.merchant.createMany({
    data: [
      { stationId: station1.id, name: 'Restaurant Le Terranga', description: 'Cuisine sénégalaise traditionnelle', category: 'RESTAURANT', phone: '+221 77 123 45 67' },
      { stationId: station1.id, name: 'Boutique Souvenirs du Sénégal', description: 'Artisanat local et souvenirs', category: 'SHOP', phone: '+221 78 987 65 43' },
      { stationId: station1.id, name: 'Taxi Dakar Express', description: 'Service de taxi partagé vers le centre-ville', category: 'TRANSPORT', phone: '+221 76 555 44 33' },
      { stationId: station1.id, name: 'Cybercafé Connect', description: 'Internet haut débit et impressions', category: 'SERVICE', phone: '+221 33 822 11 00' },
      { stationId: station2.id, name: 'Auberge du Fleuve', description: 'Hébergement et restaurant face au fleuve', category: 'RESTAURANT', phone: '+221 77 666 77 88' },
    ],
  })

  // --- OFFERS ---
  const dakarMerchants = await db.merchant.findMany({ where: { stationId: station1.id } })
  if (dakarMerchants.length > 0) {
    await db.offer.create({
      data: {
        merchantId: dakarMerchants[0].id,
        title: '-20% sur le Thieboudienne',
        description: 'Offre spéciale pour les voyageurs avec billet SmartTicketQR',
        discountType: 'PERCENTAGE',
        discountValue: 20,
      },
    })
    await db.offer.create({
      data: {
        merchantId: dakarMerchants[1].id,
        title: 'Bracelet cadeau à 1000 FCFA',
        description: 'Bracelet artisanal offert pour tout achat > 5000 FCFA',
        discountType: 'FIXED',
        discountValue: 1000,
      },
    })
  }

  // --- SAMPLE API KEY ---
  const adminUser = await db.user.findFirst({ where: { role: 'SUPERADMIN' } })
  if (adminUser) {
    await db.apiKey.create({
      data: {
        userId: adminUser.id,
        stationId: station1.id,
        name: 'Dakar Station API Key',
        key: 'stkqr_demo_' + Math.random().toString(36).substring(2, 18),
        rateLimit: 1000,
      },
    })
  }

  // --- SUBSCRIPTION ---
  await db.subscription.create({
    data: {
      tenantId: dakarStation.id,
      plan: 'WELCOME_PACK',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log(`   📍 Stations: ${3}`)
  console.log(`   🚌 Lines: ${createdLines.length}`)
  console.log(`   📋 Platforms: ${platforms1.length + platforms2.length}`)
  console.log(`   📢 Ticker Messages: 6`)
  console.log(`   🏪 Merchants: 5`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
