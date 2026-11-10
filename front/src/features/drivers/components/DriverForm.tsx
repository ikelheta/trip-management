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
import { CountrySelect, useAllCountries } from '../../countries/index.ts'
import { VehicleSelect, useAllVehicles } from '../../vehicles/index.ts'
import { useCreateDriver, useUpdateDriver } from '../hooks/useDrivers.ts'
import { driversMessages } from '../i18n.ts'
import type { Driver } from '../types/driver.ts'
import { createDriverSchema, type DriverFormValues } from '../types/driverSchema.ts'

interface DriverFormProps {
  driver?: Driver
}

export function DriverForm({ driver }: DriverFormProps) {
  const navigate = useNavigate()
  const m = useMessages(driversMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createDriverSchema(m, common), [m, common])
  const countries = useAllCountries()
  const vehicles = useAllVehicles()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: driver?.name ?? '',
      identityId: driver?.identityId ?? '',
      nationalityId: driver?.nationalityId ?? '',
      vehicleId: driver?.vehicleId ?? '',
    },
  })

  async function onSubmit(values: DriverFormValues): Promise<void> {
    try {
      if (driver) {
        await updateDriver.mutateAsync({ id: driver.id, body: values })
      } else {
        await createDriver.mutateAsync(values)
      }
      navigate(ROUTES.drivers)
    } catch (error) {
      // "Country <id> does not exist", "Vehicle <id> does not exist" and 409 go to FormError.
      applyServerErrors(error, setError, ['name', 'identityId', 'nationalityId', 'vehicleId'])
    }
  }

  if (countries.isPending || vehicles.isPending) {
    return <LoadingState label={m.form.loadingOptions} />
  }
  if (countries.isError || vehicles.isError) {
    return <ErrorAlert error={countries.error ?? vehicles.error} title={m.form.optionsFailed} />
  }

  return (
    <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label={m.form.name} htmlFor="name" error={errors.name?.message}>
          <input id="name" className="input" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field
          label={m.form.identityId}
          htmlFor="identityId"
          error={errors.identityId?.message}
          hint={m.form.identityIdHint}
        >
          <input
            id="identityId"
            className="input"
            aria-invalid={Boolean(errors.identityId)}
            {...register('identityId')}
          />
        </Field>
        <Field label={m.form.nationality} htmlFor="nationalityId" error={errors.nationalityId?.message}>
          <CountrySelect
            id="nationalityId"
            aria-invalid={Boolean(errors.nationalityId)}
            {...register('nationalityId')}
          />
        </Field>
        <Field label={m.form.vehicle} htmlFor="vehicleId" error={errors.vehicleId?.message}>
          <VehicleSelect id="vehicleId" aria-invalid={Boolean(errors.vehicleId)} {...register('vehicleId')} />
        </Field>
      </div>
      <div className="form-actions">
        <Link to={ROUTES.drivers} className="btn btn-secondary">
          {common.actions.cancel}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? common.actions.saving : common.actions.save}
        </button>
      </div>
    </form>
  )
}
