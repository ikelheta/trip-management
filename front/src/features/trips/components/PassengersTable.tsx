import { useMessages } from '../../../shared/i18n/messages.ts'
import { tripsMessages } from '../i18n.ts'
import type { Passenger } from '../types/trip.ts'

interface PassengersTableProps {
  passengers: Passenger[]
}

export function PassengersTable({ passengers }: PassengersTableProps) {
  const m = useMessages(tripsMessages)
  if (passengers.length === 0) {
    return <p className="muted">{m.passengers.none}</p>
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{m.passengers.name}</th>
            <th>{m.passengers.identityNumber}</th>
            <th>{m.passengers.docType}</th>
            <th>{m.passengers.nationality}</th>
          </tr>
        </thead>
        <tbody>
          {passengers.map((passenger) => (
            <tr key={passenger.id}>
              <td>{passenger.name}</td>
              <td>{passenger.identityNumber}</td>
              <td>{passenger.docType}</td>
              <td>{passenger.nationality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
