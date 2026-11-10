import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useDeleteCompany } from '../hooks/useCompanies.ts'
import { companiesMessages } from '../i18n.ts'
import type { Company } from '../types/companies.ts'

interface DeleteCompanyDialogProps {
  /** The company to delete; null keeps the dialog closed. */
  company: Company | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteCompanyDialog({ company, onClose, onDeleted }: DeleteCompanyDialogProps) {
  const m = useMessages(companiesMessages)
  const deleteCompany = useDeleteCompany()

  function close(): void {
    deleteCompany.reset()
    onClose()
  }

  function confirm(): void {
    if (!company) {
      return
    }
    deleteCompany.mutate(company.id, {
      onSuccess: () => {
        close()
        onDeleted?.()
      },
    })
  }

  return (
    <ConfirmDialog
      open={company !== null}
      title={m.delete.title}
      pending={deleteCompany.isPending}
      error={deleteCompany.error}
      onConfirm={confirm}
      onCancel={close}
    >
      <p>{company && m.delete.body(company.name, company.registrationNumber)}</p>
    </ConfirmDialog>
  )
}
