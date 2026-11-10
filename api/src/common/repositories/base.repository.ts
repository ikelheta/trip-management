import type {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';

/**
 * Shared data access for module repositories. Not `@Injectable()`: each module
 * repository extends it and passes its injected TypeORM repository to `super()`.
 * Write methods take an optional `manager` to join the caller's transaction.
 */
export class BaseRepository<T extends { id: string }> {
  constructor(protected readonly repository: Repository<T>) {}

  create(data: DeepPartial<T>, manager?: EntityManager): Promise<T> {
    const repository = this.repositoryFor(manager);
    return repository.save(repository.create(data));
  }

  findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as FindOptionsWhere<T> });
  }

  findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  async update(
    id: string,
    data: DeepPartial<T>,
    manager?: EntityManager,
  ): Promise<T | null> {
    const repository = this.repositoryFor(manager);
    const entity = await repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) {
      return null;
    }
    repository.merge(entity, data);
    return repository.save(entity);
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const result = await this.repositoryFor(manager).delete({
      id,
    } as FindOptionsWhere<T>);
    return (result.affected ?? 0) > 0;
  }

  exists(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<boolean> {
    return this.repository.existsBy(where);
  }

  count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  protected repositoryFor(manager?: EntityManager): Repository<T> {
    return manager
      ? manager.getRepository(this.repository.target)
      : this.repository;
  }
}
