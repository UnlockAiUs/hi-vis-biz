/**
 * @file src/app/admin/ai-test-lab/page.tsx
 * @description AI Test Lab - Admin-only page to test AI agents with sample input
 * @see MASTER_PROJECT_CONTEXT.md for full documentation
 */
'use client'

import { useState } from 'react'

type AgentCode = 'pulse' | 'role_mapper' | 'workflow_mapper' | 'pain_scanner' | 'focus_tracker'

interface AgentInfo {
  code: AgentCode
  name: string
  description: string
  samplePrompt: string
}

const AGENTS: AgentInfo[] = [
  {
    code: 'pulse',
    name: 'Pulse',
    description: 'Measures morale, workload, and burnout risk',
    samplePrompt: "I've been feeling pretty overwhelmed lately. We had three major deadlines this week and I'm working late every night. The team is great but there's just too much to do."
  },
  {
    code: 'role_mapper',
    name: 'Role Mapper',
    description: 'Discovers job roles and responsibilities',
    samplePrompt: "I'm a field technician. I mostly handle HVAC repairs and installations. I work directly with customers, diagnosing issues and explaining what needs to be done. I also do some ordering of parts."
  },
  {
    code: 'workflow_mapper',
    name: 'Workflow Mapper',
    description: 'Maps out processes and workflows',
    samplePrompt: "When I get a new service call, I first check the schedule in ServiceTitan, then review the customer history. I drive to the site, diagnose the issue, and if I need parts I order through our supplier portal. After the job I fill out the work order in the app."
  },
  {
    code: 'pain_scanner',
    name: 'Pain Scanner',
    description: 'Identifies friction points and blockers',
    samplePrompt: "The biggest issue I have is waiting for parts. Sometimes I get to a job and realize I need something that's not on my truck, and then I have to wait 2-3 days for it to come in. The customer gets frustrated and I have to make a second trip."
  },
  {
    code: 'focus_tracker',
    name: 'Focus Tracker',
    description: 'Tracks current priorities and focus areas',
    samplePrompt: "Right now I'm mainly focused on finishing the Johnson project - it's a big commercial installation that's been going on for two weeks. After that I'll probably be back to regular service calls. My priorities haven't changed much from last week."
  }
]

export default function AITestLabPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentCode>('pulse')
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: unknown; error?: string } | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  const currentAgent = AGENTS.find(a => a.code === selectedAgent)!

  const loadSamplePrompt = () => {
    setInputText(currentAgent.samplePrompt)
  }

  const runTest = async () => {
    if (!inputText.trim()) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_code: selectedAgent,
          input_text: inputText
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult({ success: true, data })
      } else {
        setResult({ success: false, error: data.error || 'Unknown error occurred' })
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  const renderParsedResult = (data: unknown) => {
    if (!data || typeof data !== 'object') return null
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = (data as any).output
    if (!output) return <p className="text-gray-500">No structured output returned</p>
    
    return (
      <div className="space-y-3">
        {Object.entries(output).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 pb-2">
            <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="ml-2 text-gray-900">
              {Array.isArray(value) 
                ? value.join(', ') 
                : typeof value === 'object' 
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">AI Test Lab</h1>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
            Admin Only
          </span>
        </div>
        <p className="text-gray-600">
          Test AI agents with sample input to verify they&apos;re working correctly.
        </p>
      </div>

      {/* Agent Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Select Agent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map(agent => (
            <button
              key={agent.code}
              onClick={() => {
                setSelectedAgent(agent.code)
                setResult(null)
              }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedAgent === agent.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{agent.name}</div>
              <div className="text-xs text-gray-500 mt-1">{agent.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Test Input</h2>
          <button
            onClick={loadSamplePrompt}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Load sample prompt
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Enter sample input for ${currentAgent.name} agent...`}
          className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={runTest}
            disabled={loading || !inputText.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              loading || !inputText.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </span>
            ) : (
              `Run ${currentAgent.name} Agent`
            )}
          </button>
          <button
            onClick={() => {
              setInputText('')
              setResult(null)
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className={`bg-white rounded-lg border p-6 ${
          result.success ? 'border-green-200' : 'border-red-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              {result.success ? (
                <>
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Success
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Error
                </>
              )}
            </h2>
            {result.success && (
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showRaw ? 'Show Parsed' : 'Show Raw JSON'}
              </button>
            )}
          </div>
          
          {result.success ? (
            showRaw ? (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm text-gray-800 max-h-96">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              renderParsedResult(result.data)
            )
          ) : (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {result.error}
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-2">About AI Test Lab</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use this tool to verify AI agents are responding correctly</li>
          <li>• Each agent extracts different structured data from natural language</li>
          <li>• Click &quot;Load sample prompt&quot; to see an example input for each agent</li>
          <li>• Results show both parsed output and raw JSON response</li>
        </ul>
      </div>
    </div>
  )
}
