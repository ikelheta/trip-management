import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateIndicator, useUpdateIndicator } from '../hooks/useInspectionChecklist.ts'
import { inspectionChecklistMessages } from '../i18n.ts'
import type { InspectionIndicator } from '../types/inspectionChecklist.ts'
import {
  createIndicatorSchema,
  SORT_ORDER_MAX,
  SORT_ORDER_MIN,
  type IndicatorFormValues,
} from '../types/inspectionChecklistSchemas.ts'

interface IndicatorFormProps {
  indicator?: InspectionIndicator
  onDone: () => void
}

export function IndicatorForm({ indicator, onDone }: IndicatorFormProps) {
  const m = useMessages(inspectionChecklistMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createIndicatorSchema(m, common), [m, common])
  const createIndicator = useCreateIndicator()
  const updateIndicator = useUpdateIndicator()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IndicatorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameEn: indicator?.nameEn ?? '',
      nameAr: indicator?.nameAr ?? '',
      sortOrder: indicator?.sortOrder ?? 0,
    },
  })

  async function onSubmit(values: IndicatorFormValues): Promise<void> {
    try {
      if (indicator) {
        await updateIndicator.mutateAsync({ id: indicator.id, body: values })
      } else {
        await createIndicator.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // 409 "Arabic name is already in use" / "English name is already in use" go to FormError.
      applyServerErrors(error, setError, ['nameEn', 'nameAr', 'sortOrder'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label={m.form.nameEn} htmlFor="indicatorNameEn" error={errors.nameEn?.message}>
        <input
          id="indicatorNameEn"
          className="input"
          dir="ltr"
          lang="en"
          aria-invalid={Boolean(errors.nameEn)}
          {...register('nameEn')}
        />
      </Field>
      <Field label={m.form.nameAr} htmlFor="indicatorNameAr" error={errors.nameAr?.message}>
        <input
          id="indicatorNameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <Field
        label={m.form.sortOrder}
        htmlFor="indicatorSortOrder"
        error={errors.sortOrder?.message}
        hint={m.form.sortOrderHint(SORT_ORDER_MIN, SORT_ORDER_MAX)}
      >
        <input
          id="indicatorSortOrder"
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
