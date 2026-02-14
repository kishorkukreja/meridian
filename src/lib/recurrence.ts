import type { RecurrencePattern } from '@/types/database'

type MeetingDef = {
  recurrence: RecurrencePattern
  start_date: string  // YYYY-MM-DD
  end_date: string | null
  day_of_week: number | null
  day_of_month: number | null
  custom_interval_days: number | null
}

export function generateOccurrences(
  meeting: MeetingDef,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const start = parseDate(meeting.start_date)
  const end = meeting.end_date ? parseDate(meeting.end_date) : null
  const rStart = parseDate(rangeStart)
  const rEnd = parseDate(rangeEnd)
  const dates: string[] = []

  switch (meeting.recurrence) {
    case 'daily': {
      const cursor = new Date(Math.max(start.getTime(), rStart.getTime()))
      while (cursor <= rEnd && (!end || cursor <= end)) {
        dates.push(formatDate(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      break
    }
    case 'weekly': {
      const dow = meeting.day_of_week ?? start.getDay()
      const cursor = new Date(Math.max(start.getTime(), rStart.getTime()))
      // Advance to the right day of week
      const diff = (dow - cursor.getDay() + 7) % 7
      cursor.setDate(cursor.getDate() + diff)
      if (cursor < start) cursor.setDate(cursor.getDate() + 7)
      while (cursor <= rEnd && (!end || cursor <= end)) {
        if (cursor >= rStart) dates.push(formatDate(cursor))
        cursor.setDate(cursor.getDate() + 7)
      }
      break
    }
    case 'biweekly': {
      const dow = meeting.day_of_week ?? start.getDay()
      // Start from meeting start_date, find first occurrence of dow
      const first = new Date(start)
      const diff = (dow - first.getDay() + 7) % 7
      first.setDate(first.getDate() + diff)
      const cursor = new Date(first)
      while (cursor <= rEnd && (!end || cursor <= end)) {
        if (cursor >= rStart && cursor >= start) {
          dates.push(formatDate(cursor))
        }
        cursor.setDate(cursor.getDate() + 14)
      }
      break
    }
    case 'monthly': {
      const dom = meeting.day_of_month ?? start.getDate()
      const cursorYear = Math.max(start.getFullYear(), rStart.getFullYear())
      const cursorMonth = cursorYear === start.getFullYear()
        ? Math.max(start.getMonth(), rStart.getMonth())
        : (cursorYear > start.getFullYear() ? rStart.getMonth() : start.getMonth())
      const cursor = new Date(cursorYear, cursorMonth, 1)
      for (let i = 0; i < 120; i++) { // safety cap
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        const actualDay = Math.min(dom, daysInMonth)
        const date = new Date(cursor.getFullYear(), cursor.getMonth(), actualDay)
        if (date > rEnd || (end && date > end)) break
        if (date >= rStart && date >= start) {
          dates.push(formatDate(date))
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
      break
    }
    case 'custom': {
      const interval = meeting.custom_interval_days ?? 1
      const cursor = new Date(start)
      while (cursor <= rEnd && (!end || cursor <= end)) {
        if (cursor >= rStart) dates.push(formatDate(cursor))
        cursor.setDate(cursor.getDate() + interval)
      }
      break
    }
  }

  return dates
}

export function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = parseDate(dateStr)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

export function getDayRange(dateStr: string): { start: string; end: string } {
  return { start: dateStr, end: dateStr }
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

export function getTodayStr(): string {
  return formatDate(new Date())
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dayOfWeekLabel(dow: number): string {
  return DAY_NAMES[dow] ?? ''
}

export function dayOfWeekLabelFull(dow: number): string {
  return DAY_NAMES_FULL[dow] ?? ''
}

export function formatTimeDisplay(time: string): string {
  // time is HH:MM or HH:MM:SS
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
