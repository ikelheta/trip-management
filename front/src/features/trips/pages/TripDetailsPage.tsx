import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles } from '../../vehicles/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Icon } from '../../../shared/components/ui/Icon.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { ltr } from '../../../shared/i18n/bidi.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDate, formatDateTime, formatTime } from '../../../shared/utils/formatDate.ts'
import { PassengersTable } from '../components/PassengersTable.tsx'
import { TripInspectionView } from '../components/TripInspectionView.tsx'
import { TripQrCodeCard } from '../components/TripQrCodeCard.tsx'
import { useDeleteTrip, useTrip } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import styles from './TripDetailsPage.module.css'

export function TripDetailsPage() {
  const { locale } = useLanguage()
  const m = useMessages(tripsMessages)
  const common = useMessages(commonMessages)
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const deleteTrip = useDeleteTrip()
  // After a delete the detail query is removed; without this the still-mounted page would refetch it (404)
  // before the navigation to the list renders.
  const trip = useTrip(id, !deleteTrip.isSuccess)
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (trip.isPending) {
    return <LoadingState />
  }
  if (trip.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={trip.error} />
        <Link to={ROUTES.trips}>{m.details.back}</Link>
      </div>
    )
  }

  const data = trip.data
  const vehicle = vehicles.data?.find((item) => item.id === data.vehicleId)
  const driver = drivers.data?.find((item) => item.id === data.driverId)

  function handleDelete(): void {
    deleteTrip.mutate(data.id, { onSuccess: () => navigate(ROUTES.trips, { replace: true }) })
  }

  function handleCancelDelete(): void {
    setConfirmOpen(false)
    deleteTrip.reset()
  }

  const when = m.details.dateAt(formatDate(data.date, locale), formatTime(data.time))
  const route = data.origin && data.destination ? m.route(data.origin, data.destination) : null

  return (
    <>
      <PageHeader
        title={data.tripName ?? m.untitled}
        description={route ? m.details.summary(route, when) : when}
        actions={
          <>
            <Link to={ROUTES.tripContract(data.id)} className="btn btn-primary">
              <Icon name="print" /> {m.details.contract}
            </Link>
            <Link to={ROUTES.editTrip(data.id)} className="btn btn-secondary">
              {common.actions.edit}
            </Link>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              {common.actions.delete}
            </button>
          </>
        }
      />
      <div className={styles.layout}>
        <div className="stack">
          <section className="card">
            <dl className="details">
              <dt>{m.details.contractNumber}</dt>
              <dd>{ltr(data.contractNumber)}</dd>
              <dt>{m.details.origin}</dt>
              <dd>{data.origin ?? common.states.notSet}</dd>
              <dt>{m.details.destination}</dt>
              <dd>{data.destination ?? common.states.notSet}</dd>
              <dt>{m.details.vehicle}</dt>
              <dd>{vehicle ? `${vehicle.plateNumber} — ${vehicle.model}` : m.details.unknownVehicle}</dd>
              <dt>{m.details.driver}</dt>
              <dd>{driver?.name ?? m.details.unknownDriver}</dd>
              <dt>{m.details.secretCode}</dt>
              <dd>{data.secretCode ?? '—'}</dd>
              <dt>{m.details.created}</dt>
              <dd>{formatDateTime(data.createdAt, locale)}</dd>
              <dt>{m.details.updated}</dt>
              <dd>{formatDateTime(data.updatedAt, locale)}</dd>
            </dl>
          </section>
          <section className="card stack">
            <h2>{m.passengersHeading(data.passengers.length)}</h2>
            <PassengersTable passengers={data.passengers} />
          </section>
          <TripInspectionView inspection={data.inspection} />
        </div>
        <TripQrCodeCard trip={data} />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={m.details.deleteTitle}
        pending={deleteTrip.isPending}
        error={deleteTrip.error}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      >
        <p>{m.details.deleteBody}</p>
      </ConfirmDialog>
    </>
  )
}
