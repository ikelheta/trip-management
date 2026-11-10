import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { driversMessages } from '../i18n.ts'
import type { Driver } from '../types/driver.ts'

interface DriverTableProps {
  drivers: Driver[]
  getNationality: (countryId: string) => string
  getVehicle: (vehicleId: string) => string
  onDelete: (driver: Driver) => void
}

export function DriverTable({ drivers, getNationality, getVehicle, onDelete }: DriverTableProps) {
  const { locale } = useLanguage()
  const m = useMessages(driversMessages)
  const common = useMessages(commonMessages)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{m.list.columns.name}</th>
            <th>{m.list.columns.identityId}</th>
            <th>{m.list.columns.nationality}</th>
            <th>{m.list.columns.vehicle}</th>
            <th>{m.list.columns.updated}</th>
            <th>
              <span className="visually-hidden">{m.list.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td>{driver.name}</td>
              <td>{driver.identityId}</td>
              <td>{getNationality(driver.nationalityId)}</td>
              <td>{getVehicle(driver.vehicleId)}</td>
              <td>{formatDateTime(driver.updatedAt, locale)}</td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.editDriver(driver.id)} className="btn btn-secondary btn-small">
                    {common.actions.edit}
                  </Link>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(driver)}>
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
