import type { Passenger } from '../entities/passenger.entity.js';

export class PassengerResponseDto {
  id: string;
  name: string;
  identityNumber: string;
  docType: string;
  nationality: string;

  static fromEntity(passenger: Passenger): PassengerResponseDto {
    return {
      id: passenger.id,
      name: passenger.name,
      identityNumber: passenger.identityNumber,
      docType: passenger.docType,
      nationality: passenger.nationality,
    };
  }
}
