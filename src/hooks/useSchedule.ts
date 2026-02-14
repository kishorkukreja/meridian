import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { generateOccurrences, getTodayStr, parseDate } from '@/lib/recurrence'
import type { RecurringMeetingRow, ScheduleLogRow, ScheduleOccurrence } from '@/types/database'

export function useRecurringMeetings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recurring-meetings'],
    queryFn: async (): Promise<RecurringMeetingRow[]> => {
      const { data, error } = await supabase
        .from('meridian_recurring_meetings')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data as RecurringMeetingRow[]
    },
    enabled: !!user,
  })
}

export function useRecurringMeeting(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recurring-meeting', id],
    queryFn: async (): Promise<RecurringMeetingRow> => {
      const { data, error } = await supabase
        .from('meridian_recurring_meetings')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as RecurringMeetingRow
    },
    enabled: !!user && !!id,
  })
}

export function useCreateRecurringMeeting() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (meeting: Omit<RecurringMeetingRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('meridian_recurring_meetings')
        .insert({ ...meeting, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as RecurringMeetingRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-meetings'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-occurrences'] })
    },
  })
}

export function useUpdateRecurringMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringMeetingRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('meridian_recurring_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as RecurringMeetingRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-meetings'] })
      queryClient.invalidateQueries({ queryKey: ['recurring-meeting', data.id] })
      queryClient.invalidateQueries({ queryKey: ['schedule-occurrences'] })
    },
  })
}

export function useDeleteRecurringMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meridian_recurring_meetings')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-meetings'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-occurrences'] })
    },
  })
}

export function useScheduleOccurrences(rangeStart: string, rangeEnd: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['schedule-occurrences', rangeStart, rangeEnd],
    queryFn: async (): Promise<ScheduleOccurrence[]> => {
      // Fetch active meetings
      const { data: meetings, error: mErr } = await supabase
        .from('meridian_recurring_meetings')
        .select('*')
        .eq('is_active', true)
      if (mErr) throw mErr

      if (!meetings || meetings.length === 0) return []

      // Fetch logs for the range
      const meetingIds = meetings.map(m => m.id)
      const { data: logs, error: lErr } = await supabase
        .from('meridian_schedule_logs')
        .select('*')
        .in('recurring_meeting_id', meetingIds)
        .gte('occurrence_date', rangeStart)
        .lte('occurrence_date', rangeEnd)
      if (lErr) throw lErr

      // Index logs by meeting_id + date
      const logMap = new Map<string, ScheduleLogRow>()
      for (const log of (logs || [])) {
        logMap.set(`${log.recurring_meeting_id}:${log.occurrence_date}`, log as ScheduleLogRow)
      }

      const today = getTodayStr()
      const todayDate = parseDate(today)
      const occurrences: ScheduleOccurrence[] = []

      for (const meeting of meetings) {
        const dates = generateOccurrences(meeting as RecurringMeetingRow, rangeStart, rangeEnd)
        for (const date of dates) {
          const d = parseDate(date)
          occurrences.push({
            meeting: meeting as RecurringMeetingRow,
            date,
            log: logMap.get(`${meeting.id}:${date}`) || null,
            is_past: d < todayDate,
            is_today: date === today,
          })
        }
      }

      // Sort by date, then time
      occurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.meeting.time_of_day.localeCompare(b.meeting.time_of_day)
      })

      return occurrences
    },
    enabled: !!user,
  })
}

export function useUpsertScheduleLog() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (log: {
      recurring_meeting_id: string
      occurrence_date: string
      invite_sent?: boolean
      attended?: boolean
      notes?: string | null
    }) => {
      const { data, error } = await supabase
        .from('meridian_schedule_logs')
        .upsert(
          {
            user_id: user!.id,
            recurring_meeting_id: log.recurring_meeting_id,
            occurrence_date: log.occurrence_date,
            invite_sent: log.invite_sent ?? false,
            attended: log.attended ?? false,
            notes: log.notes ?? null,
          },
          { onConflict: 'recurring_meeting_id,occurrence_date' }
        )
        .select()
        .single()
      if (error) throw error
      return data as ScheduleLogRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-occurrences'] })
    },
  })
}
