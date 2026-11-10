import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import type { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import type { FileEntity } from '../files/entities/file.entity.js';
import { FilesService } from '../files/files.service.js';
import { CompaniesRepository } from './companies.repository.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Company } from './entities/company.entity.js';

const FILE_OWNER_TYPE = 'companies';
const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type ImageField = 'headerUrl' | 'footerUrl';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly filesService: FilesService,
  ) {}

  async findAll(query: BaseListQueryDto): Promise<PaginatedResult<Company>> {
    return toPaginatedResult(
      await this.companiesRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }

  exists(id: string): Promise<boolean> {
    return this.companiesRepository.exists({ id });
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    await this.ensureRegistrationNumberIsAvailable(dto.registrationNumber);
    this.ensureDistinctImages(dto.headerUrl, dto.footerUrl);
    const images = [
      await this.resolveImage('headerUrl', dto.headerUrl, null),
      await this.resolveImage('footerUrl', dto.footerUrl, null),
    ];

    const company = await this.companiesRepository.create(dto);
    await this.linkImages(company, images);
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    if (
      dto.registrationNumber !== undefined &&
      dto.registrationNumber !== company.registrationNumber
    ) {
      await this.ensureRegistrationNumberIsAvailable(dto.registrationNumber);
    }
    this.ensureDistinctImages(
      dto.headerUrl === undefined ? company.headerUrl : dto.headerUrl,
      dto.footerUrl === undefined ? company.footerUrl : dto.footerUrl,
    );
    const images = [
      await this.resolveImage('headerUrl', dto.headerUrl, company.id),
      await this.resolveImage('footerUrl', dto.footerUrl, company.id),
    ];
    const previousUrls = [company.headerUrl, company.footerUrl];

    const changes: DeepPartial<Company> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.companiesRepository.update(company.id, changes);
    if (!saved) {
      throw new NotFoundException(`Company ${id} not found`);
    }

    await this.linkImages(saved, images);
    for (const url of previousUrls) {
      if (url && url !== saved.headerUrl && url !== saved.footerUrl) {
        await this.removeImageQuietly(url);
      }
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companiesRepository.softDelete(company.id);
  }

  private async ensureRegistrationNumberIsAvailable(
    registrationNumber: string,
  ): Promise<void> {
    if (await this.companiesRepository.exists({ registrationNumber })) {
      throw new ConflictException('Registration number is already in use');
    }
  }

  private ensureDistinctImages(
    headerUrl: string | null | undefined,
    footerUrl: string | null | undefined,
  ): void {
    if (headerUrl && headerUrl === footerUrl) {
      throw new BadRequestException(
        'headerUrl and footerUrl must be different files',
      );
    }
  }

  // The file must be a live "companies" image that is unlinked or already this company's.
  private async resolveImage(
    field: ImageField,
    url: string | null | undefined,
    companyId: string | null,
  ): Promise<FileEntity | null> {
    if (url === undefined || url === null) {
      return null;
    }
    const file = await this.filesService.findByUrl(url);
    if (
      !file ||
      file.ownerType !== FILE_OWNER_TYPE ||
      (file.ownerId !== null && file.ownerId !== companyId)
    ) {
      throw new BadRequestException(
        `${field} must be the url of a file uploaded with ownerType "${FILE_OWNER_TYPE}" and not used by another company`,
      );
    }
    if (!IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException(
        `${field} must point to a JPEG, PNG or WebP image`,
      );
    }
    return file;
  }

  // Validation already passed; a failed link (lost race) is only logged.
  private async linkImages(
    company: Company,
    files: (FileEntity | null)[],
  ): Promise<void> {
    for (const file of files) {
      if (file && file.ownerId === null) {
        await this.filesService
          .attach(file.id, FILE_OWNER_TYPE, company.id)
          .catch((error: unknown) => {
            this.logger.error(
              `Failed to link file ${file.id} to company ${company.id}`,
              error instanceof Error ? error.stack : error,
            );
          });
      }
    }
  }

  // The company row is the source of truth; a file that fails to delete is only logged.
  private async removeImageQuietly(url: string): Promise<void> {
    const file = await this.filesService.findByUrl(url);
    if (!file) {
      return;
    }
    await this.filesService.remove(file.id).catch((error: unknown) => {
      this.logger.error(
        `Failed to remove company image file ${file.id}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }
}
