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
import { CompaniesService } from './companies.service.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /** Create a company. Upload header/footer images first via POST /api/files. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    return CompanyResponseDto.fromEntity(
      await this.companiesService.create(dto),
    );
  }

  /** List companies, newest first. Search matches name, registration number and city. */
  @Get()
  @ApiPaginatedResponse(CompanyResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: BaseListQueryDto,
  ): Promise<PaginatedResult<CompanyResponseDto>> {
    const result = await this.companiesService.findAll(query);
    return { ...result, data: result.data.map(CompanyResponseDto.fromEntity) };
  }

  /** Get a company by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyResponseDto> {
    return CompanyResponseDto.fromEntity(
      await this.companiesService.findOne(id),
    );
  }

  /** Update a company. Send headerUrl/footerUrl as null to remove an image. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return CompanyResponseDto.fromEntity(
      await this.companiesService.update(id, dto),
    );
  }

  /** Soft-delete a company. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companiesService.remove(id);
  }
}
