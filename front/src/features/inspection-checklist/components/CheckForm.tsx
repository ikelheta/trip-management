import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { localizedName } from '../../../shared/i18n/localizedName.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateCheck, useUpdateCheck } from '../hooks/useInspectionChecklist.ts'
import { inspectionChecklistMessages } from '../i18n.ts'
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'
import {
  createCheckSchema,
  SORT_ORDER_MAX,
  SORT_ORDER_MIN,
  type CheckFormValues,
} from '../types/inspectionChecklistSchemas.ts'

interface CheckFormProps {
  check?: InspectionCheck
  indicatorId: string
  indicators: InspectionIndicator[]
  onDone: () => void
}

export function CheckForm({ check, indicatorId, indicators, onDone }: CheckFormProps) {
  const { language } = useLanguage()
  const m = useMessages(inspectionChecklistMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createCheckSchema(m, common), [m, common])
  const createCheck = useCreateCheck()
  const updateCheck = useUpdateCheck()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      indicatorId: check?.indicatorId ?? indicatorId,
      nameEn: check?.nameEn ?? '',
      nameAr: check?.nameAr ?? '',
      sortOrder: check?.sortOrder ?? 0,
    },
  })

  async function onSubmit(values: CheckFormValues): Promise<void> {
    try {
      if (check) {
        await updateCheck.mutateAsync({ id: check.id, body: values })
      } else {
        await createCheck.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // "Inspection indicator <id> does not exist" and the 409 name messages go to FormError.
      applyServerErrors(error, setError, ['indicatorId', 'nameEn', 'nameAr', 'sortOrder'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label={m.form.indicator} htmlFor="checkIndicatorId" error={errors.indicatorId?.message}>
        <select
          id="checkIndicatorId"
          className="input"
          aria-invalid={Boolean(errors.indicatorId)}
          {...register('indicatorId')}
        >
          <option value="">{m.form.selectIndicator}</option>
          {indicators.map((indicator) => (
            <option key={indicator.id} value={indicator.id}>
              {localizedName(indicator, language)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={m.form.nameEn} htmlFor="checkNameEn" error={errors.nameEn?.message}>
        <input
          id="checkNameEn"
          className="input"
          dir="ltr"
          lang="en"
          aria-invalid={Boolean(errors.nameEn)}
          {...register('nameEn')}
        />
      </Field>
      <Field label={m.form.nameAr} htmlFor="checkNameAr" error={errors.nameAr?.message}>
        <input
          id="checkNameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <Field
        label={m.form.sortOrder}
        htmlFor="checkSortOrder"
        error={errors.sortOrder?.message}
        hint={m.form.sortOrderHint(SORT_ORDER_MIN, SORT_ORDER_MAX)}
      >
        <input
          id="checkSortOrder"
          type="number"
          min={SORT_ORDER_MIN}
          max={SORT_ORDER_MAX}
          step={1}
          className="input"
          aria-invalid={Boolean(errors.sortOrder)}
          {...register('sortOrder', { valueAsNumber: true })}
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
