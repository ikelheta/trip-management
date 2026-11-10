import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { DeleteCompanyDialog } from '../components/DeleteCompanyDialog.tsx'
import { useCompanies } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'
import type { Company } from '../types/companies.ts'

export function CompaniesPage() {
  const m = useMessages(companiesMessages)
  const common = useMessages(commonMessages)
  const { page, search, setPage, setSearch } = useListParams()
  const companies = useCompanies({ page, search })
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const rows = companies.data?.data ?? []

  return (
    <>
      <PageHeader
        title={m.list.title}
        description={m.list.description}
        actions={
          <Link to={ROUTES.newCompany} className="btn btn-primary">
            {m.list.newCompany}
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          placeholder={m.list.searchPlaceholder}
        />
      </div>
      {companies.isPending && <LoadingState />}
      <ErrorAlert error={companies.error} />
      {companies.data && rows.length === 0 && (
        <EmptyState message={search ? m.list.emptySearch : m.list.empty} />
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{m.list.columns.name}</th>
                <th>{m.list.columns.registrationNumber}</th>
                <th>{m.list.columns.city}</th>
                <th>{m.list.columns.phone}</th>
                <th>{m.list.columns.whatsApp}</th>
                <th>
                  <span className="muted">{m.list.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link to={ROUTES.company(company.id)}>{company.name}</Link>
                  </td>
                  <td>{company.registrationNumber}</td>
                  <td>{company.city}</td>
                  <td>{company.phoneNumber}</td>
                  <td>{company.whatsAppNumber}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={ROUTES.editCompany(company.id)} className="btn btn-secondary btn-small">
                        {common.actions.edit}
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => setCompanyToDelete(company)}
                      >
                        {common.actions.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {companies.data && <Pagination meta={companies.data.meta} onPageChange={setPage} />}
      <DeleteCompanyDialog company={companyToDelete} onClose={() => setCompanyToDelete(null)} />
    </>
  )
}
