// SmartTicketQR — API Endpoints Definition
// Complete catalog of all REST API endpoints for the platform

export interface ApiParameter {
  name: string
  type: string
  required: boolean
  description: string
  in: 'query' | 'body'
}

export interface ApiEndpoint {
  id: string
  category: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  path: string
  description: string
  parameters: ApiParameter[]
  requestBody?: Record<string, unknown>
  responseExample: Record<string, unknown>
}

export const apiCategories = [
  { id: 'auth', label: 'Auth', icon: 'Shield' as const },
  { id: 'stations', label: 'Stations', icon: 'Building2' as const },
  { id: 'lines', label: 'Lignes', icon: 'Route' as const },
  { id: 'platforms', label: 'Quais', icon: 'LayoutGrid' as const },
  { id: 'schedules', label: 'Horaires', icon: 'Clock' as const },
  { id: 'ticker', label: 'Ticker', icon: 'ScrollText' as const },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' as const },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store' as const },
  { id: 'api-keys', label: 'Clés API', icon: 'Key' as const },
  { id: 'subscriptions', label: 'Abonnements', icon: 'CreditCard' as const },
  { id: 'invoices', label: 'Factures', icon: 'Receipt' as const },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' as const },
] as const

export type ApiCategoryId = (typeof apiCategories)[number]['id']

