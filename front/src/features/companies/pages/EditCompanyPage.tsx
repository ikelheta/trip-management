import { useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { CompanyForm } from '../components/CompanyForm.tsx'
import { useCompany, useUpdateCompany } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'
import { toCompanyFormValues, toUpdateCompanyRequest } from '../utils/companyRequests.ts'

export function EditCompanyPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const m = useMessages(companiesMessages)
  const company = useCompany(id)
  const updateCompany = useUpdateCompany()

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    if (!company.data) {
      return
    }
    await updateCompany.mutateAsync({ id, body: toUpdateCompanyRequest(values, company.data) })
    navigate(ROUTES.company(id))
  }

  return (
    <>
      <PageHeader title={m.editPage.title} description={company.data?.name} />
      {company.isPending && <LoadingState />}
      <ErrorAlert error={company.error} />
      {company.data && (
        <CompanyForm
          defaultValues={toCompanyFormValues(company.data)}
          submitLabel={m.editPage.submit}
          cancelTo={ROUTES.company(id)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
