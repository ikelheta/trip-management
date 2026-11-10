import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.withPassword().where('user.email = :email', { email }).getOne();
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.withPassword().where('user.id = :id', { id }).getOne();
  }

  create(data: DeepPartial<User>): Promise<User> {
    return this.repository.save(this.repository.create(data));
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.repository.remove(user);
  }

  private withPassword() {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash');
  }
}
