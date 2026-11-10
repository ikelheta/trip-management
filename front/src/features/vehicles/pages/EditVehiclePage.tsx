import { Link, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { VehicleForm } from '../components/VehicleForm.tsx'
import { useVehicle } from '../hooks/useVehicles.ts'
import { vehiclesMessages } from '../i18n.ts'

export function EditVehiclePage() {
  const { id = '' } = useParams()
  const m = useMessages(vehiclesMessages)
  const vehicle = useVehicle(id)

  if (vehicle.isPending) {
    return <LoadingState />
  }
  if (vehicle.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={vehicle.error} />
        <Link to={ROUTES.vehicles}>{m.editPage.back}</Link>
      </div>
    )
  }
  return (
    <>
      <PageHeader title={m.editPage.title(vehicle.data.plateNumber)} />
      <VehicleForm key={vehicle.data.id} vehicle={vehicle.data} />
    </>
  )
}
