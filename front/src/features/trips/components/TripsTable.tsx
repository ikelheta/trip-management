import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDate, formatTime } from '../../../shared/utils/formatDate.ts'
import { tripsMessages } from '../i18n.ts'
import type { Trip } from '../types/trip.ts'
import { InspectionBadge } from './InspectionBadge.tsx'

interface TripsTableProps {
  trips: Trip[]
  plateByVehicleId: Map<string, string>
  nameByDriverId: Map<string, string>
}

export function TripsTable({ trips, plateByVehicleId, nameByDriverId }: TripsTableProps) {
  const { locale } = useLanguage()
  const m = useMessages(tripsMessages)
  const common = useMessages(commonMessages)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{m.list.columns.date}</th>
            <th>{m.list.columns.time}</th>
            <th>{m.list.columns.trip}</th>
            <th>{m.list.columns.route}</th>
            <th>{m.list.columns.vehicle}</th>
            <th>{m.list.columns.driver}</th>
            <th>{m.list.columns.passengers}</th>
            <th>{m.list.columns.inspection}</th>
            <th>
              <span className="muted">{m.list.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>{formatDate(trip.date, locale)}</td>
              <td>{formatTime(trip.time)}</td>
              <td>
                <Link to={ROUTES.trip(trip.id)}>{trip.tripName ?? m.untitled}</Link>
              </td>
              <td>
                {trip.origin && trip.destination ? m.route(trip.origin, trip.destination) : common.states.notSet}
              </td>
              <td>{plateByVehicleId.get(trip.vehicleId) ?? '—'}</td>
              <td>{nameByDriverId.get(trip.driverId) ?? '—'}</td>
              <td>{trip.passengers.length}</td>
              <td>
                <InspectionBadge inspection={trip.inspection} />
              </td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.trip(trip.id)} className="btn btn-secondary btn-small">
                    {m.list.view}
                  </Link>
                  <Link to={ROUTES.editTrip(trip.id)} className="btn btn-secondary btn-small">
                    {common.actions.edit}
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
