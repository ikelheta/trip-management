import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { TripForm } from '../components/TripForm.tsx'
import { useTrip, useUpdateTrip } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import type { TripFormValues } from '../types/tripSchemas.ts'
import { groupsFromInspection, toUpdateTripRequest, tripToFormValues } from '../utils/tripForm.ts'

export function EditTripPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const m = useMessages(tripsMessages)
  const trip = useTrip(id)
  const updateTrip = useUpdateTrip(id)

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

  const original = tripToFormValues(trip.data)

  async function handleSubmit(values: TripFormValues): Promise<void> {
    const body = toUpdateTripRequest(values, original)
    if (Object.keys(body).length > 0) {
      await updateTrip.mutateAsync(body)
    }
    navigate(ROUTES.trip(id))
  }

  return (
    <>
      <PageHeader title={m.editPage.title} description={trip.data.tripName ?? undefined} />
      <div className="stack">
        {!trip.data.inspection && (
          <div className="alert alert-info">
            <p>{m.editPage.noInspection}</p>
          </div>
        )}
        <TripForm
          key={trip.data.id}
          defaultValues={original}
          groups={groupsFromInspection(trip.data.inspection)}
          submitLabel={m.editPage.submit}
          cancelTo={ROUTES.trip(id)}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  )
}
