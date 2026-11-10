export interface Passenger {
  id: string
  name: string
  /** Digits only, as a string (keeps leading zeros). */
  identityNumber: string
  docType: string
  /** Free text, not a country id. */
  nationality: string
}

export interface InspectionCheckResult {
  checkId: string
  /** Snapshot taken when the inspection was created. */
  nameAr: string
  nameEn: string
  /** true = good. */
  status: boolean
  note: string | null
}

export interface InspectionIndicatorResult {
  indicatorId: string
  nameAr: string
  nameEn: string
  passed: boolean
  checks: InspectionCheckResult[]
}

export interface TripInspection {
  id: string
  tripId: string
  /** ISO timestamp (UTC). */
  inspectedAt: string
  passed: boolean
  failedCount: number
  indicators: InspectionIndicatorResult[]
  createdAt: string
  updatedAt: string
}

export interface Trip {
  id: string
  tripName: string | null
  secretCode: string | null
  vehicleId: string
  driverId: string
  /** "YYYY-MM-DD" wall-clock date. */
  date: string
  /** "HH:mm:ss" wall-clock time. */
  time: string
  /** Free text. Null only for trips created before origin / destination existed. */
  origin: string | null
  destination: string | null
  /** "YYYYMMDD-NNNN" (trip date + sequence per date), printed under the contract barcode. Never changes. */
  contractNumber: string
  /** "/api/files/<id>/download" (PNG); null if generation failed or the trip predates QR codes. */
  qrCodeUrl: string | null
  /** Sorted by name. */
  passengers: Passenger[]
  /** Null only for trips created before inspections were required. */
  inspection: TripInspection | null
  createdAt: string
  updatedAt: string
}

export interface PassengerBody {
  name: string
  identityNumber: string
  docType: string
  nationality: string
}

export interface InspectionResultBody {
  checkId: string
  status: boolean
  /** Omitted = no note. */
  note?: string
}

export interface CreateTripRequest {
  tripName?: string | null
  secretCode?: string | null
  vehicleId: string
  driverId: string
  date: string
  time: string
  origin: string
  destination: string
  passengers?: PassengerBody[]
  inspection: {
    /** ISO 8601 with offset; omitted = now. */
    inspectedAt?: string
    /** Exactly one per live check. */
    results: InspectionResultBody[]
  }
}

export interface UpdateTripRequest {
  tripName?: string | null
  secretCode?: string | null
  vehicleId?: string
  driverId?: string
  date?: string
  time?: string
  origin?: string
  destination?: string
  /** Replaces the whole list; [] clears it. */
  passengers?: PassengerBody[]
  inspection?: {
    inspectedAt?: string
    /** Only the checks to change. */
    results?: InspectionResultBody[]
  }
}

// A type alias (not an interface) so it is assignable to RequestOptions['query'].
export type TripListQuery = {
  page?: number
  limit?: number
  search?: string
  vehicleId?: string
  driverId?: string
  dateFrom?: string
  dateTo?: string
}
