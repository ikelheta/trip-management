import { useState, type ReactNode } from 'react'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { Dialog } from '../../../shared/components/ui/Dialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { localizedName } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { CountryForm } from '../components/CountryForm.tsx'
import { CountryTable } from '../components/CountryTable.tsx'
import { useCountries, useDeleteCountry } from '../hooks/useCountries.ts'
import { countriesMessages } from '../i18n.ts'
import type { Country } from '../types/country.ts'

type FormDialogState = { mode: 'create' } | { mode: 'edit'; country: Country } | null

export function CountriesPage() {
  const { language } = useLanguage()
  const m = useMessages(countriesMessages)
  const { page, search, setPage, setSearch } = useListParams()
  const countries = useCountries({ page, search })
  const deleteCountry = useDeleteCountry()
  const [formDialog, setFormDialog] = useState<FormDialogState>(null)
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null)

  function closeDelete(): void {
    setCountryToDelete(null)
    deleteCountry.reset()
  }

  function confirmDelete(): void {
    if (countryToDelete) {
      deleteCountry.mutate(countryToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (countries.isPending) {
      return <LoadingState />
    }
    if (countries.isError) {
      return <ErrorAlert error={countries.error} />
    }
    if (countries.data.data.length === 0) {
      return <EmptyState message={search ? m.list.emptySearch : m.list.empty} />
    }
    return (
      <>
        <CountryTable
          countries={countries.data.data}
          onEdit={(country) => setFormDialog({ mode: 'edit', country })}
          onDelete={setCountryToDelete}
        />
        <Pagination meta={countries.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={m.list.title}
        description={m.list.description}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormDialog({ mode: 'create' })}>
            {m.list.newCountry}
          </button>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder={m.list.searchPlaceholder} />
      </div>
      {renderList()}

      <Dialog
        open={formDialog !== null}
        title={formDialog?.mode === 'edit' ? m.dialog.editTitle : m.dialog.newTitle}
        onClose={() => setFormDialog(null)}
      >
        <CountryForm
          country={formDialog?.mode === 'edit' ? formDialog.country : undefined}
          onDone={() => setFormDialog(null)}
        />
      </Dialog>

      <ConfirmDialog
        open={countryToDelete !== null}
        title={m.delete.title}
        pending={deleteCountry.isPending}
        error={deleteCountry.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          {m.delete.before}
          <strong>{countryToDelete && localizedName(countryToDelete, language)}</strong>
          {m.delete.after}
        </p>
      </ConfirmDialog>
    </>
  )
}
