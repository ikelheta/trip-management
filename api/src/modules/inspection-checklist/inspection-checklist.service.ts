import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Not, type DeepPartial } from 'typeorm';
import { CreateInspectionCheckDto } from './dto/create-inspection-check.dto.js';
import { CreateInspectionIndicatorDto } from './dto/create-inspection-indicator.dto.js';
import { UpdateInspectionCheckDto } from './dto/update-inspection-check.dto.js';
import { UpdateInspectionIndicatorDto } from './dto/update-inspection-indicator.dto.js';
import { InspectionCheck } from './entities/inspection-check.entity.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';
import { InspectionChecksRepository } from './inspection-checks.repository.js';
import { InspectionIndicatorsRepository } from './inspection-indicators.repository.js';

/** A live check whose live indicator is loaded. */
export type ActiveInspectionCheck = InspectionCheck & {
  indicator: InspectionIndicator;
};

@Injectable()
export class InspectionChecklistService {
  constructor(
    private readonly indicatorsRepository: InspectionIndicatorsRepository,
    private readonly checksRepository: InspectionChecksRepository,
  ) {}

  findAllIndicators(): Promise<InspectionIndicator[]> {
    return this.indicatorsRepository.findAllWithChecks();
  }

  // Loads the indicator's live checks too.
  async findIndicator(id: string): Promise<InspectionIndicator> {
    const indicator = await this.indicatorsRepository.findByIdWithChecks(id);
    if (!indicator) {
      throw new NotFoundException(`Inspection indicator ${id} not found`);
    }
    return indicator;
  }

  async createIndicator(
    dto: CreateInspectionIndicatorDto,
  ): Promise<InspectionIndicator> {
    await this.ensureIndicatorNameArIsAvailable(dto.nameAr);
    await this.ensureIndicatorNameEnIsAvailable(dto.nameEn);
    const indicator = await this.indicatorsRepository.create(dto);
    return this.findIndicator(indicator.id);
  }

  async updateIndicator(
    id: string,
    dto: UpdateInspectionIndicatorDto,
  ): Promise<InspectionIndicator> {
    const indicator = await this.findIndicator(id);

    if (dto.nameAr !== undefined && dto.nameAr !== indicator.nameAr) {
      await this.ensureIndicatorNameArIsAvailable(dto.nameAr);
    }
    if (dto.nameEn !== undefined && dto.nameEn !== indicator.nameEn) {
      await this.ensureIndicatorNameEnIsAvailable(dto.nameEn);
    }

    const changes: DeepPartial<InspectionIndicator> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    if (!(await this.indicatorsRepository.update(indicator.id, changes))) {
      throw new NotFoundException(`Inspection indicator ${id} not found`);
    }
    return this.findIndicator(id);
  }

  async removeIndicator(id: string): Promise<void> {
    const indicator = await this.findIndicator(id);
    if (indicator.checks?.length) {
      throw new ConflictException(
        'Inspection indicator still has checks; delete or move them first',
      );
    }
    await this.indicatorsRepository.softDelete(indicator.id);
  }

  async findCheck(id: string): Promise<InspectionCheck> {
    const check = await this.checksRepository.findById(id);
    if (!check) {
      throw new NotFoundException(`Inspection check ${id} not found`);
    }
    return check;
  }

  async createCheck(dto: CreateInspectionCheckDto): Promise<InspectionCheck> {
    await this.ensureIndicatorExists(dto.indicatorId);
    await this.ensureCheckNamesAreAvailable(
      dto.indicatorId,
      dto.nameAr,
      dto.nameEn,
    );
    return this.checksRepository.create(dto);
  }

  async updateCheck(
    id: string,
    dto: UpdateInspectionCheckDto,
  ): Promise<InspectionCheck> {
    const check = await this.findCheck(id);
    const indicatorId = dto.indicatorId ?? check.indicatorId;

    if (indicatorId !== check.indicatorId) {
      await this.ensureIndicatorExists(indicatorId);
    }
    // The resulting names must be free in the target indicator (moving re-checks them).
    await this.ensureCheckNamesAreAvailable(
      indicatorId,
      dto.nameAr ?? check.nameAr,
      dto.nameEn ?? check.nameEn,
      check.id,
    );

    const changes: DeepPartial<InspectionCheck> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.checksRepository.update(check.id, changes);
    if (!saved) {
      throw new NotFoundException(`Inspection check ${id} not found`);
    }
    return saved;
  }

  async removeCheck(id: string): Promise<void> {
    const check = await this.findCheck(id);
    await this.checksRepository.softDelete(check.id);
  }

  /** Every live check with its indicator: the checklist a new inspection must cover. */
  async findActiveChecks(): Promise<ActiveInspectionCheck[]> {
    const checks = await this.checksRepository.findAllWithIndicator();
    // removeIndicator blocks deleting an indicator with live checks; this only
    // guards against rows changed outside the API.
    return checks.filter(
      (check): check is ActiveInspectionCheck => check.indicator !== undefined,
    );
  }

  private async ensureIndicatorExists(indicatorId: string): Promise<void> {
    if (!(await this.indicatorsRepository.exists({ id: indicatorId }))) {
      throw new BadRequestException(
        `Inspection indicator ${indicatorId} does not exist`,
      );
    }
  }

  private async ensureIndicatorNameArIsAvailable(
    nameAr: string,
  ): Promise<void> {
    if (await this.indicatorsRepository.exists({ nameAr })) {
      throw new ConflictException('Arabic name is already in use');
    }
  }

  private async ensureIndicatorNameEnIsAvailable(
    nameEn: string,
  ): Promise<void> {
    if (await this.indicatorsRepository.exists({ nameEn })) {
      throw new ConflictException('English name is already in use');
    }
  }

  private async ensureCheckNamesAreAvailable(
    indicatorId: string,
    nameAr: string,
    nameEn: string,
    exceptId?: string,
  ): Promise<void> {
    const notSelf = exceptId ? { id: Not(exceptId) } : {};
    if (
      await this.checksRepository.exists({ indicatorId, nameAr, ...notSelf })
    ) {
      throw new ConflictException(
        'Arabic name is already used by another check in this indicator',
      );
    }
    if (
      await this.checksRepository.exists({ indicatorId, nameEn, ...notSelf })
    ) {
      throw new ConflictException(
        'English name is already used by another check in this indicator',
      );
    }
  }
}
