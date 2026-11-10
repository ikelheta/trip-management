import { useFormContext } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { localizedName } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { tripsMessages } from '../i18n.ts'
import { NOTE_MAX_LENGTH, type TripFormValues } from '../types/tripSchemas.ts'
import type { InspectionGroup } from '../utils/tripForm.ts'
import { InspectionName } from './InspectionName.tsx'
import styles from './TripSections.module.css'

interface InspectionFieldsetProps {
  groups: InspectionGroup[]
}

export function InspectionFieldset({ groups }: InspectionFieldsetProps) {
  const { language } = useLanguage()
  const m = useMessages(tripsMessages)
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<TripFormValues>()
  const checks = groups.flatMap((group) => group.checks)
  const indexByCheckId = new Map(checks.map((check, index) => [check.checkId, index]))

  function markAllGood(): void {
    checks.forEach((_check, index) => {
      setValue(`results.${index}.status`, 'good', { shouldDirty: true, shouldValidate: true })
    })
  }

  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>{m.inspection.title}</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={markAllGood}>
          {m.inspection.markAllGood}
        </button>
      </div>
      <Field label={m.inspection.inspectedAt} htmlFor="inspectedAt" hint={m.inspection.inspectedAtHint}>
        <input id="inspectedAt" type="datetime-local" className="input" {...register('inspectedAt')} />
      </Field>
      {groups.map((group) => (
        <fieldset key={group.id} className={styles.group}>
          <legend>
            <InspectionName item={group} />
          </legend>
          {group.checks.map((check) => {
            const index = indexByCheckId.get(check.checkId) ?? 0
            const checkErrors = errors.results?.[index]
            const checkName = localizedName(check, language)
            return (
              <div key={check.checkId} className={styles.check}>
                <span>
                  <InspectionName item={check} />
                </span>
                <div className={styles.choices} role="radiogroup" aria-label={checkName}>
                  <label className="checkbox">
                    <input type="radio" value="good" {...register(`results.${index}.status`)} /> {m.results.good}
                  </label>
                  <label className="checkbox">
                    <input type="radio" value="faulty" {...register(`results.${index}.status`)} />{' '}
                    {m.results.faulty}
                  </label>
                </div>
                <input
                  className="input"
                  placeholder={m.inspection.notePlaceholder}
                  aria-label={m.inspection.noteLabel(checkName)}
                  maxLength={NOTE_MAX_LENGTH}
                  {...register(`results.${index}.note`)}
                />
                {(checkErrors?.status || checkErrors?.note) && (
                  <p className={`field-error ${styles.checkError}`} role="alert">
                    {checkErrors.status?.message ?? checkErrors.note?.message}
                  </p>
                )}
              </div>
            )
          })}
        </fieldset>
      ))}
    </section>
  )
}
