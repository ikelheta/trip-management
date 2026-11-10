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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CreateInspectionIndicatorDto } from './dto/create-inspection-indicator.dto.js';
import { InspectionIndicatorResponseDto } from './dto/inspection-indicator-response.dto.js';
import { UpdateInspectionIndicatorDto } from './dto/update-inspection-indicator.dto.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('inspection-checklist')
@Controller('inspection-indicators')
export class InspectionIndicatorsController {
  constructor(private readonly checklistService: InspectionChecklistService) {}

  /** Create an indicator (a group of checks). */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(
    @Body() dto: CreateInspectionIndicatorDto,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.createIndicator(dto),
    );
  }

  /** The whole checklist: every indicator with its checks, sorted. Not paginated. */
  @Get()
  async findAll(): Promise<InspectionIndicatorResponseDto[]> {
    const indicators = await this.checklistService.findAllIndicators();
    return indicators.map(InspectionIndicatorResponseDto.fromEntity);
  }

  /** Get an indicator with its checks. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.findIndicator(id),
    );
  }

  /** Update an indicator. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionIndicatorDto,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.updateIndicator(id, dto),
    );
  }

  /** Soft-delete an indicator. Fails while it still has checks. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.checklistService.removeIndicator(id);
  }
}
