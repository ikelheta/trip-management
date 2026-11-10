import { useMessages } from '../../../shared/i18n/messages.ts'
import { tripsMessages } from '../i18n.ts'
import type { TripInspection } from '../types/trip.ts'

interface InspectionBadgeProps {
  inspection: TripInspection | null
}

export function InspectionBadge({ inspection }: InspectionBadgeProps) {
  const m = useMessages(tripsMessages)
  if (!inspection) {
    return <span className="badge">{m.inspection.none}</span>
  }
  if (inspection.passed) {
    return <span className="badge badge-success">{m.outcome.passed}</span>
  }
  return <span className="badge badge-danger">{m.inspection.failedCount(inspection.failedCount)}</span>
}
