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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehicleResponseDto } from './dto/vehicle-response.dto.js';
import { VehiclesService } from './vehicles.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** Create a vehicle for an existing company. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.create(dto),
    );
  }

  /** List vehicles, newest first. Search matches plate number, model and type. */
  @Get()
  @ApiPaginatedResponse(VehicleResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListVehiclesQueryDto,
  ): Promise<PaginatedResult<VehicleResponseDto>> {
    const result = await this.vehiclesService.findAll(query);
    return { ...result, data: result.data.map(VehicleResponseDto.fromEntity) };
  }

  /** Get a vehicle by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.findOne(id),
    );
  }

  /** Update a vehicle. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.update(id, dto),
    );
  }

  /** Soft-delete a vehicle. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
