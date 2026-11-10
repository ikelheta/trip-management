import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { usersMessages } from '../i18n.ts'
import { createEditUserSchema, createNewUserSchema, type UserFormValues } from '../types/userSchemas.ts'

const USER_FORM_FIELDS = ['email', 'firstName', 'lastName', 'role', 'isActive', 'password'] as const

interface UserFormProps {
  mode: 'create' | 'edit'
  defaultValues: UserFormValues
  /** Editing the signed-in user: role and active are read-only. */
  isSelf?: boolean
  submitLabel: string
  /** Rejects with the API error; the form maps it to fields. */
  onSubmit: (values: UserFormValues) => Promise<void>
}

export function UserForm({ mode, defaultValues, isSelf = false, submitLabel, onSubmit }: UserFormProps) {
  const m = useMessages(usersMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(
    () => (mode === 'create' ? createNewUserSchema(m, common) : createEditUserSchema(m, common)),
    [mode, m, common],
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  async function submit(values: UserFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, USER_FORM_FIELDS)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(submit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label={m.form.firstName} htmlFor="firstName" error={errors.firstName?.message}>
          <input id="firstName" className="input" aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
        </Field>
        <Field label={m.form.lastName} htmlFor="lastName" error={errors.lastName?.message}>
          <input id="lastName" className="input" aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
        </Field>
      </div>
      <Field label={m.form.email} htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="off"
          className="input"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Field
        label={m.form.role}
        htmlFor="role"
        error={errors.role?.message}
        hint={isSelf ? m.form.roleHintSelf : m.form.roleHint}
      >
        <select id="role" className="input" disabled={isSelf} {...register('role')}>
          <option value="user">{m.roleOptions.user}</option>
          <option value="admin">{m.roleOptions.admin}</option>
        </select>
      </Field>
      {mode === 'edit' && (
        <div className="field">
          <label className="checkbox">
            <input type="checkbox" disabled={isSelf} {...register('isActive')} />
            {m.form.active}
          </label>
          <p className="field-hint">
            {isSelf ? m.form.activeHintSelf : m.form.activeHint}
          </p>
        </div>
      )}
      <Field
        label={mode === 'create' ? m.form.password : m.form.newPassword}
        htmlFor="password"
        error={errors.password?.message}
        hint={
          mode === 'create'
            ? m.form.passwordHint(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
            : m.form.newPasswordHint(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
        }
      >
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="input"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>
      <div className="form-actions">
        <Link to={ROUTES.users} className="btn btn-secondary">
          {common.actions.cancel}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? common.actions.saving : submitLabel}
        </button>
      </div>
    </form>
  )
}
