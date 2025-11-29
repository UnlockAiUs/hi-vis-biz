/**
 * @file src/app/admin/privacy/page.tsx
 * @description Admin page for managing organization privacy settings
 * @ai-instruction This page allows admins to configure privacy controls
 */

'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface PrivacySettings {
  id: string
  name: string
  allow_free_text_sentiment: boolean
  allow_translation: boolean
  data_retention_days: number | null
  employee_can_mark_private: boolean
  privacy_policy_url: string | null
  data_processing_consent_required: boolean
}

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/privacy')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      setSettings(data)
    } catch (err) {
      setError('Failed to load privacy settings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return
    
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/admin/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!res.ok) throw new Error('Failed to save settings')
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to save privacy settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function updateSetting<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Failed to load privacy settings'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privacy & Trust Controls</h1>
        <p className="text-gray-600 mt-1">
          Configure how employee data is collected, processed, and stored
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          Settings saved successfully
        </div>
      )}

      <div className="space-y-6">
        {/* Data Processing Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Data Processing
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_free_text_sentiment}
                onChange={(e) => updateSetting('allow_free_text_sentiment', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Allow free-text sentiment analysis</span>
                <p className="text-sm text-gray-500">
                  When enabled, AI analyzes the full text of employee responses for sentiment. 
                  When disabled, only structured ratings are used.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_translation}
                onChange={(e) => updateSetting('allow_translation', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Enable automatic translation</span>
                <p className="text-sm text-gray-500">
                  When enabled, non-English responses are translated for analytics purposes.
                  Original text is always preserved.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.data_processing_consent_required}
                onChange={(e) => updateSetting('data_processing_consent_required', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Require explicit consent before first check-in</span>
                <p className="text-sm text-gray-500">
                  When enabled, employees must acknowledge data processing terms before their first session.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Employee Privacy Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Employee Privacy
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.employee_can_mark_private}
                onChange={(e) => updateSetting('employee_can_mark_private', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Allow employees to mark responses as private</span>
                <p className="text-sm text-gray-500">
                  When enabled, employees can flag individual answers to exclude them from 
                  analytics and manager reports while still being visible to admins.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Data Retention Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Data Retention
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Retention period for raw check-in data
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={settings.data_retention_days ?? 'indefinite'}
                  onChange={(e) => {
                    const val = e.target.value
                    updateSetting('data_retention_days', val === 'indefinite' ? null : parseInt(val))
                  }}
                  className="block w-48 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="indefinite">Indefinite</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                  <option value="730">2 years</option>
                  <option value="1095">3 years</option>
                </select>
                <span className="text-sm text-gray-500">
                  {settings.data_retention_days 
                    ? `Raw data older than ${settings.data_retention_days} days will be archived`
                    : 'Data is retained indefinitely'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Note: Archived data is hidden from analytics but not deleted, supporting data recovery if needed.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Privacy Policy
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Custom privacy policy URL (optional)
              </label>
              <input
                type="url"
                value={settings.privacy_policy_url || ''}
                onChange={(e) => updateSetting('privacy_policy_url', e.target.value || null)}
                placeholder="https://yourcompany.com/privacy"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                If provided, this link will be shown to employees in the privacy information modal.
              </p>
            </div>
          </div>
        </section>

        {/* Data Classification Info */}
        <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Data Classification
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-red-700 mb-2">🔴 PII Data</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• User emails</li>
                <li>• Display names</li>
                <li>• Job titles</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-amber-700 mb-2">🟡 Sensitive Data</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Raw check-in responses</li>
                <li>• Session transcripts</li>
                <li>• Free-text answers</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-green-700 mb-2">🟢 Derived Data</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Aggregated metrics</li>
                <li>• Team health scores</li>
                <li>• Workflow patterns</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-2 flex items-center gap-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Privacy Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
