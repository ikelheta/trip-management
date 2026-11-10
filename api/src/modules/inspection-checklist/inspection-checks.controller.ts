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
import { CreateInspectionCheckDto } from './dto/create-inspection-check.dto.js';
import { InspectionCheckResponseDto } from './dto/inspection-check-response.dto.js';
import { UpdateInspectionCheckDto } from './dto/update-inspection-check.dto.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';

// List checks through GET /inspection-indicators (grouped). Mapping happens here.
@ApiTags('inspection-checklist')
@Controller('inspection-checks')
export class InspectionChecksController {
  constructor(private readonly checklistService: InspectionChecklistService) {}

  /** Create a check in an existing indicator. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(
    @Body() dto: CreateInspectionCheckDto,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.createCheck(dto),
    );
  }

  /** Get a check. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.findCheck(id),
    );
  }

  /** Update a check, or move it to another indicator. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionCheckDto,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.updateCheck(id, dto),
    );
  }

  /** Soft-delete a check. Past inspections keep their copy of it. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.checklistService.removeCheck(id);
  }
}
