import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'

export function toCreateCompanyRequest(values: CompanyFormValues): CreateCompanyRequest {
  return { ...values }
}

/**
 * Image fields follow the PATCH rule: omitted keeps the image, null removes it (the backend
 * deletes the file), a new url replaces it. An unchanged url is never resent.
 */
export function toUpdateCompanyRequest(values: CompanyFormValues, company: Company): UpdateCompanyRequest {
  const body: UpdateCompanyRequest = {
    name: values.name,
    registrationNumber: values.registrationNumber,
    city: values.city,
    address: values.address,
    whatsAppNumber: values.whatsAppNumber,
    phoneNumber: values.phoneNumber,
  }
  if (values.headerUrl !== company.headerUrl) {
    body.headerUrl = values.headerUrl
  }
  if (values.footerUrl !== company.footerUrl) {
    body.footerUrl = values.footerUrl
  }
  return body
}

export function toCompanyFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    registrationNumber: company.registrationNumber,
    city: company.city,
    address: company.address,
    whatsAppNumber: company.whatsAppNumber,
    phoneNumber: company.phoneNumber,
    headerUrl: company.headerUrl,
    footerUrl: company.footerUrl,
  }
}
