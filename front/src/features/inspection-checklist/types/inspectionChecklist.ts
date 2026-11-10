/** backend/contracts/inspection-checklist.md `InspectionCheck`. */
export interface InspectionCheck {
  id: string
  indicatorId: string
  nameAr: string
  nameEn: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** An indicator with its live checks, sorted by sortOrder then nameEn. */
export interface InspectionIndicator {
  id: string
  nameAr: string
  nameEn: string
  sortOrder: number
  checks: InspectionCheck[]
  createdAt: string
  updatedAt: string
}

/** Body of POST / PATCH /inspection-indicators (all fields sent). */
export interface IndicatorRequest {
  nameAr: string
  nameEn: string
  sortOrder: number
}

/** Body of POST / PATCH /inspection-checks (all fields sent; a new indicatorId moves the check). */
export interface CheckRequest extends IndicatorRequest {
  indicatorId: string
}
