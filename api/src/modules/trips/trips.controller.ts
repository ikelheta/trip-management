import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator.js';
import type { PaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { TripResponseDto } from './dto/trip-response.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripsService } from './trips.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /** Create a trip with an existing vehicle and driver, and its passengers. Generates its QR code. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateTripDto): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.create(dto));
  }

  /** List trips, latest date and time first. Search matches the trip name. */
  @Get()
  @ApiPaginatedResponse(TripResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListTripsQueryDto,
  ): Promise<PaginatedResult<TripResponseDto>> {
    const result = await this.tripsService.findAll(query);
    return { ...result, data: result.data.map(TripResponseDto.fromEntity) };
  }

  /** Get a trip with its passengers. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.findOne(id));
  }

  /** Update a trip. Sending passengers replaces the whole list. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.update(id, dto));
  }

  /** Generate a new QR code for the trip; the previous QR file is deleted. */
  @Post(':id/qr-code')
  @HttpCode(HttpStatus.OK)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async regenerateQrCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(
      await this.tripsService.regenerateQrCode(id),
    );
  }

  /** Soft-delete a trip. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tripsService.remove(id);
  }
}