export const apiEndpoints: ApiEndpoint[] = [
  // ========================================
  // AUTH
  // ========================================
  {
    id: 'auth-login',
    category: 'auth',
    method: 'POST',
    path: '/api/auth/login',
    description:
      "Authentifie un utilisateur avec son email et renvoie un jeton d'accès mock. Remplaçable par NextAuth.js en production.",
    parameters: [
      {
        name: 'email',
        type: 'string',
        required: true,
        description: "Adresse email de l'utilisateur",
        in: 'body',
      },
    ],
    requestBody: {
      email: 'admin@smartticketqr.sn',
    },
    responseExample: {
      success: true,
      data: {
        id: 'usr_abc123',
        email: 'admin@smartticketqr.sn',
        name: 'Administrateur Principal',
        role: 'SUPERADMIN',
        tenant: {
          id: 'tnt_xyz',
          name: 'SmartTicketQR',
          slug: 'smartticketqr',
          type: 'OPERATOR',
        },
        token: 'mock_token_usr_abc123_1700000000000',
      },
    },
  },
  {
    id: 'auth-roles',
    category: 'auth',
    method: 'GET',
    path: '/api/auth/roles',
    description:
      "Récupère la liste de tous les rôles disponibles avec leurs permissions. Utilisé pour initialiser l'interface RBAC.",
    parameters: [],
    responseExample: {
      success: true,
      data: [
        {
          name: 'SUPERADMIN',
          label: 'Super Administrateur',
          description: 'Accès complet à toutes les fonctionnalités',
          permissions: ['*'],
        },
        {
          name: 'STATION_MANAGER',
          label: 'Gestionnaire de Gare',
          description: 'Gestion des lignes, quais, horaires et messages',
          permissions: [
            'stations:read',
            'stations:write',
            'lines:read',
            'lines:write',
          ],
        },
      ],
    },
  },

  // ========================================
  // STATIONS
  // ========================================
  {
    id: 'stations-list',
    category: 'stations',
    method: 'GET',
    path: '/api/stations',
    description:
      "Récupère la liste de toutes les gares actives avec leurs statistiques (nombre de lignes, quais). Nécessite le rôle TRAVELER ou supérieur.",
    parameters: [],
    responseExample: {
      success: true,
      data: [
        {
          id: 'st_dakar',
          name: 'Gare de Dakar',
          code: 'DKR',
          city: 'Dakar',
          country: 'Sénégal',
          address: 'Avenue de la République',
          timezone: 'Africa/Dakar',
          lat: 14.6937,
          lng: -17.4441,
          _count: { lines: 4, platforms: 8 },
        },
      ],
    },
  },
  {
    id: 'stations-departures',
    category: 'stations',
    method: 'GET',
    path: '/api/departures',
    description:
      "Récupère les départs ou arrivées en temps réel pour une gare donnée. Inclut le temps restant, le statut et les informations de la ligne.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant unique de la gare",
        in: 'query',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type d'affichage : DEPARTURES (défaut) ou ARRIVALS",
        in: 'query',
      },
      {
        name: 'limit',
        type: 'integer',
        required: false,
        description: "Nombre maximum de résultats (1-100, défaut 50)",
        in: 'query',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: "Filtrer par statut : SCHEDULED, BOARDING, DELAYED, DEPARTED, CANCELLED",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: {
        station: {
          name: 'Gare de Dakar',
          code: 'DKR',
          city: 'Dakar',
          timezone: 'Africa/Dakar',
        },
        type: 'DEPARTURES',
        schedules: [
          {
            id: 'sch_001',
            line: {
              name: 'Dakar - Thiès',
              code: 'DKR-THI',
              destination: 'Thiès',
              color: '#10b981',
              type: 'BUS',
            },
            platform: { number: 3, name: 'Quai 3', type: 'STANDARD' },
            departureTime: '08:30',
            adjustedDepartureTime: '08:45',
            minutesUntil: 12,
            status: 'DELAYED',
            delayMinutes: 15,
            vehicleNumber: 'DK-4521-A',
            isUrgent: false,
          },
        ],
        updatedAt: '2025-01-15T08:18:00.000Z',
        serverTime: '08:18:00',
      },
    },
  },

  // ========================================
  // LINES
  // ========================================
  {
    id: 'lines-list',
    category: 'lines',
    method: 'GET',
    path: '/api/lines',
    description:
      'Liste toutes les lignes de transport, optionnellement filtrées par gare ou transporteur.',
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant de gare",
        in: 'query',
      },
      {
        name: 'transporterId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant de transporteur",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'ln_001',
          name: 'Dakar - Thiès',
          code: 'DKR-THI',
          destination: 'Thiès',
          stationId: 'st_dakar',
          color: '#10b981',
          type: 'BUS',
          frequencyMinutes: 30,
          station: { id: 'st_dakar', name: 'Gare de Dakar', code: 'DKR' },
          _count: { schedules: 24, platforms: 2 },
        },
      ],
    },
  },
  {
    id: 'lines-create',
    category: 'lines',
    method: 'POST',
    path: '/api/lines',
    description:
      "Crée une nouvelle ligne de transport. Nécessite le rôle STATION_MANAGER ou SUPERADMIN.",
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Nom de la ligne',
        in: 'body',
      },
      {
        name: 'code',
        type: 'string',
        required: true,
        description: 'Code unique de la ligne (ex: DKR-THI)',
        in: 'body',
      },
      {
        name: 'destination',
        type: 'string',
        required: true,
        description: 'Destination de la ligne',
        in: 'body',
      },
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare d'attache",
        in: 'body',
      },
      {
        name: 'transporterId',
        type: 'string',
        required: false,
        description: 'Identifiant du transporteur',
        in: 'body',
      },
      {
        name: 'color',
        type: 'string',
        required: false,
        description: 'Couleur hexadécimale de la ligne (défaut: #10b981)',
        in: 'body',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type de transport : BUS, TRAIN, TAXI (défaut: BUS)",
        in: 'body',
      },
      {
        name: 'frequencyMinutes',
        type: 'integer',
        required: false,
        description: 'Fréquence en minutes entre les départs (défaut: 30)',
        in: 'body',
      },
    ],
    requestBody: {
      name: 'Dakar - Saint-Louis',
      code: 'DKR-STL',
      destination: 'Saint-Louis',
      stationId: 'st_dakar',
      color: '#f59e0b',
      type: 'BUS',
      frequencyMinutes: 60,
    },
    responseExample: {
      success: true,
      data: {
        id: 'ln_new001',
        name: 'Dakar - Saint-Louis',
        code: 'DKR-STL',
        destination: 'Saint-Louis',
        stationId: 'st_dakar',
        color: '#f59e0b',
        type: 'BUS',
        frequencyMinutes: 60,
      },
    },
  },
  {
    id: 'lines-update',
    category: 'lines',
    method: 'PATCH',
    path: '/api/lines',
    description:
      "Met à jour les informations d'une ligne existante. Champs partiels acceptés.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de la ligne à modifier",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Nouveau nom de la ligne',
        in: 'body',
      },
      {
        name: 'color',
        type: 'string',
        required: false,
        description: 'Nouvelle couleur hexadécimale',
        in: 'body',
      },
      {
        name: 'frequencyMinutes',
        type: 'integer',
        required: false,
        description: 'Nouvelle fréquence en minutes',
        in: 'body',
      },
    ],
    requestBody: {
      id: 'ln_001',
      color: '#8b5cf6',
      frequencyMinutes: 20,
    },
    responseExample: {
      success: true,
      data: {
        id: 'ln_001',
        name: 'Dakar - Thiès',
        code: 'DKR-THI',
        color: '#8b5cf6',
        frequencyMinutes: 20,
      },
    },
  },
  {
    id: 'lines-delete',
    category: 'lines',
    method: 'DELETE',
    path: '/api/lines',
    description:
      'Supprime softly (soft-delete) une ligne de transport. Les données sont conservées mais masquées.',
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de la ligne à supprimer",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      message: 'Line soft-deleted',
    },
  },

  // ========================================
  // PLATFORMS
  // ========================================
  {
    id: 'platforms-list',
    category: 'platforms',
    method: 'GET',
    path: '/api/platforms',
    description:
      'Liste tous les quais, optionnellement filtrés par gare. Inclut les informations de la ligne associée.',
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant de gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'plt_001',
          number: 1,
          name: 'Quai 1',
          type: 'STANDARD',
          stationId: 'st_dakar',
          lineId: 'ln_001',
          station: { id: 'st_dakar', name: 'Gare de Dakar', code: 'DKR' },
          line: { id: 'ln_001', name: 'Dakar - Thiès', code: 'DKR-THI', color: '#10b981' },
          _count: { schedules: 12 },
        },
      ],
    },
  },
  {
    id: 'platforms-create',
    category: 'platforms',
    method: 'POST',
    path: '/api/platforms',
    description:
      "Crée un nouveau quai dans une gare. Nécessite le rôle STATION_MANAGER ou supérieur.",
    parameters: [
      {
        name: 'number',
        type: 'integer',
        required: true,
        description: 'Numéro du quai',
        in: 'body',
      },
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare parente",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: "Nom affiché du quai (défaut: Quai {number})",
        in: 'body',
      },
      {
        name: 'lineId',
        type: 'string',
        required: false,
        description: "Identifiant de la ligne assignée",
        in: 'body',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type : STANDARD, VIP, ACCESSIBLE (défaut: STANDARD)",
        in: 'body',
      },
    ],
    requestBody: {
      number: 5,
      stationId: 'st_dakar',
      name: 'Quai 5 - International',
      type: 'STANDARD',
    },
    responseExample: {
      success: true,
      data: {
        id: 'plt_new001',
        number: 5,
        name: 'Quai 5 - International',
        type: 'STANDARD',
        stationId: 'st_dakar',
      },
    },
  },
  {
    id: 'platforms-update',
    category: 'platforms',
    method: 'PATCH',
    path: '/api/platforms',
    description:
      "Met à jour les informations d'un quai existant.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant du quai à modifier",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Nouveau nom du quai',
        in: 'body',
      },
      {
        name: 'lineId',
        type: 'string',
        required: false,
        description: 'Nouvel identifiant de ligne assignée',
        in: 'body',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Nouveau type de quai",
        in: 'body',
      },
    ],
    requestBody: {
      id: 'plt_001',
      name: 'Quai 1 - Départs Nationaux',
      lineId: 'ln_002',
    },
    responseExample: {
      success: true,
      data: {
        id: 'plt_001',
        number: 1,
        name: 'Quai 1 - Départs Nationaux',
        type: 'STANDARD',
        stationId: 'st_dakar',
        lineId: 'ln_002',
      },
    },
  },

  // ========================================
  // SCHEDULES
  // ========================================
  {
    id: 'schedules-list',
    category: 'schedules',
    method: 'GET',
    path: '/api/schedules',
    description:
      "Liste les horaires de départ avec enrichissement temps réel (minutes restantes, urgence). Nécessite un stationId.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
      {
        name: 'lineId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant de ligne",
        in: 'query',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: "Filtrer par statut",
        in: 'query',
      },
      {
        name: 'limit',
        type: 'integer',
        required: false,
        description: "Nombre maximum de résultats (1-200, défaut 100)",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'sch_001',
          departureTime: '08:30',
          status: 'SCHEDULED',
          delayMinutes: 0,
          daysOfWeek: '1,2,3,4,5',
          vehicleNumber: 'DK-4521-A',
          line: {
            id: 'ln_001',
            name: 'Dakar - Thiès',
            code: 'DKR-THI',
            color: '#10b981',
          },
          platform: { id: 'plt_003', number: 3, name: 'Quai 3' },
          minutesUntil: 45,
          isUrgent: false,
        },
      ],
    },
  },
  {
    id: 'schedules-create',
    category: 'schedules',
    method: 'POST',
    path: '/api/schedules',
    description:
      "Crée un nouvel horaire de départ pour une ligne donnée.",
    parameters: [
      {
        name: 'lineId',
        type: 'string',
        required: true,
        description: "Identifiant de la ligne",
        in: 'body',
      },
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'body',
      },
      {
        name: 'departureTime',
        type: 'string',
        required: true,
        description: "Heure de départ au format HH:mm",
        in: 'body',
      },
      {
        name: 'platformId',
        type: 'string',
        required: false,
        description: "Identifiant du quai assigné",
        in: 'body',
      },
      {
        name: 'daysOfWeek',
        type: 'string',
        required: false,
        description: "Jours de la semaine (ex: 1,2,3,4,5 pour sem. de travail)",
        in: 'body',
      },
      {
        name: 'vehicleNumber',
        type: 'string',
        required: false,
        description: "Immatriculation du véhicule",
        in: 'body',
      },
    ],
    requestBody: {
      lineId: 'ln_001',
      stationId: 'st_dakar',
      departureTime: '09:00',
      platformId: 'plt_003',
      daysOfWeek: '1,2,3,4,5,6',
      vehicleNumber: 'DK-7890-B',
    },
    responseExample: {
      success: true,
      data: {
        id: 'sch_new001',
        lineId: 'ln_001',
        stationId: 'st_dakar',
        departureTime: '09:00',
        platformId: 'plt_003',
        status: 'SCHEDULED',
        daysOfWeek: '1,2,3,4,5,6',
        vehicleNumber: 'DK-7890-B',
      },
    },
  },
  {
    id: 'schedules-update',
    category: 'schedules',
    method: 'PATCH',
    path: '/api/schedules',
    description:
      "Met à jour un horaire spécifique (statut, retard, quai, etc.).",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de l'horaire",
        in: 'body',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: "Nouveau statut : SCHEDULED, BOARDING, DELAYED, DEPARTED, CANCELLED",
        in: 'body',
      },
      {
        name: 'delayMinutes',
        type: 'integer',
        required: false,
        description: "Retard en minutes",
        in: 'body',
      },
      {
        name: 'platformId',
        type: 'string',
        required: false,
        description: "Nouveau quai assigné",
        in: 'body',
      },
    ],
    requestBody: {
      id: 'sch_001',
      status: 'DELAYED',
      delayMinutes: 15,
    },
    responseExample: {
      success: true,
      data: {
        id: 'sch_001',
        status: 'DELAYED',
        delayMinutes: 15,
        departureTime: '08:30',
      },
    },
  },
  {
    id: 'schedules-bulk-update',
    category: 'schedules',
    method: 'PUT',
    path: '/api/schedules',
    description:
      "Met à jour en masse les horaires d'une gare : retard groupé, annulation, réinitialisation.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'body',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: "Action groupée : DELAY_ALL, CANCEL_ALL, RESET_ALL",
        in: 'body',
      },
      {
        name: 'lineId',
        type: 'string',
        required: false,
        description: "Restreindre à une ligne spécifique",
        in: 'body',
      },
      {
        name: 'params',
        type: 'object',
        required: false,
        description: "Paramètres additionnels (ex: delayMinutes pour DELAY_ALL)",
        in: 'body',
      },
    ],
    requestBody: {
      stationId: 'st_dakar',
      action: 'DELAY_ALL',
      lineId: 'ln_001',
      params: { delayMinutes: 30 },
    },
    responseExample: {
      success: true,
      data: { count: 12 },
    },
  },

  // ========================================
  // TICKER
  // ========================================
  {
    id: 'ticker-get',
    category: 'ticker',
    method: 'GET',
    path: '/api/ticker',
    description:
      "Récupère les messages du ticker actifs pour une gare, filtrés par date de début/fin et ordonnés par priorité.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'tm_001',
          stationId: 'st_dakar',
          content: 'Bienvenue à la Gare de Dakar !',
          priority: 10,
          type: 'INFO',
          isActive: true,
          startDate: null,
          endDate: null,
        },
      ],
    },
  },
  {
    id: 'ticker-messages-list',
    category: 'ticker',
    method: 'GET',
    path: '/api/ticker-messages',
    description:
      "Liste tous les messages du ticker d'une gare (incluant inactifs et expirés).",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'tm_001',
          stationId: 'st_dakar',
          content: 'Bienvenue à la Gare de Dakar !',
          priority: 10,
          type: 'INFO',
          isActive: true,
          startDate: null,
          endDate: null,
          createdAt: '2025-01-15T10:00:00.000Z',
        },
      ],
    },
  },
  {
    id: 'ticker-messages-create',
    category: 'ticker',
    method: 'POST',
    path: '/api/ticker-messages',
    description:
      "Crée un nouveau message pour le bandeau d'information défilant.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'body',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: "Contenu du message affiché",
        in: 'body',
      },
      {
        name: 'priority',
        type: 'integer',
        required: false,
        description: "Priorité d'affichage (défaut: 0, plus élevé = premier)",
        in: 'body',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type : INFO, ALERT, URGENT (défaut: INFO)",
        in: 'body',
      },
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: "Date de début d'affichage (ISO 8601)",
        in: 'body',
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: "Date de fin d'affichage (ISO 8601)",
        in: 'body',
      },
    ],
    requestBody: {
      stationId: 'st_dakar',
      content: '⚠️ Retard de 20 min sur la ligne Dakar-Pikine',
      priority: 20,
      type: 'ALERT',
    },
    responseExample: {
      success: true,
      data: {
        id: 'tm_new001',
        stationId: 'st_dakar',
        content: '⚠️ Retard de 20 min sur la ligne Dakar-Pikine',
        priority: 20,
        type: 'ALERT',
        isActive: true,
      },
    },
  },
  {
    id: 'ticker-messages-update',
    category: 'ticker',
    method: 'PATCH',
    path: '/api/ticker-messages',
    description:
      "Met à jour un message du ticker existant.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant du message",
        in: 'body',
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        description: "Nouveau contenu du message",
        in: 'body',
      },
      {
        name: 'priority',
        type: 'integer',
        required: false,
        description: "Nouvelle priorité",
        in: 'body',
      },
      {
        name: 'isActive',
        type: 'boolean',
        required: false,
        description: "Activer/désactiver le message",
        in: 'body',
      },
    ],
    requestBody: {
      id: 'tm_001',
      content: 'Bienvenue à la Gare de Dakar — Service normal',
      priority: 5,
    },
    responseExample: {
      success: true,
      data: {
        id: 'tm_001',
        content: 'Bienvenue à la Gare de Dakar — Service normal',
        priority: 5,
      },
    },
  },
  {
    id: 'ticker-messages-delete',
    category: 'ticker',
    method: 'DELETE',
    path: '/api/ticker-messages',
    description:
      "Supprime softly un message du ticker.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant du message à supprimer",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      message: 'Ticker message deleted',
    },
  },

  // ========================================
  // ANALYTICS
  // ========================================
  {
    id: 'analytics-overview',
    category: 'analytics',
    method: 'GET',
    path: '/api/analytics/overview',
    description:
      "Tableau de bord analytique : vues du jour/semaine, scans QR, statistiques d'horaires et événements récents.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: {
        today: { views: 342, scans: 87, cancelled: 3 },
        week: { views: 2140 },
        schedules: {
          total: 154,
          active: 120,
          delayed: 5,
          boarding: 8,
        },
        recentEvents: [
          {
            id: 'evt_001',
            stationId: 'st_dakar',
            eventType: 'VIEW',
            elementId: 'departures-departures',
            metadata: '{"type":"DEPARTURES","count":24}',
            createdAt: '2025-01-15T08:18:00.000Z',
          },
        ],
      },
    },
  },
  {
    id: 'analytics-usage',
    category: 'analytics',
    method: 'GET',
    path: '/api/usage',
    description:
      "Statistiques d'utilisation de l'API : appels quotidiens, coûts, top endpoints.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
      {
        name: 'days',
        type: 'integer',
        required: false,
        description: "Nombre de jours d'historique (défaut: 7)",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: {
        period: { days: 7, startDate: '2025-01-08T...' },
        summary: {
          totalCalls: 8420,
          totalCost: 8.42,
          avgCallsPerDay: 1203,
          estimatedMonthlyCost: 36.12,
        },
        chartData: [
          { date: '2025-01-09', calls: 1150, uniqueKeys: 3 },
          { date: '2025-01-10', calls: 1280, uniqueKeys: 4 },
        ],
        topEndpoints: [
          { endpoint: '/api/departures', calls: 3200 },
          { endpoint: '/api/schedules', calls: 2100 },
        ],
      },
    },
  },

  // ========================================
  // MARKETPLACE — MERCHANTS
  // ========================================
  {
    id: 'merchants-list',
    category: 'marketplace',
    method: 'GET',
    path: '/api/merchants',
    description:
      "Liste tous les commerçants partenaires d'une gare avec leurs offres actives et statistiques de scans.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'mrc_001',
          stationId: 'st_dakar',
          name: 'Boutique Souvenirs du Sénégal',
          description: 'Artisanat local et souvenirs traditionnels',
          category: 'RETAIL',
          logoUrl: null,
          website: null,
          phone: '+221 77 123 4567',
          _count: { qrScans: 245, offers: 3 },
          offers: [
            {
              id: 'off_001',
              title: '-20% sur les colliers',
              discountValue: 20,
              isActive: true,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'merchants-create',
    category: 'marketplace',
    method: 'POST',
    path: '/api/merchants',
    description:
      "Ajoute un nouveau commerçant partenaire dans le marketplace de la gare.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Nom du commerce',
        in: 'body',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Description du commerce',
        in: 'body',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        description: "Catégorie : RETAIL, FOOD, SERVICES, TRANSPORT (défaut: GENERAL)",
        in: 'body',
      },
      {
        name: 'logoUrl',
        type: 'string',
        required: false,
        description: 'URL du logo du commerce',
        in: 'body',
      },
      {
        name: 'website',
        type: 'string',
        required: false,
        description: 'Site web du commerce',
        in: 'body',
      },
      {
        name: 'phone',
        type: 'string',
        required: false,
        description: 'Numéro de téléphone',
        in: 'body',
      },
    ],
    requestBody: {
      stationId: 'st_dakar',
      name: 'Café Touba Express',
      description: 'Café traditionnel et boissons locales',
      category: 'FOOD',
      phone: '+221 76 987 6543',
    },
    responseExample: {
      success: true,
      data: {
        id: 'mrc_new001',
        stationId: 'st_dakar',
        name: 'Café Touba Express',
        description: 'Café traditionnel et boissons locales',
        category: 'FOOD',
      },
    },
  },
  {
    id: 'merchants-update',
    category: 'marketplace',
    method: 'PATCH',
    path: '/api/merchants',
    description:
      "Met à jour les informations d'un commerçant existant.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant du commerçant",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Nouveau nom',
        in: 'body',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Nouvelle description',
        in: 'body',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        description: 'Nouvelle catégorie',
        in: 'body',
      },
    ],
    requestBody: {
      id: 'mrc_001',
      name: 'Boutique Souvenirs du Sénégal — Renouvelée',
      category: 'RETAIL',
    },
    responseExample: {
      success: true,
      data: {
        id: 'mrc_001',
        name: 'Boutique Souvenirs du Sénégal — Renouvelée',
        category: 'RETAIL',
      },
    },
  },
  {
    id: 'merchants-delete',
    category: 'marketplace',
    method: 'DELETE',
    path: '/api/merchants',
    description:
      "Supprime softly un commerçant et toutes ses offres associées.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant du commerçant à supprimer",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      message: 'Merchant deleted',
    },
  },

  // ========================================
  // MARKETPLACE — OFFERS
  // ========================================
  {
    id: 'offers-list',
    category: 'marketplace',
    method: 'GET',
    path: '/api/offers',
    description:
      "Liste toutes les offres promotionnelles d'un commerçant.",
    parameters: [
      {
        name: 'merchantId',
        type: 'string',
        required: true,
        description: "Identifiant du commerçant",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'off_001',
          merchantId: 'mrc_001',
          title: '-20% sur les colliers',
          description: 'Réduction exceptionnelle sur tous les colliers artisanaux',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          isActive: true,
          startDate: null,
          endDate: null,
          merchant: { name: 'Boutique Souvenirs', category: 'RETAIL' },
        },
      ],
    },
  },
  {
    id: 'offers-create',
    category: 'marketplace',
    method: 'POST',
    path: '/api/offers',
    description:
      "Crée une nouvelle offre promotionnelle pour un commerçant.",
    parameters: [
      {
        name: 'merchantId',
        type: 'string',
        required: true,
        description: "Identifiant du commerçant",
        in: 'body',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: "Titre de l'offre",
        in: 'body',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: "Description détaillée de l'offre",
        in: 'body',
      },
      {
        name: 'discountType',
        type: 'string',
        required: false,
        description: "Type : PERCENTAGE ou FIXED (défaut: PERCENTAGE)",
        in: 'body',
      },
      {
        name: 'discountValue',
        type: 'number',
        required: false,
        description: "Valeur de la réduction (pourcentage ou montant fixe)",
        in: 'body',
      },
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: "Date de début de l'offre (ISO 8601)",
        in: 'body',
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: "Date de fin de l'offre (ISO 8601)",
        in: 'body',
      },
    ],
    requestBody: {
      merchantId: 'mrc_001',
      title: 'Happy Hour -30%',
      description: 'Tous les après-midis de 14h à 17h',
      discountType: 'PERCENTAGE',
      discountValue: 30,
    },
    responseExample: {
      success: true,
      data: {
        id: 'off_new001',
        merchantId: 'mrc_001',
        title: 'Happy Hour -30%',
        discountType: 'PERCENTAGE',
        discountValue: 30,
        isActive: true,
      },
    },
  },
  {
    id: 'offers-update',
    category: 'marketplace',
    method: 'PATCH',
    path: '/api/offers',
    description:
      "Met à jour une offre promotionnelle existante.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de l'offre",
        in: 'body',
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        description: "Nouveau titre",
        in: 'body',
      },
      {
        name: 'discountValue',
        type: 'number',
        required: false,
        description: "Nouvelle valeur de réduction",
        in: 'body',
      },
      {
        name: 'isActive',
        type: 'boolean',
        required: false,
        description: "Activer/désactiver l'offre",
        in: 'body',
      },
    ],
    requestBody: {
      id: 'off_001',
      title: '-25% sur les colliers (Nouvelle offre)',
      discountValue: 25,
    },
    responseExample: {
      success: true,
      data: {
        id: 'off_001',
        title: '-25% sur les colliers (Nouvelle offre)',
        discountValue: 25,
      },
    },
  },
  {
    id: 'offers-delete',
    category: 'marketplace',
    method: 'DELETE',
    path: '/api/offers',
    description:
      "Supprime softly une offre promotionnelle.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de l'offre à supprimer",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      message: 'Offer deleted',
    },
  },

  // ========================================
  // API KEYS
  // ========================================
  {
    id: 'api-keys-list',
    category: 'api-keys',
    method: 'GET',
    path: '/api/api-keys',
    description:
      "Liste toutes les clés API d'un utilisateur ou d'une gare avec statistiques d'utilisation récentes.",
    parameters: [
      {
        name: 'userId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant utilisateur",
        in: 'query',
      },
      {
        name: 'stationId',
        type: 'string',
        required: false,
        description: "Filtrer par identifiant de gare",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'ak_001',
          userId: 'usr_abc123',
          stationId: 'st_dakar',
          name: 'Clé Production — Afficheur Principal',
          key: 'stkqr_live_abc123def456ghi789',
          rateLimit: 1000,
          isActive: true,
          callsLastHour: 120,
          callsLastDay: 2450,
          _count: { usageLogs: 8920 },
        },
      ],
    },
  },
  {
    id: 'api-keys-create',
    category: 'api-keys',
    method: 'POST',
    path: '/api/api-keys',
    description:
      "Génère une nouvelle clé API pour un utilisateur. La clé est renvoyée une seule fois à la création.",
    parameters: [
      {
        name: 'userId',
        type: 'string',
        required: true,
        description: "Identifiant du propriétaire",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        description: "Nom descriptif de la clé",
        in: 'body',
      },
      {
        name: 'stationId',
        type: 'string',
        required: false,
        description: "Gare associée (scope)",
        in: 'body',
      },
      {
        name: 'rateLimit',
        type: 'integer',
        required: false,
        description: "Limite d'appels par heure (défaut: 1000)",
        in: 'body',
      },
    ],
    requestBody: {
      userId: 'usr_abc123',
      name: 'Clé Test — Postman',
      stationId: 'st_dakar',
      rateLimit: 500,
    },
    responseExample: {
      success: true,
      data: {
        id: 'ak_new001',
        userId: 'usr_abc123',
        stationId: 'st_dakar',
        name: 'Clé Test — Postman',
        key: 'stkqr_live_xyz789abc012def345',
        rateLimit: 500,
        isActive: true,
      },
    },
  },
  {
    id: 'api-keys-update',
    category: 'api-keys',
    method: 'PATCH',
    path: '/api/api-keys',
    description:
      "Met à jour les paramètres d'une clé API (nom, limite, statut).",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de la clé API",
        in: 'body',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: "Nouveau nom",
        in: 'body',
      },
      {
        name: 'rateLimit',
        type: 'integer',
        required: false,
        description: "Nouvelle limite d'appels",
        in: 'body',
      },
      {
        name: 'isActive',
        type: 'boolean',
        required: false,
        description: "Activer/désactiver la clé",
        in: 'body',
      },
    ],
    requestBody: {
      id: 'ak_001',
      name: 'Clé Production — Afficheur Principal v2',
      rateLimit: 2000,
    },
    responseExample: {
      success: true,
      data: {
        id: 'ak_001',
        name: 'Clé Production — Afficheur Principal v2',
        rateLimit: 2000,
        isActive: true,
      },
    },
  },
  {
    id: 'api-keys-delete',
    category: 'api-keys',
    method: 'DELETE',
    path: '/api/api-keys',
    description:
      "Supprime softly une clé API. Les appels avec cette clé seront rejetés par la suite.",
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: "Identifiant de la clé à supprimer",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      message: 'API key deleted',
    },
  },

  // ========================================
  // SUBSCRIPTIONS
  // ========================================
  {
    id: 'subscriptions-list',
    category: 'subscriptions',
    method: 'GET',
    path: '/api/subscriptions',
    description:
      "Liste tous les abonnements d'un locataire (tenant) et identifie l'abonnement actif.",
    parameters: [
      {
        name: 'tenantId',
        type: 'string',
        required: true,
        description: "Identifiant du locataire",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: {
        subscriptions: [
          {
            id: 'sub_001',
            tenantId: 'tnt_xyz',
            plan: 'ANALYTICS',
            status: 'ACTIVE',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2025-02-01T00:00:00.000Z',
            _count: { invoices: 2 },
          },
        ],
        active: {
          id: 'sub_001',
          tenantId: 'tnt_xyz',
          plan: 'ANALYTICS',
          status: 'ACTIVE',
        },
      },
    },
  },

  // ========================================
  // INVOICES
  // ========================================
  {
    id: 'invoices-list',
    category: 'invoices',
    method: 'GET',
    path: '/api/invoices',
    description:
      "Liste toutes les factures d'un locataire avec les totaux payés et en attente.",
    parameters: [
      {
        name: 'tenantId',
        type: 'string',
        required: true,
        description: "Identifiant du locataire",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: {
        invoices: [
          {
            id: 'inv_001',
            tenantId: 'tnt_xyz',
            subscriptionId: 'sub_001',
            amount: 4900,
            currency: 'XOF',
            status: 'PAID',
            description: 'Analytics Premium - 1 mois',
            dueDate: '2025-02-01T00:00:00.000Z',
            paidAt: '2025-01-02T10:30:00.000Z',
            subscription: { plan: 'ANALYTICS' },
          },
        ],
        totalPaid: 9800,
        totalPending: 0,
      },
    },
  },

  // ========================================
  // NOTIFICATIONS
  // ========================================
  {
    id: 'notifications-list',
    category: 'notifications',
    method: 'GET',
    path: '/api/notifications',
    description:
      "Récupère les abonnements push ou l'historique des notifications envoyées pour une gare.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'query',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type de données : 'subscriptions' ou 'logs' (défaut: logs)",
        in: 'query',
      },
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'nl_001',
          stationId: 'st_dakar',
          title: 'Retard signalé',
          body: 'La ligne Dakar-Thiès accuse un retard de 15 minutes',
          type: 'ALERT',
          sentCount: 42,
          createdAt: '2025-01-15T08:00:00.000Z',
        },
      ],
    },
  },
  {
    id: 'notifications-send',
    category: 'notifications',
    method: 'POST',
    path: '/api/notifications',
    description:
      "Envoie une notification push (mock FCM) à tous les abonnés d'une gare ou de manière sélective.",
    parameters: [
      {
        name: 'stationId',
        type: 'string',
        required: true,
        description: "Identifiant de la gare",
        in: 'body',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: "Titre de la notification",
        in: 'body',
      },
      {
        name: 'body',
        type: 'string',
        required: false,
        description: "Corps du message",
        in: 'body',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: "Type : INFO, ALERT, URGENT (défaut: INFO)",
        in: 'body',
      },
      {
        name: 'targetAll',
        type: 'boolean',
        required: false,
        description: "Envoyer à tous les abonnés (défaut: false)",
        in: 'body',
      },
    ],
    requestBody: {
      stationId: 'st_dakar',
      title: 'Reprise du service normal',
      body: 'Toutes les lignes de la Gare de Dakar fonctionnent normalement.',
      type: 'INFO',
      targetAll: true,
    },
    responseExample: {
      success: true,
      data: {
        id: 'nl_new001',
        sentCount: 42,
        message: 'Notification envoyée à 42 abonné(s) (mock FCM)',
      },
    },
  },
]

/**
 * Get endpoints filtered by category
 */
export function getEndpointsByCategory(category: string): ApiEndpoint[] {
  return apiEndpoints.filter((ep) => ep.category === category)
}

/**
 * Search endpoints across all categories
 */
export function searchEndpoints(query: string): ApiEndpoint[] {
  const lower = query.toLowerCase()
  return apiEndpoints.filter(
    (ep) =>
      ep.path.toLowerCase().includes(lower) ||
      ep.description.toLowerCase().includes(lower) ||
      ep.method.toLowerCase().includes(lower) ||
      ep.category.toLowerCase().includes(lower) ||
      ep.parameters.some((p) => p.name.toLowerCase().includes(lower))
  )
}
