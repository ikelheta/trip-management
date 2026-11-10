import type { Company } from '../entities/company.entity.js';

export class CompanyResponseDto {
  id: string;
  name: string;
  registrationNumber: string;
  city: string;
  address: string;
  whatsAppNumber: string;
  phoneNumber: string;
  headerUrl: string | null;
  footerUrl: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(company: Company): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      registrationNumber: company.registrationNumber,
      city: company.city,
      address: company.address,
      whatsAppNumber: company.whatsAppNumber,
      phoneNumber: company.phoneNumber,
      headerUrl: company.headerUrl,
      footerUrl: company.footerUrl,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
