import { useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAuth } from '../../authentication/index.ts'
import { UserForm } from '../components/UserForm.tsx'
import { useUpdateUser, useUser } from '../hooks/useUsers.ts'
import { usersMessages } from '../i18n.ts'
import type { UpdateUserRequest } from '../types/users.ts'
import type { UserFormValues } from '../types/userSchemas.ts'

export function EditUserPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const m = useMessages(usersMessages)
  const { user: currentUser } = useAuth()
  const user = useUser(id)
  const updateUser = useUpdateUser()
  const isSelf = id === currentUser?.id

  async function handleSubmit(values: UserFormValues): Promise<void> {
    const body: UpdateUserRequest = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
    }
    // Role and active are read-only for yourself, so they are not sent.
    if (!isSelf) {
      body.role = values.role
      body.isActive = values.isActive
    }
    if (values.password) {
      body.password = values.password
    }
    await updateUser.mutateAsync({ id, body })
    navigate(ROUTES.users)
  }

  return (
    <>
      <PageHeader title={m.editPage.title} description={user.data?.email} />
      {user.isPending && <LoadingState />}
      <ErrorAlert error={user.error} />
      {user.data && (
        <UserForm
          mode="edit"
          isSelf={isSelf}
          defaultValues={{
            email: user.data.email,
            firstName: user.data.firstName,
            lastName: user.data.lastName,
            role: user.data.role,
            isActive: user.data.isActive,
            password: '',
          }}
          submitLabel={m.editPage.submit}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
