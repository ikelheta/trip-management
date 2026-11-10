import type { User } from '../../../shared/types/user.ts'
import styles from './UserAvatar.module.css'

interface UserAvatarProps {
  user: Pick<User, 'firstName' | 'lastName'>
  size?: 'small' | 'large'
}

// Array.from: the first character, even when it is outside the Basic Multilingual Plane.
function getInitials({ firstName, lastName }: UserAvatarProps['user']): string {
  const first = Array.from(firstName.trim())[0] ?? ''
  const last = Array.from(lastName.trim())[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

/** The user's initials in a circle. Decorative: the name is always shown next to it. */
export function UserAvatar({ user, size = 'small' }: UserAvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden="true">
      {getInitials(user)}
    </span>
  )
}
