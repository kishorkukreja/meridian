import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMeeting, useUpdateMeeting } from '@/hooks/useMeetings'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import type { NextStep } from '@/types/database'

export function MeetingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useMeeting(id)
  const updateMeeting = useUpdateMeeting()
  const { data: objects } = useObjects({ is_archived: 'false' })
  const { data: issues } = useIssues()

  const [initialized, setInitialized] = useState(false)
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [tldr, setTldr] = useState('')
  const [discussionPoints, setDiscussionPoints] = useState('')
  const [nextSteps, setNextSteps] = useState<NextStep[]>([])
  const [actionLog, setActionLog] = useState('')
  const [linkedObjectIds, setLinkedObjectIds] = useState<string[]>([])
  const [linkedIssueIds, setLinkedIssueIds] = useState<string[]>([])
  const [error, setError] = useState('')

  // Initialize form from meeting data once loaded
  if (meeting && !initialized) {
    setTitle(meeting.title)
    setMeetingDate(meeting.meeting_date)
    setTldr(meeting.tldr || '')
    setDiscussionPoints((meeting.discussion_points || []).join('\n'))
    setNextSteps(meeting.next_steps || [])
    setActionLog(meeting.action_log || '')
    setLinkedObjectIds(meeting.linked_object_ids)
    setLinkedIssueIds(meeting.linked_issue_ids)
    setInitialized(true)
  }

  if (isLoading) return <LoadingSkeleton type="detail" />
  if (!meeting) return <p className="p-6 text-sm" style={{ color: 'var(--color-status-red)' }}>Meeting not found.</p>

  const isQuickSummary = meeting.meeting_type === 'quick_summary'
  const isAiConversation = meeting.meeting_type === 'ai_conversation'
  const noActionLog = isQuickSummary || isAiConversation

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await updateMeeting.mutateAsync({
        id: meeting.id,
        title,
        meeting_date: meetingDate,
        tldr,
        discussion_points: discussionPoints.split('\n').filter(Boolean),
        next_steps: nextSteps,
        action_log: noActionLog ? null : (actionLog || null),
        linked_object_ids: linkedObjectIds,
        linked_issue_ids: linkedIssueIds,
      })
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggleLinkedObject = (objId: string) => {
    setLinkedObjectIds(prev =>
      prev.includes(objId) ? prev.filter(x => x !== objId) : [...prev, objId]
    )
  }

  const toggleLinkedIssue = (issueId: string) => {
    setLinkedIssueIds(prev =>
      prev.includes(issueId) ? prev.filter(x => x !== issueId) : [...prev, issueId]
    )
  }

  const updateNextStep = (index: number, field: keyof NextStep, value: string) => {
    setNextSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    ))
  }

  const addNextStep = () => {
    setNextSteps(prev => [...prev, { action: '', owner: '', due_date: '' }])
  }

  const removeNextStep = (index: number) => {
    setNextSteps(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => navigate(`/meetings/${meeting.id}`)}
        className="text-xs cursor-pointer border-none bg-transparent mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Meeting
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-lg font-bold">Edit Meeting</h1>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isAiConversation
              ? 'color-mix(in srgb, #8B5CF6 15%, transparent)'
              : isQuickSummary
                ? 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)'
                : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            color: isAiConversation ? '#8B5CF6' : isQuickSummary ? 'var(--color-status-amber)' : 'var(--color-accent)',
          }}
        >
          {isAiConversation ? 'AI Chat' : isQuickSummary ? 'Quick Summary' : 'Full MoM'}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Title *">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label="Meeting Date *">
          <input
            type="date"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label={isAiConversation ? 'Summary' : isQuickSummary ? 'What You Missed' : 'TLDR'}>
          <textarea
            value={tldr}
            onChange={e => setTldr(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label={isAiConversation ? 'Topics Covered' : isQuickSummary ? 'Key Takeaways' : 'Discussion Points'}>
          <textarea
            value={discussionPoints}
            onChange={e => setDiscussionPoints(e.target.value)}
            rows={4}
            placeholder="One point per line"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label={isAiConversation ? 'Extracted Issues' : isQuickSummary ? 'Action Items' : 'Next Steps'}>
          <div className="space-y-2">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <input
                    value={step.action}
                    onChange={e => updateNextStep(i, 'action', e.target.value)}
                    placeholder="Action"
                    className="px-2 py-1.5 rounded text-xs border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <input
                    value={step.owner}
                    onChange={e => updateNextStep(i, 'owner', e.target.value)}
                    placeholder="Owner"
                    className="px-2 py-1.5 rounded text-xs border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <input
                    type="date"
                    value={step.due_date}
                    onChange={e => updateNextStep(i, 'due_date', e.target.value)}
                    className="px-2 py-1.5 rounded text-xs border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeNextStep(i)}
                  className="h-7 w-7 rounded flex items-center justify-center text-xs cursor-pointer border shrink-0"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-status-red)' }}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addNextStep}
              className="h-7 px-3 rounded text-xs cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-accent)' }}
            >
              + Add Step
            </button>
          </div>
        </Field>

        {!noActionLog && (
          <Field label="Action Log">
            <textarea
              value={actionLog}
              onChange={e => setActionLog(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-data)] border outline-none resize-y"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
        )}

        <Field label="Link to Objects (optional)">
          <div className="flex flex-wrap gap-1.5">
            {objects?.map(obj => (
              <button
                key={obj.id}
                type="button"
                onClick={() => toggleLinkedObject(obj.id)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border transition-colors"
                style={{
                  borderColor: linkedObjectIds.includes(obj.id) ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: linkedObjectIds.includes(obj.id) ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: linkedObjectIds.includes(obj.id) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {obj.name}
              </button>
            ))}
            {objects?.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No objects available</span>
            )}
          </div>
        </Field>

        <Field label="Link to Issues (optional)">
          <div className="flex flex-wrap gap-1.5">
            {issues?.map(issue => (
              <button
                key={issue.id}
                type="button"
                onClick={() => toggleLinkedIssue(issue.id)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border transition-colors"
                style={{
                  borderColor: linkedIssueIds.includes(issue.id) ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: linkedIssueIds.includes(issue.id) ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: linkedIssueIds.includes(issue.id) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {issue.title}
              </button>
            ))}
            {issues?.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No issues available</span>
            )}
          </div>
        </Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={updateMeeting.isPending}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {updateMeeting.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/meetings/${meeting.id}`)}
            className="h-10 px-4 text-sm cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}
