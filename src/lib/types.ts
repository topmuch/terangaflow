export type TripStatus = 'ON_TIME' | 'DELAYED' | 'BOARDING' | 'DEPARTED' | 'CANCELLED';
export type TripType = 'departure' | 'arrival';

export interface TripDisplay {
  id: string;
  lineCode: string;
  lineColor: string;
  destination: string;
  scheduledTime: string; // HH:mm
  estimatedTime: string; // HH:mm
  platform: string;
  status: TripStatus;
  delayMinutes?: number;
  type: TripType;
  vehicleNumber?: string;
}
