import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import type { User } from '../../../shared/types/user.ts'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { useAuth } from '../../authentication/index.ts'
import { useDeleteUser, useUsers } from '../hooks/useUsers.ts'
import { usersMessages } from '../i18n.ts'

// The API returns every user (no pagination, no search), so filter in the browser.
function filterUsers(users: User[], search: string): User[] {
  const term = search.toLowerCase()
  if (!term) {
    return users
  }
  return users.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(term),
  )
}

export function UsersPage() {
  const { locale } = useLanguage()
  const m = useMessages(usersMessages)
  const common = useMessages(commonMessages)
  const { search, setSearch } = useListParams()
  const { user: currentUser } = useAuth()
  const users = useUsers()
  const deleteUser = useDeleteUser()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  function closeDeleteDialog(): void {
    setUserToDelete(null)
    deleteUser.reset()
  }

  function confirmDelete(): void {
    if (!userToDelete) {
      return
    }
    deleteUser.mutate(userToDelete.id, { onSuccess: closeDeleteDialog })
  }

  const visibleUsers = users.data ? filterUsers(users.data, search) : []

  return (
    <>
      <PageHeader
        title={m.list.title}
        description={m.list.description}
        actions={
          <Link to={ROUTES.newUser} className="btn btn-primary">
            {m.list.newUser}
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder={m.list.searchPlaceholder} />
      </div>
      {users.isPending && <LoadingState />}
      <ErrorAlert error={users.error} />
      {users.data && visibleUsers.length === 0 && (
        <EmptyState message={search ? m.list.emptySearch : m.list.empty} />
      )}
      {visibleUsers.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{m.list.columns.name}</th>
                <th>{m.list.columns.email}</th>
                <th>{m.list.columns.role}</th>
                <th>{m.list.columns.status}</th>
                <th>{m.list.columns.created}</th>
                <th>
                  <span className="muted">{m.list.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                    {user.id === currentUser?.id && <span className="muted">{m.list.you}</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge">{m.roles[user.role]}</span>
                  </td>
                  <td>
                    <span className={user.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {user.isActive ? m.status.active : m.status.inactive}
                    </span>
                  </td>
                  <td>{formatDateTime(user.createdAt, locale)}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={ROUTES.editUser(user.id)} className="btn btn-secondary btn-small">
                        {common.actions.edit}
                      </Link>
                      {user.id !== currentUser?.id && (
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => setUserToDelete(user)}
                        >
                          {common.actions.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={userToDelete !== null}
        title={m.delete.title}
        pending={deleteUser.isPending}
        error={deleteUser.error}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      >
        <p>
          {userToDelete &&
            m.delete.body(`${userToDelete.firstName} ${userToDelete.lastName}`, userToDelete.email)}
        </p>
      </ConfirmDialog>
    </>
  )
}
