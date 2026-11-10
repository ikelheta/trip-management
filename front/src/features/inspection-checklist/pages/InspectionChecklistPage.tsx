import { useState, type ReactNode } from 'react'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { Dialog } from '../../../shared/components/ui/Dialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { localizedName } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { CheckForm } from '../components/CheckForm.tsx'
import { IndicatorCard } from '../components/IndicatorCard.tsx'
import { IndicatorForm } from '../components/IndicatorForm.tsx'
import {
  useDeleteCheck,
  useDeleteIndicator,
  useInspectionChecklist,
} from '../hooks/useInspectionChecklist.ts'
import { inspectionChecklistMessages, type InspectionChecklistMessages } from '../i18n.ts'
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'

type FormDialogState =
  | { kind: 'indicator'; indicator?: InspectionIndicator }
  | { kind: 'check'; indicatorId: string; check?: InspectionCheck }
  | null

type DeleteTarget =
  | { kind: 'indicator'; indicator: InspectionIndicator }
  | { kind: 'check'; check: InspectionCheck }
  | null

function getDialogTitle(state: FormDialogState, m: InspectionChecklistMessages): string {
  if (state?.kind === 'check') {
    return state.check ? m.dialog.editCheck : m.dialog.newCheck
  }
  return state?.indicator ? m.dialog.editIndicator : m.dialog.newIndicator
}

export function InspectionChecklistPage() {
  const { language } = useLanguage()
  const m = useMessages(inspectionChecklistMessages)
  const checklist = useInspectionChecklist()
  const deleteIndicator = useDeleteIndicator()
  const deleteCheck = useDeleteCheck()
  const [formDialog, setFormDialog] = useState<FormDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const activeDelete = deleteTarget?.kind === 'check' ? deleteCheck : deleteIndicator

  function closeForm(): void {
    setFormDialog(null)
  }

  function closeDelete(): void {
    setDeleteTarget(null)
    deleteIndicator.reset()
    deleteCheck.reset()
  }

  function confirmDelete(): void {
    if (deleteTarget?.kind === 'indicator') {
      deleteIndicator.mutate(deleteTarget.indicator.id, { onSuccess: closeDelete })
    } else if (deleteTarget?.kind === 'check') {
      deleteCheck.mutate(deleteTarget.check.id, { onSuccess: closeDelete })
    }
  }

  function renderForm(): ReactNode {
    if (formDialog?.kind === 'indicator') {
      return <IndicatorForm indicator={formDialog.indicator} onDone={closeForm} />
    }
    if (formDialog?.kind === 'check') {
      return (
        <CheckForm
          check={formDialog.check}
          indicatorId={formDialog.indicatorId}
          indicators={checklist.data ?? []}
          onDone={closeForm}
        />
      )
    }
    return null
  }

  function renderChecklist(): ReactNode {
    if (checklist.isPending) {
      return <LoadingState />
    }
    if (checklist.isError) {
      return <ErrorAlert error={checklist.error} />
    }
    if (checklist.data.length === 0) {
      return <EmptyState message={m.page.empty} />
    }
    return checklist.data.map((indicator) => (
      <IndicatorCard
        key={indicator.id}
        indicator={indicator}
        onEdit={() => setFormDialog({ kind: 'indicator', indicator })}
        onDelete={() => setDeleteTarget({ kind: 'indicator', indicator })}
        onAddCheck={() => setFormDialog({ kind: 'check', indicatorId: indicator.id })}
        onEditCheck={(check) => setFormDialog({ kind: 'check', indicatorId: check.indicatorId, check })}
        onDeleteCheck={(check) => setDeleteTarget({ kind: 'check', check })}
      />
    ))
  }

  const deleteItem = deleteTarget?.kind === 'check' ? deleteTarget.check : deleteTarget?.indicator

  return (
    <>
      <PageHeader
        title={m.page.title}
        description={m.page.description}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormDialog({ kind: 'indicator' })}>
            {m.page.newIndicator}
          </button>
        }
      />
      <div className="stack">
        <div className="alert alert-info">{m.page.info}</div>
        {renderChecklist()}
      </div>

      <Dialog open={formDialog !== null} title={getDialogTitle(formDialog, m)} onClose={closeForm}>
        {renderForm()}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'check' ? m.delete.checkTitle : m.delete.indicatorTitle}
        pending={activeDelete.isPending}
        error={activeDelete.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          {m.delete.before}
          <strong>{deleteItem && localizedName(deleteItem, language)}</strong>
          {deleteTarget?.kind === 'indicator' ? m.delete.indicatorAfter : m.delete.checkAfter}
        </p>
      </ConfirmDialog>
    </>
  )
}
