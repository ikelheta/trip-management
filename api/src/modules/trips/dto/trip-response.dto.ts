import { TripInspectionResponseDto } from '../../trip-inspections/dto/trip-inspection-response.dto.js';
import type { Trip } from '../entities/trip.entity.js';
import { PassengerResponseDto } from './passenger-response.dto.js';

export class TripResponseDto {
  id: string;
  tripName: string | null;
  secretCode: string | null;
  vehicleId: string;
  driverId: string;
  /** @example "2026-11-15" */
  date: string;
  /** @example "08:30:00" */
  time: string;
  /**
   * Null only for trips created before origin and destination existed.
   * @example "Riyadh"
   */
  origin: string | null;
  /** @example "Jeddah" */
  destination: string | null;
  /**
   * "YYYYMMDD-NNNN" (trip date + sequence per date). Assigned on create; never changes.
   * @example "20261110-0001"
   */
  contractNumber: string;
  /**
   * Download path of the trip's QR code (PNG of the trip's url); null until generated.
   * @example "/api/files/9b2c7c1e-6f0a-4c9e-9a51-0f4f3b8d2a10/download"
   */
  qrCodeUrl: string | null;
  /** Sorted by name. */
  passengers: PassengerResponseDto[];
  /** Pre-trip inspection; null only for trips created before it was required. */
  inspection: TripInspectionResponseDto | null;
  createdAt: Date;
  updatedAt: Date;

  // TripsService loads passengers and the inspection on every read.
  static fromEntity(trip: Trip): TripResponseDto {
    return {
      id: trip.id,
      tripName: trip.tripName,
      secretCode: trip.secretCode,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      date: trip.date,
      time: trip.time,
      origin: trip.origin,
      destination: trip.destination,
      contractNumber: trip.contractNumber,
      qrCodeUrl: trip.qrCodeUrl,
      passengers: (trip.passengers ?? [])
        .map(PassengerResponseDto.fromEntity)
        .sort((a, b) => a.name.localeCompare(b.name)),
      inspection: trip.inspection
        ? TripInspectionResponseDto.fromEntity(trip.inspection)
        : null,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }
}
