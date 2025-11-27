/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/settings/page.tsx
 * PURPOSE: Organization settings page - name, timezone, schedule config
 * EXPORTS: SettingsPage (default)
 * 
 * KEY FEATURES:
 * - Organization name/timezone editing (owner only)
 * - Weekly schedule configuration (per-day start/end times)
 * - Copy schedule to weekdays/all days
 * 
 * API DEPENDENCIES: /api/admin/settings (PATCH)
 * DB TABLES: organizations, organization_members
 */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type DaySchedule = {
  active: boolean
  start: string
  end: string
}

type ScheduleConfig = {
  mon: DaySchedule
  tue: DaySchedule
  wed: DaySchedule
  thu: DaySchedule
  fri: DaySchedule
  sat: DaySchedule
  sun: DaySchedule
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  mon: { active: true, start: '09:00', end: '17:00' },
  tue: { active: true, start: '09:00', end: '17:00' },
  wed: { active: true, start: '09:00', end: '17:00' },
  thu: { active: true, start: '09:00', end: '17:00' },
  fri: { active: true, start: '09:00', end: '17:00' },
  sat: { active: false, start: '09:00', end: '17:00' },
  sun: { active: false, start: '09:00', end: '17:00' },
}

const DAY_LABELS: { key: keyof ScheduleConfig; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
]

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  
  // Organization data
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [sizeBand, setSizeBand] = useState('')
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(DEFAULT_SCHEDULE)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadOrgData()
  }, [])

  const loadOrgData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user is owner or admin
      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

      if (!membership) throw new Error('Not an admin')
      
      setIsOwner(membership.role === 'owner')
      setOrgId(membership.org_id)

      // Get organization data
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', membership.org_id)
        .single()

      if (orgError) throw orgError
      
      setOrgName(org.name || '')
      setTimezone(org.timezone || 'America/New_York')
      setSizeBand(org.size_band || '')
      
      // Load schedule config if available
      if (org.schedule_config) {
        setScheduleConfig(org.schedule_config as ScheduleConfig)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !isOwner) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          timezone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const saveSchedule = async () => {
    if (!orgId || !isOwner) return

    setSavingSchedule(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_config: scheduleConfig,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save schedule')
      }

      setSuccess('Schedule saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const updateDaySchedule = (day: keyof ScheduleConfig, field: keyof DaySchedule, value: boolean | string) => {
    setScheduleConfig(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  const applyToAllDays = (copyFrom: keyof ScheduleConfig) => {
    const source = scheduleConfig[copyFrom]
    setScheduleConfig(prev => {
      const updated = { ...prev }
      for (const day of DAY_LABELS) {
        updated[day.key] = { ...source }
      }
      return updated
    })
  }

  const applyToWeekdays = () => {
    const source = scheduleConfig.mon
    setScheduleConfig(prev => ({
      ...prev,
      mon: { ...source },
      tue: { ...source },
      wed: { ...source },
      thu: { ...source },
      fri: { ...source },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-2 sm:px-0 max-w-2xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization&apos;s settings and preferences
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {/* Organization Info Card */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h2>
        
        <form onSubmit={saveSettings} className="space-y-4">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter organization name"
              required
            />
            {!isOwner && (
              <p className="mt-1 text-xs text-gray-500">Only owners can change the organization name</p>
            )}
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Used for scheduling check-ins and displaying times
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Size
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
              {sizeBand === '1-10' && '1-10 employees'}
              {sizeBand === '11-50' && '11-50 employees'}
              {sizeBand === '51-200' && '51-200 employees'}
              {sizeBand === '201-500' && '201-500 employees'}
              {sizeBand === '500+' && '500+ employees'}
              {!sizeBand && 'Not specified'}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Set during organization setup and cannot be changed
            </p>
          </div>

          {isOwner && (
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving || !orgName.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Schedule Settings Card */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Check-in Schedule</h2>
            <p className="text-sm text-gray-500">Set when check-ins are active for your organization</p>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyToWeekdays}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              >
                Copy to Weekdays
              </button>
              <button
                type="button"
                onClick={() => applyToAllDays('mon')}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              >
                Copy to All
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {DAY_LABELS.map(({ key, label, short }) => (
            <div
              key={key}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                scheduleConfig[key].active 
                  ? 'bg-white border-gray-200' 
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              {/* Day toggle */}
              <label className="flex items-center gap-2 min-w-[120px]">
                <input
                  type="checkbox"
                  checked={scheduleConfig[key].active}
                  onChange={(e) => updateDaySchedule(key, 'active', e.target.checked)}
                  disabled={!isOwner}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className={`text-sm font-medium ${
                  scheduleConfig[key].active ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </span>
              </label>

              {/* Time range */}
              <div className={`flex items-center gap-2 flex-1 ${
                !scheduleConfig[key].active ? 'opacity-50' : ''
              }`}>
                <select
                  value={scheduleConfig[key].start}
                  onChange={(e) => updateDaySchedule(key, 'start', e.target.value)}
                  disabled={!isOwner || !scheduleConfig[key].active}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <span className="text-gray-400">to</span>
                <select
                  value={scheduleConfig[key].end}
                  onChange={(e) => updateDaySchedule(key, 'end', e.target.value)}
                  disabled={!isOwner || !scheduleConfig[key].active}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {!isOwner && (
          <p className="mt-4 text-xs text-gray-500">Only owners can modify the check-in schedule</p>
        )}

        {isOwner && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSchedule ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
