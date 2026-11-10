import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { DriverSelect, useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles, VehicleSelect } from '../../vehicles/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { TripsTable } from '../components/TripsTable.tsx'
import { useTrips } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import styles from './TripsListPage.module.css'

const PAGE_SIZE = 20

export function TripsListPage() {
  const navigate = useNavigate()
  const m = useMessages(tripsMessages)
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  // Remounts the uncontrolled search box when the filters are cleared.
  const [searchResetKey, setSearchResetKey] = useState(0)
  const vehicleId = getFilter('vehicleId')
  const driverId = getFilter('driverId')
  const dateFrom = getFilter('dateFrom')
  const dateTo = getFilter('dateTo')

  const trips = useTrips({ page, limit: PAGE_SIZE, search, vehicleId, driverId, dateFrom, dateTo })
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const plateByVehicleId = new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, vehicle.plateNumber]))
  const nameByDriverId = new Map((drivers.data ?? []).map((driver) => [driver.id, driver.name]))
  const hasFilters = Boolean(search || vehicleId || driverId || dateFrom || dateTo)

  function clearFilters(): void {
    navigate(ROUTES.trips, { replace: true })
    setSearchResetKey((key) => key + 1)
  }

  return (
    <>
      <PageHeader
        title={m.list.title}
        actions={
          <Link to={ROUTES.newTrip} className="btn btn-primary">
            {m.list.newTrip}
          </Link>
        }
      />
      <div className={styles.filters}>
        <SearchInput
          key={searchResetKey}
          defaultValue={search}
          onSearch={setSearch}
          label={m.list.searchLabel}
          placeholder={m.list.searchPlaceholder}
        />
        <Field label={m.list.vehicle} htmlFor="vehicle-filter">
          <VehicleSelect
            id="vehicle-filter"
            placeholder={m.list.allVehicles}
            value={vehicleId}
            onChange={(event) => setFilter('vehicleId', event.target.value)}
          />
        </Field>
        <Field label={m.list.driver} htmlFor="driver-filter">
          <DriverSelect
            id="driver-filter"
            placeholder={m.list.allDrivers}
            value={driverId}
            onChange={(event) => setFilter('driverId', event.target.value)}
          />
        </Field>
        <Field label={m.list.dateFrom} htmlFor="date-from">
          <input
            id="date-from"
            type="date"
            className="input"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setFilter('dateFrom', event.target.value)}
          />
        </Field>
        <Field label={m.list.dateTo} htmlFor="date-to">
          <input
            id="date-to"
            type="date"
            className="input"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setFilter('dateTo', event.target.value)}
          />
        </Field>
        {hasFilters && (
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            {m.list.clearFilters}
          </button>
        )}
      </div>

      <ErrorAlert error={trips.error} />
      {trips.isPending && <LoadingState />}
      {trips.data && trips.data.data.length === 0 && (
        <EmptyState message={hasFilters ? m.list.emptyFiltered : m.list.empty}>
          <Link to={ROUTES.newTrip} className="btn btn-primary">
            {m.list.newTrip}
          </Link>
        </EmptyState>
      )}
      {trips.data && trips.data.data.length > 0 && (
        <>
          <TripsTable trips={trips.data.data} plateByVehicleId={plateByVehicleId} nameByDriverId={nameByDriverId} />
          <Pagination meta={trips.data.meta} onPageChange={setPage} />
        </>
      )}
    </>
  )
}
