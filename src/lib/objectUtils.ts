import type { ModuleType, ObjectCategory } from '@/types/database'

export const MODULE_CODES: Record<ModuleType, string> = {
  demand_planning: 'DP',
  supply_planning: 'SP',
}

export const CATEGORY_CODES: Record<ObjectCategory, string> = {
  master_data: 'MD',
  drivers: 'DR',
  priority_1: 'P1',
  priority_2: 'P2',
  priority_3: 'P3',
}

export function computeNextCode(existingNames: string[], module: ModuleType, category: ObjectCategory): string {
  const prefix = `OBJ-${MODULE_CODES[module]}-${CATEGORY_CODES[category]}-`
  const existing = existingNames
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.slice(prefix.length), 10))
    .filter(n => !isNaN(n))
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return `${prefix}${String(next).padStart(3, '0')}`
}
