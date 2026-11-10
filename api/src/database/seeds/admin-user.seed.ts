import type { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole } from '../../modules/users/enums/user-role.enum.js';
import { hashPassword } from '../../modules/users/password-hasher.js';

/**
 * Creates the first admin and returns true, or false when the email is already taken.
 * Never changes an existing user's password or role.
 */
export async function seedAdminUser(
  dataSource: DataSource,
  email: string,
  password: string,
): Promise<boolean> {
  const repository = dataSource.getRepository(User);
  const normalized = email.trim().toLowerCase();
  if (await repository.existsBy({ email: normalized })) {
    return false;
  }
  await repository.insert({
    email: normalized,
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.Admin,
    passwordHash: await hashPassword(password),
  });
  return true;
}
