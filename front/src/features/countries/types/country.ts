/** backend/contracts/countries.md `Country`. */
export interface Country {
  id: string
  nameAr: string
  nameEn: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /countries and PATCH /countries/:id (all fields sent). */
export interface CountryRequest {
  nameAr: string
  nameEn: string
}
