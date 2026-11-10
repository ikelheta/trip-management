import { useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { UserForm } from '../components/UserForm.tsx'
import { useCreateUser } from '../hooks/useUsers.ts'
import { usersMessages } from '../i18n.ts'
import type { UserFormValues } from '../types/userSchemas.ts'

const EMPTY_USER: UserFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'user',
  isActive: true,
  password: '',
}

export function NewUserPage() {
  const navigate = useNavigate()
  const m = useMessages(usersMessages)
  const createUser = useCreateUser()

  async function handleSubmit(values: UserFormValues): Promise<void> {
    // isActive is not accepted on create (new users are always active).
    await createUser.mutateAsync({
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      role: values.role,
      password: values.password,
    })
    navigate(ROUTES.users)
  }

  return (
    <>
      <PageHeader title={m.newPage.title} />
      <UserForm mode="create" defaultValues={EMPTY_USER} submitLabel={m.newPage.submit} onSubmit={handleSubmit} />
    </>
  )
}
