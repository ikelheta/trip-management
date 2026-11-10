import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { ImageUploadField } from '../../files/index.ts'
import { companiesMessages } from '../i18n.ts'
import { COMPANY_FORM_FIELDS, createCompanyFormSchema, type CompanyFormValues } from '../types/companySchemas.ts'

// Files uploaded for a company use this ownerType (backend/contracts/companies.md image rule 1).
const COMPANY_FILE_OWNER_TYPE = 'companies'

interface CompanyFormProps {
  defaultValues: CompanyFormValues
  submitLabel: string
  cancelTo: string
  /** Rejects with the API error; the form maps it to fields. */
  onSubmit: (values: CompanyFormValues) => Promise<void>
}

export function CompanyForm({ defaultValues, submitLabel, cancelTo, onSubmit }: CompanyFormProps) {
  const m = useMessages(companiesMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createCompanyFormSchema(m), [m])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({ resolver: zodResolver(schema), defaultValues })

  async function submit(values: CompanyFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, COMPANY_FORM_FIELDS)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(submit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label={m.form.name} htmlFor="name" error={errors.name?.message}>
          <input id="name" className="input" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field
          label={m.form.registrationNumber}
          htmlFor="registrationNumber"
          error={errors.registrationNumber?.message}
          hint={m.form.registrationNumberHint}
        >
          <input
            id="registrationNumber"
            className="input"
            aria-invalid={Boolean(errors.registrationNumber)}
            {...register('registrationNumber')}
          />
        </Field>
        <Field label={m.form.city} htmlFor="city" error={errors.city?.message}>
          <input id="city" className="input" aria-invalid={Boolean(errors.city)} {...register('city')} />
        </Field>
        <Field label={m.form.address} htmlFor="address" error={errors.address?.message}>
          <input id="address" className="input" aria-invalid={Boolean(errors.address)} {...register('address')} />
        </Field>
        <Field label={m.form.phoneNumber} htmlFor="phoneNumber" error={errors.phoneNumber?.message}>
          <input
            id="phoneNumber"
            type="tel"
            className="input"
            aria-invalid={Boolean(errors.phoneNumber)}
            {...register('phoneNumber')}
          />
        </Field>
        <Field label={m.form.whatsAppNumber} htmlFor="whatsAppNumber" error={errors.whatsAppNumber?.message}>
          <input
            id="whatsAppNumber"
            type="tel"
            className="input"
            placeholder="+966500000000"
            aria-invalid={Boolean(errors.whatsAppNumber)}
            {...register('whatsAppNumber')}
          />
        </Field>
      </div>
      <div className="form-grid">
        <Controller
          name="headerUrl"
          control={control}
          render={({ field, fieldState }) => (
            <ImageUploadField
              id="headerUrl"
              label={m.form.headerImage}
              ownerType={COMPANY_FILE_OWNER_TYPE}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="footerUrl"
          control={control}
          render={({ field, fieldState }) => (
            <ImageUploadField
              id="footerUrl"
              label={m.form.footerImage}
              ownerType={COMPANY_FILE_OWNER_TYPE}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>
      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-secondary">
          {common.actions.cancel}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? common.actions.saving : submitLabel}
        </button>
      </div>
    </form>
  )
}
