import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { bilingualLabel } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { CountrySelect, useAllCountries } from '../../countries/index.ts'
import { VehicleSelect, formatVehicleLabel, useAllVehicles } from '../../vehicles/index.ts'
import { DriverTable } from '../components/DriverTable.tsx'
import { useDeleteDriver, useDrivers } from '../hooks/useDrivers.ts'
import { driversMessages } from '../i18n.ts'
import type { Driver } from '../types/driver.ts'

const NATIONALITY_FILTER = 'nationalityId'
const VEHICLE_FILTER = 'vehicleId'

export function DriversPage() {
  const { language } = useLanguage()
  const m = useMessages(driversMessages)
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  const nationalityId = getFilter(NATIONALITY_FILTER)
  const vehicleId = getFilter(VEHICLE_FILTER)
  const drivers = useDrivers({ page, search, nationalityId, vehicleId })
  const countries = useAllCountries()
  const vehicles = useAllVehicles()
  const deleteDriver = useDeleteDriver()
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null)

  const countryNames = new Map(
    countries.data?.map((country): [string, string] => [country.id, bilingualLabel(country, language)]),
  )
  const vehicleLabels = new Map(
    vehicles.data?.map((vehicle): [string, string] => [vehicle.id, formatVehicleLabel(vehicle)]),
  )

  function getNationality(id: string): string {
    if (!countries.data) {
      return '…'
    }
    return countryNames.get(id) ?? m.list.deletedCountry
  }

  function getVehicle(id: string): string {
    if (!vehicles.data) {
      return '…'
    }
    return vehicleLabels.get(id) ?? m.list.deletedVehicle
  }

  function closeDelete(): void {
    setDriverToDelete(null)
    deleteDriver.reset()
  }

  function confirmDelete(): void {
    if (driverToDelete) {
      deleteDriver.mutate(driverToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (drivers.isPending) {
      return <LoadingState />
    }
    if (drivers.isError) {
      return <ErrorAlert error={drivers.error} />
    }
    if (drivers.data.data.length === 0) {
      const filtered = search || nationalityId || vehicleId
      return <EmptyState message={filtered ? m.list.emptyFiltered : m.list.empty} />
    }
    return (
      <>
        <DriverTable
          drivers={drivers.data.data}
          getNationality={getNationality}
          getVehicle={getVehicle}
          onDelete={setDriverToDelete}
        />
        <Pagination meta={drivers.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={m.list.title}
        description={m.list.description}
        actions={
          <Link to={ROUTES.newDriver} className="btn btn-primary">
            {m.list.newDriver}
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder={m.list.searchPlaceholder} />
        <CountrySelect
          aria-label={m.list.nationalityFilter}
          placeholder={m.list.allNationalities}
          className="search-input"
          value={nationalityId}
          onChange={(event) => setFilter(NATIONALITY_FILTER, event.target.value)}
        />
        <VehicleSelect
          aria-label={m.list.vehicleFilter}
          placeholder={m.list.allVehicles}
          className="search-input"
          value={vehicleId}
          onChange={(event) => setFilter(VEHICLE_FILTER, event.target.value)}
        />
      </div>
      {renderList()}

      <ConfirmDialog
        open={driverToDelete !== null}
        title={m.delete.title}
        pending={deleteDriver.isPending}
        error={deleteDriver.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          {m.delete.before}
          <strong>{driverToDelete?.name}</strong>
          {m.delete.after}
        </p>
      </ConfirmDialog>
    </>
  )
}
