import { TripDisplay } from '@/lib/types';

export const MOCK_STATIONS = [
  { id: 'dkr-1', name: 'GARE ROUTIÈRE PETERS', city: 'DAKAR', code: 'DKR', timezone: 'Africa/Dakar' },
  { id: 'ths-1', name: 'GARE ROUTIÈRE DE THIÈS', city: 'THIÈS', code: 'THS', timezone: 'Africa/Dakar' },
  { id: 'sls-1', name: 'GARE ROUTIÈRE DE SAINT-LOUIS', city: 'SAINT-LOUIS', code: 'SLS', timezone: 'Africa/Dakar' },
];

export const MOCK_DEPARTURES: TripDisplay[] = [
  { id: '1', lineCode: 'L10', lineColor: '#2563eb', destination: 'DAKAR - Gare Centrale', scheduledTime: '14:15', estimatedTime: '14:15', platform: 'Quai 3', status: 'ON_TIME', type: 'departure' },
  { id: '2', lineCode: 'L24', lineColor: '#10b981', destination: 'MBOUR - Terminal', scheduledTime: '14:20', estimatedTime: '14:35', platform: 'Quai 1', status: 'DELAYED', delayMinutes: 15, type: 'departure' },
  { id: '3', lineCode: 'L05', lineColor: '#f59e0b', destination: 'THIÈS - Centre', scheduledTime: '14:25', estimatedTime: '14:25', platform: 'Quai 5', status: 'BOARDING', type: 'departure' },
  { id: '4', lineCode: 'L08', lineColor: '#ef4444', destination: 'SAINT-LOUIS - Gare', scheduledTime: '14:10', estimatedTime: '14:10', platform: 'Quai 2', status: 'DEPARTED', type: 'departure' },
  { id: '5', lineCode: 'L15', lineColor: '#8b5cf6', destination: 'LOUGA - Croisement', scheduledTime: '14:30', estimatedTime: '14:30', platform: 'Quai 7', status: 'ON_TIME', type: 'departure' },
  { id: '6', lineCode: 'L03', lineColor: '#ec4899', destination: 'KAOLACK - marché', scheduledTime: '14:45', estimatedTime: '14:45', platform: 'Quai 4', status: 'ON_TIME', type: 'departure' },
  { id: '7', lineCode: 'L12', lineColor: '#06b6d4', destination: 'RUFISQUE - Gare', scheduledTime: '14:50', estimatedTime: '15:10', platform: 'Quai 6', status: 'DELAYED', delayMinutes: 20, type: 'departure' },
  { id: '8', lineCode: 'L09', lineColor: '#2563eb', destination: 'DIAMNIADIO - AIBD', scheduledTime: '13:55', estimatedTime: '13:55', platform: 'Quai 8', status: 'DEPARTED', type: 'departure' },
  { id: '9', lineCode: 'L18', lineColor: '#f97316', destination: 'TAMBACOUNDA', scheduledTime: '15:00', estimatedTime: '15:00', platform: 'Quai 2', status: 'CANCELLED', type: 'departure' },
  { id: '10', lineCode: 'L22', lineColor: '#14b8a6', destination: 'ZIGUINCHOR - Terminal', scheduledTime: '15:15', estimatedTime: '15:15', platform: 'Quai 1', status: 'ON_TIME', type: 'departure' },
];
