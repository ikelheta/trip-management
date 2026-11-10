import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { hashPassword, verifyPassword } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const { password, ...fields } = dto;
    const email = this.normalizeEmail(fields.email);
    await this.ensureEmailIsAvailable(email);
    return this.usersRepository.create({
      ...fields,
      email,
      passwordHash: await hashPassword(password),
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const { password, ...fields } = dto;

    if (fields.email !== undefined) {
      const email = this.normalizeEmail(fields.email);
      if (email !== user.email) {
        await this.ensureEmailIsAvailable(email);
      }
      fields.email = email;
    }

    const changes: Partial<User> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (password !== undefined) {
      changes.passwordHash = await hashPassword(password);
    }
    return this.usersRepository.save(Object.assign(user, changes));
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  /** The user if it exists and is active, otherwise null (used for every authenticated request). */
  async findActive(id: string): Promise<User | null> {
    const user = await this.usersRepository.findById(id);
    return user?.isActive ? user : null;
  }

  /** The active user with this email and password, otherwise null. */
  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findByEmailWithPassword(
      this.normalizeEmail(email),
    );
    const matches = await verifyPassword(password, user?.passwordHash);
    return matches && user?.isActive ? user : null;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdWithPassword(id);
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictException('Email is already in use');
    }
  }
}
