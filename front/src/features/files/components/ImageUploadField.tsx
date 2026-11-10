import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { translateApiMessage } from '../../../shared/i18n/apiMessages.ts'
import type { Language } from '../../../shared/i18n/language.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { ApiError } from '../../../shared/services/httpClient.ts'
import { filesMessages, type FilesMessages } from '../i18n.ts'
import { uploadFile } from '../services/fileService.ts'
import { IMAGE_MIME_TYPES, MAX_FILE_SIZE_MB, validateImageFile, type ImageFileProblem } from '../utils/fileRules.ts'
import { AuthImage } from './AuthImage.tsx'
import styles from './ImageUploadField.module.css'

interface ImageUploadFieldProps {
  id: string
  label: string
  /** The owning module, e.g. "companies" (backend pattern ^[a-z][a-z0-9-]{0,49}$). */
  ownerType: string
  /** The current file url, or null. */
  value: string | null
  onChange: (url: string | null) => void
  /** Validation error from the form (e.g. a server message for this field). */
  error?: string
}

// Kept as data, not text, so the message follows a language switch.
type UploadProblem = ImageFileProblem | 'failed' | ApiError

function describeUploadProblem(problem: UploadProblem, m: FilesMessages, language: Language): string {
  if (problem instanceof ApiError) {
    return problem.messages.map((message) => translateApiMessage(message, language)).join(' ')
  }
  if (problem === 'tooLarge') {
    return m.upload.tooLarge(MAX_FILE_SIZE_MB)
  }
  return m.upload[problem]
}

export function ImageUploadField({ id, label, ownerType, value, onChange, error }: ImageUploadFieldProps) {
  const m = useMessages(filesMessages)
  const { language } = useLanguage()
  const [uploadProblem, setUploadProblem] = useState<UploadProblem | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const upload = useMutation({ mutationFn: (file: File) => uploadFile(file, ownerType) })

  async function handleFile(file: File | undefined): Promise<void> {
    setUploadProblem(null)
    if (!file) {
      return
    }
    const problem = validateImageFile(file)
    if (problem) {
      setUploadProblem(problem)
    } else {
      try {
        const uploaded = await upload.mutateAsync(file)
        onChange(uploaded.url)
      } catch (uploadFailure) {
        setUploadProblem(uploadFailure instanceof ApiError ? uploadFailure : 'failed')
      }
    }
    // Allow picking the same file again after an error or a removal.
    if (input.current) {
      input.current.value = ''
    }
  }

  const uploadError = uploadProblem ? describeUploadProblem(uploadProblem, m, language) : undefined

  return (
    <Field label={label} htmlFor={id} error={uploadError ?? error} hint={m.upload.hint(MAX_FILE_SIZE_MB)}>
      <div className={styles.upload}>
        {value && <AuthImage url={value} alt={label} className={styles.preview} />}
        <input
          ref={input}
          id={id}
          type="file"
          accept={IMAGE_MIME_TYPES.join(',')}
          className="input"
          disabled={upload.isPending}
          aria-invalid={Boolean(uploadError ?? error)}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {upload.isPending && (
          <span className="muted" role="status">
            {m.upload.uploading}
          </span>
        )}
        {value && !upload.isPending && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onChange(null)}>
            {m.upload.remove}
          </button>
        )}
      </div>
    </Field>
  )
}
