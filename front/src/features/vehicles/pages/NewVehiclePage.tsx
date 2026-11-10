import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { VehicleForm } from '../components/VehicleForm.tsx'
import { vehiclesMessages } from '../i18n.ts'

export function NewVehiclePage() {
  const m = useMessages(vehiclesMessages)
  return (
    <>
      <PageHeader title={m.newPage.title} />
      <VehicleForm />
    </>
  )
}
