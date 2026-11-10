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
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { DriverResponseDto } from './dto/driver-response.dto.js';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { DriversService } from './drivers.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /** Create a driver with an existing nationality and vehicle. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateDriverDto): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(await this.driversService.create(dto));
  }

  /** List drivers, newest first. Search matches name and identity id. */
  @Get()
  @ApiPaginatedResponse(DriverResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListDriversQueryDto,
  ): Promise<PaginatedResult<DriverResponseDto>> {
    const result = await this.driversService.findAll(query);
    return { ...result, data: result.data.map(DriverResponseDto.fromEntity) };
  }

  /** Get a driver by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(await this.driversService.findOne(id));
  }

  /** Update a driver. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(
      await this.driversService.update(id, dto),
    );
  }

  /** Soft-delete a driver. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.driversService.remove(id);
  }
}
