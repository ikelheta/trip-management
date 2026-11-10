import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { ApiError } from '../../../shared/services/httpClient.ts'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { authMessages } from '../i18n.ts'
import { changePassword } from '../services/authService.ts'
import { createChangePasswordSchema, type ChangePasswordFormValues } from '../types/authSchemas.ts'

const EMPTY_FORM: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordPage() {
  const m = useMessages(authMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createChangePasswordSchema(m, common), [m, common])
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  })

  async function onSubmit(values: ChangePasswordFormValues): Promise<void> {
    setSaved(false)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      reset(EMPTY_FORM)
      setSaved(true)
    } catch (error) {
      // 401 "Current password is incorrect" is a form error, not a session error.
      if (error instanceof ApiError && error.status === 401) {
        setError('currentPassword', { type: 'server', message: error.messages[0] })
        return
      }
      applyServerErrors(error, setError, ['currentPassword', 'newPassword'])
    }
  }

  return (
    <>
      <PageHeader
        title={m.changePassword.title}
        actions={
          <Link to={ROUTES.account} className="btn btn-secondary">
            {m.changePassword.backToAccount}
          </Link>
        }
      />
      <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {saved && (
          <div className="alert alert-success" role="status">
            {m.changePassword.saved}
          </div>
        )}
        <FormError message={errors.root?.server?.message} />
        <Field label={m.changePassword.currentPassword} htmlFor="currentPassword" error={errors.currentPassword?.message}>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="input"
            aria-invalid={Boolean(errors.currentPassword)}
            {...register('currentPassword')}
          />
        </Field>
        <Field
          label={m.changePassword.newPassword}
          htmlFor="newPassword"
          error={errors.newPassword?.message}
          hint={m.changePassword.newPasswordHint(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)}
        >
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            aria-invalid={Boolean(errors.newPassword)}
            {...register('newPassword')}
          />
        </Field>
        <Field label={m.changePassword.confirmPassword} htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? common.actions.saving : m.changePassword.submit}
          </button>
        </div>
      </form>
    </>
  )
}
