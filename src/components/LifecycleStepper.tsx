import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import { STAGE_COLORS } from '@/lib/constants'
import type { LifecycleStage, StageHistoryRow } from '@/types/database'

interface Props {
  currentStage: LifecycleStage
  stageHistory?: StageHistoryRow[]
  compact?: boolean
}

export function LifecycleStepper({ currentStage, stageHistory, compact = false }: Props) {
  const currentIdx = LIFECYCLE_STAGES.indexOf(currentStage)

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {LIFECYCLE_STAGES.map((stage, i) => (
          <div
            key={stage}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor: i <= currentIdx ? STAGE_COLORS[stage] : 'var(--color-border)',
            }}
            title={STAGE_LABELS[stage]}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        const historyEntry = stageHistory?.find(h => h.to_stage === stage)

        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300 ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-offset-bg-primary' : ''
                }`}
                style={{
                  backgroundColor: isCompleted || isCurrent ? STAGE_COLORS[stage] : 'var(--color-bg-tertiary)',
                  color: isCompleted || isCurrent ? '#fff' : 'var(--color-text-tertiary)',
                  '--tw-ring-color': isCurrent ? STAGE_COLORS[stage] : undefined,
                } as React.CSSProperties}
              >
                {i + 1}
              </div>
              <span className="text-[10px] mt-1 text-center truncate w-full" style={{
                color: isCompleted || isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              }}>
                {STAGE_LABELS[stage]}
              </span>
              {historyEntry && (
                <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(historyEntry.transitioned_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <div
                className="h-0.5 w-4 shrink-0 mx-0.5"
                style={{
                  backgroundColor: i < currentIdx ? STAGE_COLORS[stage] : 'var(--color-border)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
