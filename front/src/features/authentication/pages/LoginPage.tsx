import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { authMessages } from '../i18n.ts'
import { createLoginSchema, type LoginFormValues } from '../types/authSchemas.ts'
import styles from './LoginPage.module.css'

interface LoginLocationState {
  from?: string
}

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const m = useMessages(authMessages)
  const common = useMessages(commonMessages)
  const schema = useMemo(() => createLoginSchema(m, common), [m, common])
  const from = (location.state as LoginLocationState | null)?.from ?? ROUTES.home
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // Also runs right after a successful login: the session flips to "authenticated".
  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    try {
      await login(values)
    } catch (error) {
      applyServerErrors(error, setError, ['email', 'password'])
    }
  }

  return (
    <main className="page-center">
      <form className={`card form ${styles.card}`} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.header}>
          <h1>{m.login.title}</h1>
          <LanguageSwitcher />
        </div>
        <FormError message={errors.root?.server?.message} />
        <Field label={m.login.email} htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className="input"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>
        <Field label={m.login.password} htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? m.login.submitting : m.login.submit}
        </button>
      </form>
    </main>
  )
}
