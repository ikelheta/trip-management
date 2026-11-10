/** backend/contracts/companies.md `Company`. */
export interface Company {
  id: string
  name: string
  registrationNumber: string
  city: string
  address: string
  whatsAppNumber: string
  phoneNumber: string
  /** "/api/files/<id>/download" or null. */
  headerUrl: string | null
  footerUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCompanyRequest {
  name: string
  registrationNumber: string
  city: string
  address: string
  whatsAppNumber: string
  phoneNumber: string
  headerUrl?: string | null
  footerUrl?: string | null
}

/** Omitted = unchanged; headerUrl / footerUrl null = remove the image. */
export type UpdateCompanyRequest = Partial<CreateCompanyRequest>
