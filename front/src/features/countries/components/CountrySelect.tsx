import { useMemo, type Ref, type SelectHTMLAttributes } from 'react'
import { bilingualLabel, localizedName } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { useAllCountries } from '../hooks/useCountries.ts'
import { countriesMessages } from '../i18n.ts'

interface CountrySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label of the empty option (value ""); defaults to "Select a country" in the current language. */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function CountrySelect({ placeholder, ref, className = '', ...props }: CountrySelectProps) {
  const { language, locale } = useLanguage()
  const m = useMessages(countriesMessages)
  const countries = useAllCountries()

  // One cache (sorted by English name) serves both languages; order by the current language's name here.
  const options = useMemo(
    () =>
      [...(countries.data ?? [])].sort((a, b) =>
        localizedName(a, language).localeCompare(localizedName(b, language), locale),
      ),
    [countries.data, language, locale],
  )

  let emptyLabel = placeholder ?? m.select.placeholder
  if (countries.isPending) {
    emptyLabel = m.select.loading
  } else if (countries.isError) {
    emptyLabel = m.select.failed
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {options.map((country) => (
        <option key={country.id} value={country.id}>
          {bilingualLabel(country, language)}
        </option>
      ))}
    </select>
  )
}
