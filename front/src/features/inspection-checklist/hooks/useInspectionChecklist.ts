import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  createCheck,
  createIndicator,
  deleteCheck,
  deleteIndicator,
  fetchInspectionChecklist,
  updateCheck,
  updateIndicator,
} from '../services/inspectionChecklistService.ts'
import type {
  CheckRequest,
  IndicatorRequest,
  InspectionCheck,
  InspectionIndicator,
} from '../types/inspectionChecklist.ts'

export const inspectionChecklistKeys = {
  root: ['inspection-checklist'] as const,
}

/** The whole checklist. Also used by the trip form (Story 11). */
export function useInspectionChecklist(): UseQueryResult<InspectionIndicator[]> {
  return useQuery({
    queryKey: inspectionChecklistKeys.root,
    queryFn: ({ signal }) => fetchInspectionChecklist(signal),
  })
}

function useInvalidateChecklist(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: inspectionChecklistKeys.root })
}

export function useCreateIndicator(): UseMutationResult<InspectionIndicator, Error, IndicatorRequest> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: createIndicator, onSuccess: invalidate })
}

export function useUpdateIndicator(): UseMutationResult<
  InspectionIndicator,
  Error,
  { id: string; body: IndicatorRequest }
> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: ({ id, body }) => updateIndicator(id, body), onSuccess: invalidate })
}

export function useDeleteIndicator(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: deleteIndicator, onSuccess: invalidate })
}

export function useCreateCheck(): UseMutationResult<InspectionCheck, Error, CheckRequest> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: createCheck, onSuccess: invalidate })
}

export function useUpdateCheck(): UseMutationResult<InspectionCheck, Error, { id: string; body: CheckRequest }> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: ({ id, body }) => updateCheck(id, body), onSuccess: invalidate })
}

export function useDeleteCheck(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: deleteCheck, onSuccess: invalidate })
}
