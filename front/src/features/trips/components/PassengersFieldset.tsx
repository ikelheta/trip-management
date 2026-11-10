import { useFieldArray, useFormContext } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { tripsMessages } from '../i18n.ts'
import { MAX_PASSENGERS, type TripFormValues } from '../types/tripSchemas.ts'
import { EMPTY_PASSENGER } from '../utils/tripForm.ts'
import { PassengerImport } from './PassengerImport.tsx'
import styles from './TripSections.module.css'

export function PassengersFieldset() {
  const {
    control,
    register,
    trigger,
    formState: { errors },
  } = useFormContext<TripFormValues>()
  const m = useMessages(tripsMessages)
  const { fields, append, remove } = useFieldArray({ control, name: 'passengers' })
  const listError = errors.passengers?.message ?? errors.passengers?.root?.message

  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>{m.passengersHeading(fields.length)}</h2>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={fields.length >= MAX_PASSENGERS}
          onClick={() => append({ ...EMPTY_PASSENGER })}
        >
          {m.passengers.add}
        </button>
      </div>
      <PassengerImport
        existingCount={fields.length}
        onImport={(passengers) => {
          append(passengers, { shouldFocus: false })
          // Show wrong cells at once instead of after the first submit.
          void trigger('passengers')
        }}
      />
      {listError && (
        <p className="field-error" role="alert">
          {listError}
        </p>
      )}
      {fields.length === 0 && <p className="muted">{m.passengers.none}</p>}
      {fields.map((field, index) => {
        const rowErrors = errors.passengers?.[index]
        return (
          <div key={field.id} className={styles.passengerRow}>
            <Field label={m.passengers.name} htmlFor={`passengers.${index}.name`} error={rowErrors?.name?.message}>
              <input
                id={`passengers.${index}.name`}
                className="input"
                aria-invalid={Boolean(rowErrors?.name)}
                {...register(`passengers.${index}.name`)}
              />
            </Field>
            <Field
              label={m.passengers.identityNumber}
              htmlFor={`passengers.${index}.identityNumber`}
              error={rowErrors?.identityNumber?.message}
            >
              <input
                id={`passengers.${index}.identityNumber`}
                className="input"
                inputMode="numeric"
                aria-invalid={Boolean(rowErrors?.identityNumber)}
                {...register(`passengers.${index}.identityNumber`)}
              />
            </Field>
            <Field
              label={m.passengers.docType}
              htmlFor={`passengers.${index}.docType`}
              error={rowErrors?.docType?.message}
            >
              <input
                id={`passengers.${index}.docType`}
                className="input"
                placeholder={m.passengers.docTypePlaceholder}
                aria-invalid={Boolean(rowErrors?.docType)}
                {...register(`passengers.${index}.docType`)}
              />
            </Field>
            <Field
              label={m.passengers.nationality}
              htmlFor={`passengers.${index}.nationality`}
              error={rowErrors?.nationality?.message}
            >
              <input
                id={`passengers.${index}.nationality`}
                className="input"
                aria-invalid={Boolean(rowErrors?.nationality)}
                {...register(`passengers.${index}.nationality`)}
              />
            </Field>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              aria-label={m.passengers.removeLabel(index + 1)}
              onClick={() => remove(index)}
            >
              {m.passengers.remove}
            </button>
          </div>
        )
      })}
    </section>
  )
}
