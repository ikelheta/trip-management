import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, type DeepPartial } from 'typeorm';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { DriversService } from '../drivers/drivers.service.js';
import { FilesService } from '../files/files.service.js';
import { TripInspectionsService } from '../trip-inspections/trip-inspections.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import type { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { Trip } from './entities/trip.entity.js';
import { PassengersRepository } from './passengers.repository.js';
import { renderTripQrCode, toTripQrUrl } from './trip-qr-code.js';
import { TripsRepository } from './trips.repository.js';

const FILE_OWNER_TYPE = 'trips';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);
  private readonly qrBaseUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tripsRepository: TripsRepository,
    private readonly passengersRepository: PassengersRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly tripInspectionsService: TripInspectionsService,
    private readonly filesService: FilesService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.qrBaseUrl = config.get('TRIP_QR_BASE_URL', { infer: true });
  }

  async findAll(query: ListTripsQueryDto): Promise<PaginatedResult<Trip>> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }
    const [trips, total] = await this.tripsRepository.findPaginated(query);
    await this.attachInspections(trips);
    return toPaginatedResult([trips, total], query);
  }

  // Loads the passengers and the inspection too.
  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripsRepository.findByIdWithPassengers(id);
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    await this.attachInspections([trip]);
    return trip;
  }

  async create(dto: CreateTripDto): Promise<Trip> {
    await this.ensureVehicleExists(dto.vehicleId);
    await this.ensureDriverExists(dto.driverId);

    const { passengers = [], inspection, ...fields } = dto;
    const preparedInspection =
      await this.tripInspectionsService.prepare(inspection);
    const tripId = await this.dataSource.transaction(async (manager) => {
      const contractNumber = await this.tripsRepository.nextContractNumber(
        fields.date,
        manager,
      );
      const trip = await this.tripsRepository.create(
        { ...fields, contractNumber },
        manager,
      );
      await this.passengersRepository.replaceForTrip(
        trip.id,
        passengers,
        manager,
      );
      await this.tripInspectionsService.createForTrip(
        trip.id,
        preparedInspection,
        manager,
      );
      return trip.id;
    });
    // The trip is committed; a failed QR code is only logged (POST /trips/:id/qr-code retries).
    await this.createQrCode(tripId).catch((error: unknown) => {
      this.logger.error(
        `Failed to generate the QR code of trip ${tripId}`,
        error instanceof Error ? error.stack : error,
      );
    });
    return this.findOne(tripId);
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findOne(id);

    if (dto.vehicleId !== undefined && dto.vehicleId !== trip.vehicleId) {
      await this.ensureVehicleExists(dto.vehicleId);
    }
    if (dto.driverId !== undefined && dto.driverId !== trip.driverId) {
      await this.ensureDriverExists(dto.driverId);
    }

    const { passengers, inspection, ...fields } = dto;
    const changes: DeepPartial<Trip> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    await this.dataSource.transaction(async (manager) => {
      if (!(await this.tripsRepository.update(trip.id, changes, manager))) {
        throw new NotFoundException(`Trip ${id} not found`);
      }
      if (passengers !== undefined) {
        await this.passengersRepository.replaceForTrip(
          trip.id,
          passengers,
          manager,
        );
      }
      if (inspection !== undefined) {
        await this.tripInspectionsService.updateForTrip(
          trip.id,
          inspection,
          manager,
        );
      }
    });
    return this.findOne(id);
  }

  /** Generates a new QR code and soft-deletes the previous one. */
  async regenerateQrCode(id: string): Promise<Trip> {
    const trip = await this.findOne(id);
    await this.createQrCode(trip.id);
    if (trip.qrCodeUrl) {
      await this.removeQrCodeQuietly(trip.qrCodeUrl);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.tripsRepository.exists({ id }))) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    await this.tripsRepository.softDelete(id);
  }

  private async attachInspections(trips: Trip[]): Promise<void> {
    const inspections = await this.tripInspectionsService.findByTripIds(
      trips.map((trip) => trip.id),
    );
    const byTripId = new Map(
      inspections.map((inspection) => [inspection.tripId, inspection]),
    );
    for (const trip of trips) {
      trip.inspection = byTripId.get(trip.id) ?? null;
    }
  }

  // Uploads a PNG of the trip's url as a "trips" file and stores the file's url on the trip.
  private async createQrCode(tripId: string): Promise<void> {
    const file = await this.filesService.upload(
      {
        originalname: `trip-${tripId}-qr.png`,
        mimetype: 'image/png',
        buffer: await renderTripQrCode(toTripQrUrl(this.qrBaseUrl, tripId)),
      },
      FILE_OWNER_TYPE,
      tripId,
    );
    if (!(await this.tripsRepository.update(tripId, { qrCodeUrl: file.url }))) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }
  }

  // The trip row is the source of truth; an old file that fails to delete is only logged.
  private async removeQrCodeQuietly(url: string): Promise<void> {
    const file = await this.filesService.findByUrl(url);
    if (!file) {
      return;
    }
    await this.filesService.remove(file.id).catch((error: unknown) => {
      this.logger.error(
        `Failed to remove trip QR code file ${file.id}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }

  private async ensureVehicleExists(vehicleId: string): Promise<void> {
    if (!(await this.vehiclesService.exists(vehicleId))) {
      throw new BadRequestException(`Vehicle ${vehicleId} does not exist`);
    }
  }

  private async ensureDriverExists(driverId: string): Promise<void> {
    if (!(await this.driversService.exists(driverId))) {
      throw new BadRequestException(`Driver ${driverId} does not exist`);
    }
  }
}
