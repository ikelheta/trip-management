import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import type { CreatePassengerDto } from './dto/create-passenger.dto.js';
import { Passenger } from './entities/passenger.entity.js';

@Injectable()
export class PassengersRepository extends BaseRepository<Passenger> {
  constructor(@InjectRepository(Passenger) repository: Repository<Passenger>) {
    super(repository);
  }

  // Always called inside the trip's transaction, so the list is swapped atomically.
  async replaceForTrip(
    tripId: string,
    passengers: CreatePassengerDto[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = this.repositoryFor(manager);
    await repository.delete({ tripId });
    if (passengers.length > 0) {
      await repository.save(
        passengers.map((passenger) =>
          repository.create({ ...passenger, tripId }),
        ),
      );
    }
  }
}
