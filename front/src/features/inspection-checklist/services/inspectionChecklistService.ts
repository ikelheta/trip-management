import { apiRequest } from '../../../shared/services/httpClient.ts'
import type {
  CheckRequest,
  IndicatorRequest,
  InspectionCheck,
  InspectionIndicator,
} from '../types/inspectionChecklist.ts'

const INDICATORS_PATH = '/inspection-indicators'
const CHECKS_PATH = '/inspection-checks'

/** The whole checklist: every indicator with its checks, already sorted. Not paginated. */
export function fetchInspectionChecklist(signal?: AbortSignal): Promise<InspectionIndicator[]> {
  return apiRequest<InspectionIndicator[]>(INDICATORS_PATH, { signal })
}

export function createIndicator(body: IndicatorRequest): Promise<InspectionIndicator> {
  return apiRequest<InspectionIndicator>(INDICATORS_PATH, { method: 'POST', body })
}

export function updateIndicator(id: string, body: IndicatorRequest): Promise<InspectionIndicator> {
  return apiRequest<InspectionIndicator>(`${INDICATORS_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteIndicator(id: string): Promise<void> {
  return apiRequest<void>(`${INDICATORS_PATH}/${id}`, { method: 'DELETE' })
}

export function createCheck(body: CheckRequest): Promise<InspectionCheck> {
  return apiRequest<InspectionCheck>(CHECKS_PATH, { method: 'POST', body })
}

export function updateCheck(id: string, body: CheckRequest): Promise<InspectionCheck> {
  return apiRequest<InspectionCheck>(`${CHECKS_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteCheck(id: string): Promise<void> {
  return apiRequest<void>(`${CHECKS_PATH}/${id}`, { method: 'DELETE' })
}
