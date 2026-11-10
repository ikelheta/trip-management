import type { Ref, SelectHTMLAttributes } from 'react'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAllCompanies } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'

type CompanySelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Label of the empty option (value ""); defaults to "Select a company" in the current language. */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function CompanySelect({ placeholder, ref, className = '', ...props }: CompanySelectProps) {
  const m = useMessages(companiesMessages)
  const companies = useAllCompanies()

  let emptyLabel = placeholder ?? m.select.placeholder
  if (companies.isPending) {
    emptyLabel = m.select.loading
  } else if (companies.isError) {
    emptyLabel = m.select.failed
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {companies.data?.map((company) => (
        <option key={company.id} value={company.id}>
          {m.select.option(company.name, company.registrationNumber)}
        </option>
      ))}
    </select>
  )
}
