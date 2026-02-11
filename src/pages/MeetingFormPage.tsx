import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateMeeting, useGenerateMoM } from '@/hooks/useMeetings'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { readTranscriptFile } from '@/lib/fileReader'
import type { NextStep } from '@/types/database'

type GeneratedMoM = {
  tldr: string
  discussion_points: string[]
  next_steps: NextStep[]
  action_log: string
  model_used: string
}

export function MeetingFormPage() {
  const navigate = useNavigate()
  const createMeeting = useCreateMeeting()
  const generateMoM = useGenerateMoM()
  const { data: objects } = useObjects({ is_archived: 'false' })
  const { data: issues } = useIssues()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Phase 1: Input
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [transcript, setTranscript] = useState('')
  const [linkedObjectIds, setLinkedObjectIds] = useState<string[]>([])
  const [linkedIssueIds, setLinkedIssueIds] = useState<string[]>([])
  const [fileError, setFileError] = useState('')

  // Phase 2: Review
  const [generated, setGenerated] = useState<GeneratedMoM | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editTldr, setEditTldr] = useState('')
  const [editDiscussion, setEditDiscussion] = useState('')
  const [editNextSteps, setEditNextSteps] = useState<NextStep[]>([])
  const [editActionLog, setEditActionLog] = useState('')

  const [error, setError] = useState('')

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    try {
      const text = await readTranscriptFile(file)
      setTranscript(text)
    } catch (err) {
      setFileError((err as Error).message)
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const result = await generateMoM.mutateAsync(transcript)
      setGenerated(result)
      setEditTldr(result.tldr)
      setEditDiscussion(result.discussion_points.join('\n'))
      setEditNextSteps(result.next_steps)
      setEditActionLog(result.action_log)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleSave = async () => {
    setError('')
    const mom = editMode ? {
      tldr: editTldr,
      discussion_points: editDiscussion.split('\n').filter(Boolean),
      next_steps: editNextSteps,
      action_log: editActionLog,
    } : {
      tldr: generated!.tldr,
      discussion_points: generated!.discussion_points,
      next_steps: generated!.next_steps,
      action_log: generated!.action_log,
    }

    try {
      const result = await createMeeting.mutateAsync({
        title,
        meeting_date: meetingDate,
        transcript,
        tldr: mom.tldr,
        discussion_points: mom.discussion_points,
        next_steps: mom.next_steps,
        action_log: mom.action_log,
        model_used: generated!.model_used,
        linked_object_ids: linkedObjectIds,
        linked_issue_ids: linkedIssueIds,
      })
      navigate(`/meetings/${result.id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleRegenerate = async () => {
    setError('')
    setEditMode(false)
    try {
      const result = await generateMoM.mutateAsync(transcript)
      setGenerated(result)
      setEditTldr(result.tldr)
      setEditDiscussion(result.discussion_points.join('\n'))
      setEditNextSteps(result.next_steps)
      setEditActionLog(result.action_log)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggleLinkedObject = (id: string) => {
    setLinkedObjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleLinkedIssue = (id: string) => {
    setLinkedIssueIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const updateNextStep = (index: number, field: keyof NextStep, value: string) => {
    setEditNextSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    ))
  }

  const addNextStep = () => {
    setEditNextSteps(prev => [...prev, { action: '', owner: '', due_date: '' }])
  }

  const removeNextStep = (index: number) => {
    setEditNextSteps(prev => prev.filter((_, i) => i !== index))
  }

  // Phase 2: Review & Save
  if (generated) {
    const mom = editMode ? {
      tldr: editTldr,
      discussion_points: editDiscussion.split('\n').filter(Boolean),
      next_steps: editNextSteps,
      action_log: editActionLog,
    } : generated

    return (
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        <button
          onClick={() => setGenerated(null)}
          className="text-xs cursor-pointer border-none bg-transparent"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &larr; Back to Input
        </button>

        <h1 className="text-lg font-bold">Review Meeting Minutes</h1>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {title} &middot; {meetingDate} &middot; Model: {generated.model_used}
        </p>

        {/* TLDR */}
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-accent)' }}>
          <h2 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>TLDR</h2>
          {editMode ? (
            <textarea
              value={editTldr}
              onChange={e => setEditTldr(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          ) : (
            <p className="text-sm">{mom.tldr}</p>
          )}
        </div>

        {/* Discussion Points */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Discussion Points</h2>
          {editMode ? (
            <textarea
              value={editDiscussion}
              onChange={e => setEditDiscussion(e.target.value)}
              rows={4}
              placeholder="One point per line"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          ) : (
            <ol className="list-decimal pl-5 space-y-1">
              {mom.discussion_points.map((point, i) => (
                <li key={i} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{point}</li>
              ))}
            </ol>
          )}
        </div>

        {/* Next Steps */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Next Steps</h2>
          {editMode ? (
            <div className="space-y-2">
              {editNextSteps.map((step, i) => (
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Action</th>
                    <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Owner</th>
                    <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mom.next_steps.map((step, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs">{step.action}</td>
                      <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.owner}</td>
                      <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Log */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Action Log</h2>
          {editMode ? (
            <textarea
              value={editActionLog}
              onChange={e => setEditActionLog(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-data)] border outline-none resize-y"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          ) : (
            <pre className="text-xs font-[family-name:var(--font-data)] whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
              {mom.action_log}
            </pre>
          )}
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={createMeeting.isPending}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {createMeeting.isPending ? 'Saving...' : 'Save Meeting'}
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className="h-10 px-4 rounded-lg text-sm cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            {editMode ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={generateMoM.isPending}
            className="h-10 px-4 rounded-lg text-sm cursor-pointer border disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            {generateMoM.isPending ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    )
  }

  // Phase 1: Input
  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => navigate('/meetings')}
        className="text-xs cursor-pointer border-none bg-transparent mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Meetings
      </button>

      <h1 className="text-lg font-bold mb-6">New Meeting</h1>

      <form onSubmit={handleGenerate} className="space-y-4">
        <Field label="Title *">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="Weekly S&OP Sync"
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

        <Field label="Transcript *">
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            required
            rows={10}
            placeholder="Paste meeting transcript here..."
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 rounded text-xs cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              Upload .txt / .docx
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            {transcript && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {transcript.length.toLocaleString()} characters
              </span>
            )}
          </div>
          {fileError && <p className="text-xs mt-1" style={{ color: 'var(--color-status-red)' }}>{fileError}</p>}
        </Field>

        {/* Linked Objects */}
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

        {/* Linked Issues */}
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
            disabled={generateMoM.isPending || !transcript.trim()}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {generateMoM.isPending ? 'Generating...' : 'Generate Minutes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/meetings')}
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
