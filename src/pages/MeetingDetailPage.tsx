import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMeeting, useDeleteMeeting } from '@/hooks/useMeetings'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ConvertToIssueDialog } from '@/components/ConvertToIssueDialog'
import type { NextStep } from '@/types/database'

export function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: meeting, isLoading } = useMeeting(id)
  const deleteMeeting = useDeleteMeeting()
  const [showTranscript, setShowTranscript] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [convertSteps, setConvertSteps] = useState<NextStep[] | null>(null)

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

  const isQuickSummary = meeting.meeting_type === 'quick_summary'
  const isAiConversation = meeting.meeting_type === 'ai_conversation'

  const QUOTES = [
    '"A meeting is an event where minutes are kept and hours are lost." - Unknown',
    '"The best meeting is the one that never happens." - Someone who values your time',
    '"If you had to identify, in one word, the reason the human race has not achieved its full potential, that word would be meetings." - Dave Barry',
    '"Meetings: where great ideas go to get bullet-pointed." - Corporate Wisdom',
    '"The length of a meeting rises with the square of the number of people present." - Eileen Shanahan',
    '"I survived another meeting that should have been an email." - Every Employee Ever',
    '"People who enjoy meetings should not be in charge of anything." - Thomas Sowell',
    '"A committee is a group of people who individually can do nothing, but who, as a group, can meet and decide that nothing can be done." - Fred Allen',
    '"The most dangerous phrase in business is: Let\'s schedule a meeting about it." - Unknown',
    '"You don\'t need more meetings. You need more clarity." - Someone who left early',
  ]

  const getQuote = () => {
    // Use meeting id as seed for consistent quote per meeting
    const hash = meeting.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return QUOTES[hash % QUOTES.length]
  }

  const generateEmailBody = () => {
    const date = new Date(meeting.meeting_date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const subjectPrefix = isAiConversation ? 'AI Chat Summary' : isQuickSummary ? 'Summary' : 'MoM'
    let email = `Subject: ${subjectPrefix} - ${meeting.title} (${date})\n\n`
    email += `Hi all,\n\n`

    if (isAiConversation) {
      email += `Here's a summary of issues extracted from an AI conversation on ${date}.\n\n`
    } else if (isQuickSummary) {
      email += `Here's a quick summary of what was discussed on ${date}.\n\n`
    } else {
      email += `Please find below the minutes from our meeting on ${date}.\n\n`
    }

    if (meeting.tldr) {
      email += `${isAiConversation ? 'SUMMARY' : isQuickSummary ? 'WHAT YOU MISSED' : 'SUMMARY'}\n${meeting.tldr}\n\n`
    }

    if (meeting.discussion_points && meeting.discussion_points.length > 0) {
      email += `${isAiConversation ? 'TOPICS COVERED' : isQuickSummary ? 'KEY TAKEAWAYS' : 'DISCUSSION POINTS'}\n`
      meeting.discussion_points.forEach((point, i) => {
        email += `${i + 1}. ${point}\n`
      })
      email += `\n`
    }

    if (meeting.next_steps && meeting.next_steps.length > 0) {
      email += `${isAiConversation ? 'EXTRACTED ISSUES' : isQuickSummary ? 'ACTION ITEMS' : 'NEXT STEPS'}\n`
      meeting.next_steps.forEach(step => {
        email += `  - ${step.action}\n`
        email += `    Owner: ${step.owner}  |  Due: ${step.due_date}\n`
      })
      email += `\n`
    }

    if (!isQuickSummary && meeting.action_log) {
      email += `ACTION LOG\n${meeting.action_log}\n\n`
    }

    email += `---\nPlease reach out if anything needs correction.\n\n`
    email += `${getQuote()}\n\n`
    email += `Warm regards,\nKishor Kukreja`

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
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
              className="h-8 px-3 rounded text-xs cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 px-3 rounded text-xs cursor-pointer border"
              style={{ borderColor: 'var(--color-status-red)', backgroundColor: 'transparent', color: 'var(--color-status-red)' }}
            >
              Delete
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isAiConversation
                ? 'color-mix(in srgb, #8B5CF6 15%, transparent)'
                : meeting.meeting_type === 'quick_summary'
                  ? 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
              color: isAiConversation ? '#8B5CF6' : meeting.meeting_type === 'quick_summary' ? 'var(--color-status-amber)' : 'var(--color-accent)',
            }}
          >
            {isAiConversation ? 'AI Chat' : meeting.meeting_type === 'quick_summary' ? 'Quick Summary' : 'Full MoM'}
          </span>
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
          <h2 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {isAiConversation ? 'Summary' : isQuickSummary ? 'What You Missed' : 'TLDR'}
          </h2>
          <p className="text-sm">{meeting.tldr}</p>
        </div>
      )}

      {/* Discussion Points / Key Takeaways */}
      {meeting.discussion_points && meeting.discussion_points.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">
            {isAiConversation ? 'Topics Covered' : isQuickSummary ? 'Key Takeaways' : 'Discussion Points'}
          </h2>
          <ol className="list-decimal pl-5 space-y-1">
            {meeting.discussion_points.map((point, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{point}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Next Steps / Action Items */}
      {meeting.next_steps && meeting.next_steps.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">
            {isAiConversation ? 'Extracted Issues' : isQuickSummary ? 'Action Items' : 'Next Steps'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Action</th>
                  <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Owner</th>
                  <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Due Date</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {meeting.next_steps.map((step, i) => {
                  const isLinked = meeting.linked_issue_titles.includes(step.action)
                  return (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}>
                    <td className="px-3 py-2 text-xs">{step.action}</td>
                    <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.owner}</td>
                    <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]">{step.due_date}</td>
                    <td className="px-3 py-2">
                      {isLinked ? (
                        <span
                          className="h-6 px-2 rounded text-[10px] inline-flex items-center border whitespace-nowrap"
                          style={{ borderColor: 'var(--color-status-green)', backgroundColor: 'color-mix(in srgb, var(--color-status-green) 10%, transparent)', color: 'var(--color-status-green)' }}
                        >
                          Issue Linked
                        </span>
                      ) : (
                        <button
                          onClick={() => setConvertSteps([step])}
                          className="h-6 px-2 rounded text-[10px] cursor-pointer border whitespace-nowrap"
                          style={{ borderColor: 'var(--color-accent)', backgroundColor: 'transparent', color: 'var(--color-accent)' }}
                        >
                          Create Issue
                        </button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {(() => {
            const unlinked = meeting.next_steps!.filter(s => !meeting.linked_issue_titles.includes(s.action))
            return unlinked.length > 0 ? (
              <button
                onClick={() => setConvertSteps(unlinked)}
                className="mt-3 h-8 px-4 rounded-lg text-xs font-medium cursor-pointer border"
                style={{ borderColor: 'var(--color-accent)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}
              >
                Convert {unlinked.length === meeting.next_steps!.length ? 'All' : `Remaining ${unlinked.length}`} to Issues
              </button>
            ) : (
              <span
                className="mt-3 inline-flex items-center h-8 px-4 rounded-lg text-xs font-medium border"
                style={{ borderColor: 'var(--color-status-green)', backgroundColor: 'color-mix(in srgb, var(--color-status-green) 10%, transparent)', color: 'var(--color-status-green)' }}
              >
                All Issues Linked
              </span>
            )
          })()}
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

      {/* Convert to Issue Dialog */}
      {convertSteps && (
        <ConvertToIssueDialog
          nextSteps={convertSteps}
          meetingId={meeting.id}
          existingLinkedIssueIds={meeting.linked_issue_ids}
          onClose={() => setConvertSteps(null)}
          onComplete={() => {
            setConvertSteps(null)
            queryClient.invalidateQueries({ queryKey: ['meeting', id] })
          }}
        />
      )}

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
