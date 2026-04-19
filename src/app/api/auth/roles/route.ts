import { NextResponse } from 'next/server'

// GET /api/auth/roles - Get all available roles with permissions
export async function GET() {
  const roles = [
    {
      name: 'SUPERADMIN',
      label: 'Super Administrateur',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: ['*'],
      color: 'text-red-400',
    },
    {
      name: 'STATION_MANAGER',
      label: 'Gestionnaire de Gare',
      description: 'Gestion des lignes, quais, horaires et messages',
      permissions: ['stations:read', 'stations:write', 'lines:read', 'lines:write', 'platforms:read', 'platforms:write', 'schedules:read', 'schedules:write', 'ticker:read', 'ticker:write', 'analytics:read'],
      color: 'text-emerald-400',
    },
    {
      name: 'TRANSPORTER',
      label: 'Transporteur',
      description: 'Gestion des véhicules et signalements',
      permissions: ['lines:read', 'schedules:read', 'schedules:write', 'vehicles:read', 'vehicles:write', 'delays:report'],
      color: 'text-sky-400',
    },
    {
      name: 'MERCHANT',
      label: 'Commerçant Partenaire',
      description: 'Gestion de la boutique et des offres',
      permissions: ['merchants:read', 'merchants:write', 'offers:read', 'offers:write'],
      color: 'text-amber-400',
    },
    {
      name: 'TRAVELER',
      label: 'Voyageur',
      description: 'Consultation des départs et alertes',
      permissions: ['stations:read', 'departures:read', 'push:subscribe'],
      color: 'text-zinc-400',
    },
  ]

  return NextResponse.json({ success: true, data: roles })
}
