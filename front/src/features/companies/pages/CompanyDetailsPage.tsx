import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { AuthImage } from '../../files/index.ts'
import { DeleteCompanyDialog } from '../components/DeleteCompanyDialog.tsx'
import { useCompany } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'
import styles from './CompanyDetailsPage.module.css'

export function CompanyDetailsPage() {
  const { locale } = useLanguage()
  const m = useMessages(companiesMessages)
  const common = useMessages(commonMessages)
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const company = useCompany(id)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <PageHeader
        title={company.data?.name ?? m.details.fallbackTitle}
        description={company.data?.registrationNumber}
        actions={
          company.data && (
            <>
              <Link to={ROUTES.editCompany(id)} className="btn btn-secondary">
                {common.actions.edit}
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
                {common.actions.delete}
              </button>
            </>
          )
        }
      />
      {company.isPending && <LoadingState />}
      <ErrorAlert error={company.error} />
      {company.data && (
        <div className="stack">
          <section className="card">
            <dl className="details">
              <dt>{m.details.registrationNumber}</dt>
              <dd>{company.data.registrationNumber}</dd>
              <dt>{m.details.city}</dt>
              <dd>{company.data.city}</dd>
              <dt>{m.details.address}</dt>
              <dd>{company.data.address}</dd>
              <dt>{m.details.phone}</dt>
              <dd>{company.data.phoneNumber}</dd>
              <dt>{m.details.whatsApp}</dt>
              <dd>{company.data.whatsAppNumber}</dd>
              <dt>{m.details.created}</dt>
              <dd>{formatDateTime(company.data.createdAt, locale)}</dd>
              <dt>{m.details.updated}</dt>
              <dd>{formatDateTime(company.data.updatedAt, locale)}</dd>
            </dl>
          </section>
          <div className="form-grid">
            <section className="card">
              <h2>{m.details.headerImage}</h2>
              <AuthImage url={company.data.headerUrl} alt={m.details.headerAlt(company.data.name)} className={styles.image} />
            </section>
            <section className="card">
              <h2>{m.details.footerImage}</h2>
              <AuthImage url={company.data.footerUrl} alt={m.details.footerAlt(company.data.name)} className={styles.image} />
            </section>
          </div>
        </div>
      )}
      <DeleteCompanyDialog
        company={deleteOpen ? (company.data ?? null) : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate(ROUTES.companies)}
      />
    </>
  )
}
