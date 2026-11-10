import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { CompanySelect, useAllCompanies } from '../../companies/index.ts'
import { useCreateVehicle, useUpdateVehicle } from '../hooks/useVehicles.ts'
import { vehiclesMessages } from '../i18n.ts'
import type { Vehicle } from '../types/vehicle.ts'
import { createVehicleSchema, type VehicleFormValues } from '../types/vehicleSchema.ts'

interface VehicleFormProps {
  vehicle?: Vehicle
}

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const navigate = useNavigate()
  const m = useMessages(vehiclesMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createVehicleSchema(m, common), [m, common])
  const companies = useAllCompanies()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plateNumber: vehicle?.plateNumber ?? '',
      model: vehicle?.model ?? '',
      type: vehicle?.type ?? '',
      companyId: vehicle?.companyId ?? '',
    },
  })

  if (companies.isPending) {
    return <LoadingState label={m.form.loadingCompanies} />
  }
  if (companies.isError) {
    return <ErrorAlert error={companies.error} title={m.form.companiesFailed} />
  }

  async function onSubmit(values: VehicleFormValues): Promise<void> {
    try {
      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, body: values })
      } else {
        await createVehicle.mutateAsync(values)
      }
      navigate(ROUTES.vehicles)
    } catch (error) {
      // "Company <id> does not exist" and 409 "Plate number is already in use" go to FormError.
      applyServerErrors(error, setError, ['plateNumber', 'model', 'type', 'companyId'])
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label={m.form.plateNumber} htmlFor="plateNumber" error={errors.plateNumber?.message}>
          <input
            id="plateNumber"
            className="input"
            aria-invalid={Boolean(errors.plateNumber)}
            {...register('plateNumber')}
          />
        </Field>
        <Field label={m.form.company} htmlFor="companyId" error={errors.companyId?.message}>
          <CompanySelect id="companyId" aria-invalid={Boolean(errors.companyId)} {...register('companyId')} />
        </Field>
        <Field label={m.form.model} htmlFor="model" error={errors.model?.message}>
          <input id="model" className="input" aria-invalid={Boolean(errors.model)} {...register('model')} />
        </Field>
        <Field label={m.form.type} htmlFor="type" error={errors.type?.message} hint={m.form.typeHint}>
          <input id="type" className="input" aria-invalid={Boolean(errors.type)} {...register('type')} />
        </Field>
      </div>
      <div className="form-actions">
        <Link to={ROUTES.vehicles} className="btn btn-secondary">
          {common.actions.cancel}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? common.actions.saving : common.actions.save}
        </button>
      </div>
    </form>
  )
}
