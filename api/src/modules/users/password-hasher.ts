import { compare, hash, hashSync } from 'bcryptjs';

const BCRYPT_COST = 12;

// Compared against when there is no user or hash, so response time does not reveal which emails exist.
const DUMMY_HASH = hashSync('timing-equalizer', BCRYPT_COST);

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const matches = await compare(password, passwordHash ?? DUMMY_HASH);
  return matches && !!passwordHash;
}
