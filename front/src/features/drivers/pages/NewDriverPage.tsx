import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { DriverForm } from '../components/DriverForm.tsx'
import { driversMessages } from '../i18n.ts'

export function NewDriverPage() {
  const m = useMessages(driversMessages)
  return (
    <>
      <PageHeader title={m.newPage.title} />
      <DriverForm />
    </>
  )
}
