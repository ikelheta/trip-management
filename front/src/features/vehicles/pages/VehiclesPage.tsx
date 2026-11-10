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
import { useMessages } from '../../../shared/i18n/messages.ts'
import { CompanySelect, useAllCompanies } from '../../companies/index.ts'
import { VehicleTable } from '../components/VehicleTable.tsx'
import { useDeleteVehicle, useVehicles } from '../hooks/useVehicles.ts'
import { vehiclesMessages } from '../i18n.ts'
import type { Vehicle } from '../types/vehicle.ts'

const COMPANY_FILTER = 'companyId'

export function VehiclesPage() {
  const m = useMessages(vehiclesMessages)
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  const companyId = getFilter(COMPANY_FILTER)
  const vehicles = useVehicles({ page, search, companyId })
  const companies = useAllCompanies()
  const deleteVehicle = useDeleteVehicle()
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)

  const companyNames = new Map(
    companies.data?.map((company): [string, string] => [company.id, company.name]),
  )

  function getCompanyName(id: string): string {
    if (!companies.data) {
      return '…'
    }
    return companyNames.get(id) ?? m.list.deletedCompany
  }

  function closeDelete(): void {
    setVehicleToDelete(null)
    deleteVehicle.reset()
  }

  function confirmDelete(): void {
    if (vehicleToDelete) {
      deleteVehicle.mutate(vehicleToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (vehicles.isPending) {
      return <LoadingState />
    }
    if (vehicles.isError) {
      return <ErrorAlert error={vehicles.error} />
    }
    if (vehicles.data.data.length === 0) {
      return (
        <EmptyState message={search || companyId ? m.list.emptyFiltered : m.list.empty} />
      )
    }
    return (
      <>
        <VehicleTable
          vehicles={vehicles.data.data}
          getCompanyName={getCompanyName}
          onDelete={setVehicleToDelete}
        />
        <Pagination meta={vehicles.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={m.list.title}
        description={m.list.description}
        actions={
          <Link to={ROUTES.newVehicle} className="btn btn-primary">
            {m.list.newVehicle}
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder={m.list.searchPlaceholder} />
        {/* CompanySelect adds the `input` class itself. */}
        <CompanySelect
          aria-label={m.list.companyFilter}
          placeholder={m.list.allCompanies}
          className="search-input"
          value={companyId}
          onChange={(event) => setFilter(COMPANY_FILTER, event.target.value)}
        />
      </div>
      {renderList()}

      <ConfirmDialog
        open={vehicleToDelete !== null}
        title={m.delete.title}
        pending={deleteVehicle.isPending}
        error={deleteVehicle.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          {m.delete.before}
          <strong className="ltr">{vehicleToDelete?.plateNumber}</strong>
          {m.delete.after}
        </p>
      </ConfirmDialog>
    </>
  )
}
