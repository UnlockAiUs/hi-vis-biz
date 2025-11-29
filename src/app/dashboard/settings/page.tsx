/**
 * Employee Settings Page - Language Preferences
 * 
 * AI AGENT INSTRUCTIONS:
 * - This page allows employees to set their preferred language for check-ins
 * - Language changes affect AI agent conversation language
 * - Changes are persisted to organization_members.preferred_language_code
 * 
 * @see MASTER_PROJECT_CONTEXT.md for architecture
 * @see FEATURE_UPDATE_EXECUTION_PLAN.md Phase 4 for requirements
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LanguageOption {
  code: string
  name: string
  nativeName: string
}

interface LanguageSettings {
  currentLanguage: string
  allowTranslation: boolean
  supportedLanguages: LanguageOption[]
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LanguageSettings | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchLanguageSettings()
  }, [])

  const fetchLanguageSettings = async () => {
    try {
      const res = await fetch('/api/user/language')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      setSettings(data)
      setSelectedLanguage(data.currentLanguage)
    } catch (error) {
      console.error('Error fetching language settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageCode: selectedLanguage })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update language')
      }

      setMessage({ type: 'success', text: 'Language preference saved!' })
      
      // Update local state
      if (settings) {
        setSettings({ ...settings, currentLanguage: selectedLanguage })
      }
    } catch (error) {
      console.error('Error saving language:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your check-in preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Language Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🌐 Language Preferences
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose your preferred language for check-in conversations
            </p>
          </div>

          <div className="p-6">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Language
            </label>
            <select
              id="language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="input-field w-full max-w-md"
              aria-describedby="language-help"
            >
              {settings?.supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            <p id="language-help" className="mt-2 text-sm text-gray-500">
              The AI will ask questions and respond in your preferred language.
              {settings?.allowTranslation && (
                <span className="block mt-1">
                  Your responses will be automatically translated for team analytics.
                </span>
              )}
            </p>

            {/* Save button */}
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving || selectedLanguage === settings?.currentLanguage}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Language Preference'}
              </button>
            </div>

            {/* Current language indicator */}
            {selectedLanguage !== settings?.currentLanguage && (
              <p className="mt-3 text-sm text-amber-600">
                ⚠️ You have unsaved changes
              </p>
            )}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-1">🔒 Privacy Note</h3>
          <p className="text-sm text-gray-600">
            Your check-in responses are stored in their original language. 
            {settings?.allowTranslation 
              ? ' Translations are only used for aggregated team analytics.'
              : ' Translation is disabled for your organization.'}
          </p>
        </div>
      </div>
    </div>
  )
}
