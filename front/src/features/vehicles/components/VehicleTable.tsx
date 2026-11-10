import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { vehiclesMessages } from '../i18n.ts'
import type { Vehicle } from '../types/vehicle.ts'

interface VehicleTableProps {
  vehicles: Vehicle[]
  getCompanyName: (companyId: string) => string
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleTable({ vehicles, getCompanyName, onDelete }: VehicleTableProps) {
  const { locale } = useLanguage()
  const m = useMessages(vehiclesMessages)
  const common = useMessages(commonMessages)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{m.list.columns.plateNumber}</th>
            <th>{m.list.columns.model}</th>
            <th>{m.list.columns.type}</th>
            <th>{m.list.columns.company}</th>
            <th>{m.list.columns.updated}</th>
            <th>
              <span className="visually-hidden">{m.list.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.plateNumber}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.type}</td>
              <td>{getCompanyName(vehicle.companyId)}</td>
              <td>{formatDateTime(vehicle.updatedAt, locale)}</td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.editVehicle(vehicle.id)} className="btn btn-secondary btn-small">
                    {common.actions.edit}
                  </Link>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(vehicle)}>
                    {common.actions.delete}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
