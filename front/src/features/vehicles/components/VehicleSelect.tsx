import type { Ref, SelectHTMLAttributes } from 'react'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAllVehicles } from '../hooks/useVehicles.ts'
import { vehiclesMessages } from '../i18n.ts'
import { formatVehicleLabel } from '../utils/formatVehicleLabel.ts'

interface VehicleSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label of the empty option (value ""); defaults to "Select a vehicle" in the current language. */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function VehicleSelect({ placeholder, ref, className = '', ...props }: VehicleSelectProps) {
  const m = useMessages(vehiclesMessages)
  const vehicles = useAllVehicles()

  let emptyLabel = placeholder ?? m.select.placeholder
  if (vehicles.isPending) {
    emptyLabel = m.select.loading
  } else if (vehicles.isError) {
    emptyLabel = m.select.failed
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {vehicles.data?.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {formatVehicleLabel(vehicle)}
        </option>
      ))}
    </select>
  )
}
