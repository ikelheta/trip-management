import { Link, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { DriverForm } from '../components/DriverForm.tsx'
import { useDriver } from '../hooks/useDrivers.ts'
import { driversMessages } from '../i18n.ts'

export function EditDriverPage() {
  const { id = '' } = useParams()
  const m = useMessages(driversMessages)
  const driver = useDriver(id)

  if (driver.isPending) {
    return <LoadingState />
  }
  if (driver.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={driver.error} />
        <Link to={ROUTES.drivers}>{m.editPage.back}</Link>
      </div>
    )
  }
  return (
    <>
      <PageHeader title={m.editPage.title(driver.data.name)} />
      <DriverForm key={driver.data.id} driver={driver.data} />
    </>
  )
}
