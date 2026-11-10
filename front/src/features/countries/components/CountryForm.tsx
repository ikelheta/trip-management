import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateCountry, useUpdateCountry } from '../hooks/useCountries.ts'
import { countriesMessages } from '../i18n.ts'
import type { Country } from '../types/country.ts'
import { createCountrySchema, type CountryFormValues } from '../types/countrySchema.ts'

interface CountryFormProps {
  country?: Country
  onDone: () => void
}

export function CountryForm({ country, onDone }: CountryFormProps) {
  const m = useMessages(countriesMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createCountrySchema(common), [common])
  const createCountry = useCreateCountry()
  const updateCountry = useUpdateCountry()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CountryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nameEn: country?.nameEn ?? '', nameAr: country?.nameAr ?? '' },
  })

  async function onSubmit(values: CountryFormValues): Promise<void> {
    try {
      if (country) {
        await updateCountry.mutateAsync({ id: country.id, body: values })
      } else {
        await createCountry.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // 409 "Arabic name is already in use" has no field prefix, so it lands in FormError.
      applyServerErrors(error, setError, ['nameEn', 'nameAr'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label={m.form.nameEn} htmlFor="nameEn" error={errors.nameEn?.message}>
        <input
          id="nameEn"
          className="input"
          dir="ltr"
          lang="en"
          aria-invalid={Boolean(errors.nameEn)}
          {...register('nameEn')}
        />
      </Field>
      <Field label={m.form.nameAr} htmlFor="nameAr" error={errors.nameAr?.message}>
        <input
          id="nameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={isSubmitting}>
          {common.actions.cancel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? common.actions.saving : common.actions.save}
        </button>
      </div>
    </form>
  )
}
