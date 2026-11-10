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
import { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import type { PaginatedResult } from '../../common/utils/pagination.util.js';
import { CountriesService } from './countries.service.js';
import { CountryResponseDto } from './dto/country-response.dto.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  /** Create a country. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateCountryDto): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.create(dto),
    );
  }

  /** List countries, newest first. Search matches nameAr and nameEn. */
  @Get()
  @ApiPaginatedResponse(CountryResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: BaseListQueryDto,
  ): Promise<PaginatedResult<CountryResponseDto>> {
    const result = await this.countriesService.findAll(query);
    return { ...result, data: result.data.map(CountryResponseDto.fromEntity) };
  }

  /** Get a country by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.findOne(id),
    );
  }

  /** Update a country. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.update(id, dto),
    );
  }

  /** Soft-delete a country. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.countriesService.remove(id);
  }
}
