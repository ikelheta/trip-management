import { localizedName, secondaryName, type BilingualName } from '../../../shared/i18n/localizedName.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'

interface InspectionNameProps {
  item: BilingualName
}

/** An indicator or check name: the current language first, the other one as muted text. */
export function InspectionName({ item }: InspectionNameProps) {
  const { language } = useLanguage()
  const secondary = secondaryName(item, language)
  return (
    <>
      {localizedName(item, language)}{' '}
      <span className="muted" lang={secondary.lang} dir={secondary.dir}>
        {secondary.text}
      </span>
    </>
  )
}
