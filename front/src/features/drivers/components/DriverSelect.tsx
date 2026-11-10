import type { Ref, SelectHTMLAttributes } from 'react'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAllDrivers } from '../hooks/useDrivers.ts'
import { driversMessages } from '../i18n.ts'

interface DriverSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label of the empty option (value ""); defaults to "Select a driver" in the current language. */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function DriverSelect({ placeholder, ref, className = '', ...props }: DriverSelectProps) {
  const m = useMessages(driversMessages)
  const drivers = useAllDrivers()

  let emptyLabel = placeholder ?? m.select.placeholder
  if (drivers.isPending) {
    emptyLabel = m.select.loading
  } else if (drivers.isError) {
    emptyLabel = m.select.failed
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {drivers.data?.map((driver) => (
        <option key={driver.id} value={driver.id}>
          {m.select.option(driver.name, driver.identityId)}
        </option>
      ))}
    </select>
  )
}
