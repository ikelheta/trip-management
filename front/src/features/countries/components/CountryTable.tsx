import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { Language } from '../../../shared/i18n/language.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { countriesMessages } from '../i18n.ts'
import type { Country } from '../types/country.ts'

type NameColumn = 'nameEn' | 'nameAr'

// The current language's name column comes first.
const NAME_COLUMNS: Record<Language, NameColumn[]> = {
  en: ['nameEn', 'nameAr'],
  ar: ['nameAr', 'nameEn'],
}

const NAME_LANGUAGE: Record<NameColumn, { lang: string; dir: 'ltr' | 'rtl' } | undefined> = {
  nameEn: undefined,
  nameAr: { lang: 'ar', dir: 'rtl' },
}

interface CountryTableProps {
  countries: Country[]
  onEdit: (country: Country) => void
  onDelete: (country: Country) => void
}

export function CountryTable({ countries, onEdit, onDelete }: CountryTableProps) {
  const { language, locale } = useLanguage()
  const m = useMessages(countriesMessages)
  const common = useMessages(commonMessages)
  const nameColumns = NAME_COLUMNS[language]

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {nameColumns.map((column) => (
              <th key={column}>{m.list.columns[column]}</th>
            ))}
            <th>{m.list.columns.updated}</th>
            <th>
              <span className="visually-hidden">{m.list.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.id}>
              {nameColumns.map((column) => (
                <td key={column} {...NAME_LANGUAGE[column]}>
                  {country[column]}
                </td>
              ))}
              <td>{formatDateTime(country.updatedAt, locale)}</td>
              <td>
                <div className="table-actions">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => onEdit(country)}>
                    {common.actions.edit}
                  </button>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(country)}>
                    {common.actions.delete}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
