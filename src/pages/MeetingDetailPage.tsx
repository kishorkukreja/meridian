import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMeeting, useDeleteMeeting } from '@/hooks/useMeetings'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useMeeting(id)
  const deleteMeeting = useDeleteMeeting()
  const [showTranscript, setShowTranscript] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (isLoading) return <LoadingSkeleton type="detail" />
  if (!meeting) return <p className="p-6 text-sm" style={{ color: 'var(--color-status-red)' }}>Meeting not found.</p>

  const handleCopy = async () => {
    if (!meeting.action_log) return
    await navigator.clipboard.writeText(meeting.action_log)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    await deleteMeeting.mutateAsync(meeting.id)
    navigate('/meetings')
  }

  const generateEmailBody = () => {
    const date = new Date(meeting.meeting_date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    let email = `Subject: MoM - ${meeting.title} (${date})\n\n`
    email += `Hi all,\n\n`
    email += `Please find below the minutes from our meeting on ${date}.\n\n`

    if (meeting.tldr) {
      email += `SUMMARY\n${meeting.tldr}\n\n`
    }

    if (meeting.discussion_points && meeting.discussion_points.length > 0) {
      email += `DISCUSSION POINTS\n`
      meeting.discussion_points.forEach((point, i) => {
        email += `${i + 1}. ${point}\n`
      })
      email += `\n`
    }

    if (meeting.next_steps && meeting.next_steps.length > 0) {
      email += `NEXT STEPS\n`
      meeting.next_steps.forEach(step => {
        email += `  - ${step.action}\n`
        email += `    Owner: ${step.owner}  |  Due: ${step.due_date}\n`
      })
      email += `\n`
    }

    if (meeting.action_log) {
      email += `ACTION LOG\n${meeting.action_log}\n\n`
    }

    email += `---\nPlease reach out if anything needs correction.\n\nBest regards`

    return email
  }

  const handleCopyEmail = async () => {
    const email = generateEmailBody()
    await navigator.clipboard.writeText(email)
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <button
        onClick={() => navigate('/meetings')}
        className="text-xs cursor-pointer border-none bg-transparent"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Meetings
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl font-bold">{meeting.title}</h1>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="h-8 px-3 rounded text-xs cursor-pointer border shrink-0"
            style={{ borderColor: 'var(--color-status-red)', backgroundColor: 'transparent', color: 'var(--color-status-red)' }}
          >
            Delete
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>Date: <span className="font-[family-name:var(--font-data)]">{new Date(meeting.meeting_date).toLocaleDateString()}</span></span>
          {meeting.model_used && <span>Model: <span className="font-[family-name:var(--font-data)]">{meeting.model_used}</span></span>}
          <span>Created: <span className="font-[family-name:var(--font-data)]">{new Date(meeting.created_at).toLocaleDateString()}</span></span>
        </div>
      </div>

      {/* Email Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyEmail}
          className="h-8 px-3 rounded-lg text-xs font-medium cursor-pointer border"
          style={{ borderColor: 'var(--color-accent)', backgroundColor: 'transparent', color: 'var(--color-accent)' }}
        >
          {emailCopied ? 'Copied to Clipboard!' : 'Copy as Email'}
        </button>
        <button
          onClick={() => setShowEmailPreview(!showEmailPreview)}
          className="h-8 px-3 rounded-lg text-xs cursor-pointer border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
        >
          {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
        </button>
      </div>

      {showEmailPreview && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Email Preview</h2>
            <button
              onClick={handleCopyEmail}
              className="h-6 px-2 rounded text-[10px] cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              {emailCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-primary)' }}>
            {generateEmailBody()}
          </pre>
        </div>
      )}

      {/* TLDR */}
      {meeting.tldr && (
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-accent)' }}>
          <h2 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>TLDR</h2>
          <p className="text-sm">{meeting.tldr}</p>
        </div>
      )}

      {/* Discussion Points */}
      {meeting.discussion_points && meeting.discussion_points.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Discussion Points</h2>
          <ol className="list-decimal pl-5 space-y-1">
            {meeting.discussion_points.map((point, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{point}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Next Steps */}
      {meeting.next_steps && meeting.next_steps.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Next Steps</h2>
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
                {meeting.next_steps.map((step, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}>
                    <td className="px-3 py-2 text-xs">{step.action}</td>
                    <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.owner}</td>
                    <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Log */}
      {meeting.action_log && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Action Log</h2>
            <button
              onClick={handleCopy}
              className="h-7 px-2.5 rounded text-[11px] cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs font-[family-name:var(--font-data)] whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
            {meeting.action_log}
          </pre>
        </div>
      )}

      {/* Linked Objects */}
      {meeting.linked_object_names.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Linked Objects</h2>
          <div className="flex flex-wrap gap-1.5">
            {meeting.linked_object_ids.map((objId, i) => (
              <button
                key={objId}
                onClick={() => navigate(`/objects/${objId}`)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border"
                style={{ borderColor: 'var(--color-accent)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}
              >
                {meeting.linked_object_names[i] || objId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Issues */}
      {meeting.linked_issue_titles.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Linked Issues</h2>
          <div className="flex flex-wrap gap-1.5">
            {meeting.linked_issue_ids.map((issueId, i) => (
              <button
                key={issueId}
                onClick={() => navigate(`/issues/${issueId}`)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border"
                style={{ borderColor: 'var(--color-status-amber)', backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 10%, transparent)', color: 'var(--color-status-amber)' }}
              >
                {meeting.linked_issue_titles[i] || issueId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcript (collapsible) */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-2 text-sm font-semibold cursor-pointer border-none bg-transparent w-full text-left"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: showTranscript ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Transcript
        </button>
        {showTranscript && (
          <pre className="mt-3 text-xs whitespace-pre-wrap max-h-96 overflow-y-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {meeting.transcript}
          </pre>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-bold mb-1">Delete Meeting</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              This will permanently delete this meeting and its generated minutes. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMeeting.isPending}
                className="h-9 px-4 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-status-red)', color: '#fff' }}
              >
                {deleteMeeting.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
