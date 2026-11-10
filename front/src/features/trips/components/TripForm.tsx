import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { DriverSelect, useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles, VehicleSelect } from '../../vehicles/index.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { tripsMessages } from '../i18n.ts'
import { createTripFormSchema, type TripFormValues } from '../types/tripSchemas.ts'
import type { InspectionGroup } from '../utils/tripForm.ts'
import { InspectionFieldset } from './InspectionFieldset.tsx'
import { PassengersFieldset } from './PassengersFieldset.tsx'

interface TripFormProps {
  defaultValues: TripFormValues
  /** Empty = no inspection section (old trips without an inspection). */
  groups: InspectionGroup[]
  submitLabel: string
  cancelTo: string
  onSubmit: (values: TripFormValues) => Promise<void>
}

// Messages such as "inspection.results …", "Vehicle <id> does not exist" go to the top of the form.
const SERVER_FIELDS = ['origin', 'destination', 'tripName', 'secretCode', 'vehicleId', 'driverId', 'date', 'time', 'passengers'] as const

export function TripForm({ defaultValues, groups, submitLabel, cancelTo, onSubmit }: TripFormProps) {
  const m = useMessages(tripsMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createTripFormSchema(m, common), [m, common])
  const form = useForm<TripFormValues>({ resolver: zodResolver(schema), defaultValues })
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form

  // The selects need their options before register() applies the saved ids, or an edit form shows "Choose …".
  if (vehicles.isError || drivers.isError) {
    return <ErrorAlert error={vehicles.error ?? drivers.error} title={m.form.optionsFailed} />
  }
  if (vehicles.isPending || drivers.isPending) {
    return <LoadingState label={m.form.loadingOptions} />
  }

  async function submit(values: TripFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, SERVER_FIELDS)
    }
  }

  return (
    <FormProvider {...form}>
      <form className="stack" onSubmit={handleSubmit(submit)} noValidate>
        <FormError message={errors.root?.server?.message} />
        <section className="card stack">
          <h2>{m.form.tripSection}</h2>
          <div className="form-grid">
            <Field label={m.form.origin} htmlFor="origin" error={errors.origin?.message}>
              <input
                id="origin"
                className="input"
                placeholder={m.form.originPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(errors.origin)}
                {...register('origin')}
              />
            </Field>
            <Field label={m.form.destination} htmlFor="destination" error={errors.destination?.message}>
              <input
                id="destination"
                className="input"
                placeholder={m.form.destinationPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(errors.destination)}
                {...register('destination')}
              />
            </Field>
            <Field label={m.form.vehicle} htmlFor="vehicleId" error={errors.vehicleId?.message}>
              <VehicleSelect
                id="vehicleId"
                placeholder={m.form.chooseVehicle}
                aria-invalid={Boolean(errors.vehicleId)}
                {...register('vehicleId')}
              />
            </Field>
            <Field label={m.form.driver} htmlFor="driverId" error={errors.driverId?.message}>
              <DriverSelect
                id="driverId"
                placeholder={m.form.chooseDriver}
                aria-invalid={Boolean(errors.driverId)}
                {...register('driverId')}
              />
            </Field>
            <Field label={m.form.date} htmlFor="date" error={errors.date?.message}>
              <input id="date" type="date" className="input" aria-invalid={Boolean(errors.date)} {...register('date')} />
            </Field>
            <Field label={m.form.time} htmlFor="time" error={errors.time?.message}>
              <input id="time" type="time" className="input" aria-invalid={Boolean(errors.time)} {...register('time')} />
            </Field>
            <Field label={m.form.tripName} htmlFor="tripName" error={errors.tripName?.message} hint={m.form.optional}>
              <input id="tripName" className="input" aria-invalid={Boolean(errors.tripName)} {...register('tripName')} />
            </Field>
            <Field
              label={m.form.secretCode}
              htmlFor="secretCode"
              error={errors.secretCode?.message}
              hint={m.form.optional}
            >
              <input
                id="secretCode"
                className="input"
                autoComplete="off"
                aria-invalid={Boolean(errors.secretCode)}
                {...register('secretCode')}
              />
            </Field>
          </div>
        </section>
        <PassengersFieldset />
        {groups.length > 0 && <InspectionFieldset groups={groups} />}
        <div className="form-actions">
          <Link to={cancelTo} className="btn btn-secondary">
            {common.actions.cancel}
          </Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? common.actions.saving : submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
