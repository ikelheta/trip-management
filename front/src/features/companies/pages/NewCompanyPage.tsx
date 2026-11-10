import { useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { CompanyForm } from '../components/CompanyForm.tsx'
import { useCreateCompany } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'
import { toCreateCompanyRequest } from '../utils/companyRequests.ts'

const EMPTY_COMPANY: CompanyFormValues = {
  name: '',
  registrationNumber: '',
  city: '',
  address: '',
  whatsAppNumber: '',
  phoneNumber: '',
  headerUrl: null,
  footerUrl: null,
}

export function NewCompanyPage() {
  const navigate = useNavigate()
  const m = useMessages(companiesMessages)
  const createCompany = useCreateCompany()

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    const company = await createCompany.mutateAsync(toCreateCompanyRequest(values))
    navigate(ROUTES.company(company.id))
  }

  return (
    <>
      <PageHeader title={m.newPage.title} />
      <CompanyForm
        defaultValues={EMPTY_COMPANY}
        submitLabel={m.newPage.submit}
        cancelTo={ROUTES.companies}
        onSubmit={handleSubmit}
      />
    </>
  )
}
