import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useInspectionChecklist } from '../../inspection-checklist/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { TripForm } from '../components/TripForm.tsx'
import { useCreateTrip } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import type { TripFormValues } from '../types/tripSchemas.ts'
import { groupsFromChecklist, newTripFormValues, toCreateTripRequest } from '../utils/tripForm.ts'

export function CreateTripPage() {
  const navigate = useNavigate()
  const m = useMessages(tripsMessages)
  const checklist = useInspectionChecklist()
  const createTrip = useCreateTrip()

  async function handleSubmit(values: TripFormValues): Promise<void> {
    const trip = await createTrip.mutateAsync(toCreateTripRequest(values))
    navigate(ROUTES.trip(trip.id))
  }

  if (checklist.isPending) {
    return <LoadingState label={m.createPage.loadingChecklist} />
  }
  if (checklist.isError) {
    return <ErrorAlert error={checklist.error} title={m.createPage.checklistFailed} />
  }

  const groups = groupsFromChecklist(checklist.data)
  return (
    <>
      <PageHeader title={m.createPage.title} />
      {groups.length === 0 ? (
        <div className="alert alert-info">
          <p>
            {m.createPage.noChecksBefore}
            <Link to={ROUTES.inspectionChecklist}>{m.createPage.noChecksLink}</Link>
            {m.createPage.noChecksAfter}
          </p>
        </div>
      ) : (
        <TripForm
          defaultValues={newTripFormValues(groups)}
          groups={groups}
          submitLabel={m.createPage.submit}
          cancelTo={ROUTES.trips}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
