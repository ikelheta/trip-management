import { useEffect, useRef } from 'react'
import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'

interface SearchInputProps {
  defaultValue: string
  onSearch: (value: string) => void
  /** Defaults to "Search…" in the current language. */
  placeholder?: string
  /** Accessible name; defaults to "Search" in the current language. */
  label?: string
}

const SEARCH_DEBOUNCE_MS = 300
const MAX_SEARCH_LENGTH = 100

export function SearchInput({
  defaultValue,
  onSearch,
  placeholder,
  label,
}: SearchInputProps) {
  const m = useMessages(commonMessages)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleChange(value: string) {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onSearch(value.trim()), SEARCH_DEBOUNCE_MS)
  }

  return (
    <input
      type="search"
      className="input search-input"
      aria-label={label ?? m.search.ariaLabel}
      placeholder={placeholder ?? m.search.placeholder}
      defaultValue={defaultValue}
      maxLength={MAX_SEARCH_LENGTH}
      onChange={(event) => handleChange(event.target.value)}
    />
  )
}
