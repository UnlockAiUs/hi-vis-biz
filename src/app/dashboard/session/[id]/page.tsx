'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { agentMetadata, AgentCode } from '@/lib/ai/agents'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SessionData {
  id: string
  agent_code: string
  started_at: string | null
  completed_at: string | null
  agents: {
    name: string
    description: string
  }
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !isSending && !isComplete) {
      inputRef.current?.focus()
    }
  }, [isLoading, isSending, isComplete])
  
  // Load session data
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`)
        const data = await response.json()
        
        if (!response.ok) {
          setError(data.error || 'Failed to load session')
          return
        }
        
        setSession(data.session)
        setIsComplete(!!data.session.completed_at)
        
        // Load existing conversation from answers
        if (data.session.answers && data.session.answers.length > 0) {
          const existingMessages: Message[] = []
          for (const answer of data.session.answers) {
            if (answer.transcript_json && Array.isArray(answer.transcript_json)) {
              for (const msg of answer.transcript_json) {
                existingMessages.push({
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content
                })
              }
            }
          }
          setMessages(existingMessages)
        }
        
        // If no messages yet and session not complete, get opening message
        if ((!data.session.answers || data.session.answers.length === 0) && !data.session.completed_at) {
          await getOpeningMessage()
        }
      } catch (err) {
        setError('Failed to load session')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSession()
  }, [sessionId])
  
  async function getOpeningMessage() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpening: true })
      })
      
      const data = await response.json()
      
      if (response.ok && data.message) {
        setMessages([{ role: 'assistant', content: data.message }])
      }
    } catch (err) {
      console.error('Failed to get opening message:', err)
    }
  }
  
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    
    if (!inputValue.trim() || isSending || isComplete) return
    
    const userMessage = inputValue.trim()
    setInputValue('')
    setIsSending(true)
    
    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to send message')
        // Remove optimistic message
        setMessages(prev => prev.slice(0, -1))
        return
      }
      
      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      
      if (data.isComplete) {
        setIsComplete(true)
      }
    } catch (err) {
      setError('Failed to send message')
      setMessages(prev => prev.slice(0, -1))
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }
  
  const agentCode = session?.agent_code as AgentCode
  const metadata = agentCode ? agentMetadata[agentCode] : null
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }
  
  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {metadata && <span className="text-xl">{metadata.icon}</span>}
              <h1 className="font-semibold text-gray-900">{metadata?.name || session?.agents?.name || 'Check-in'}</h1>
            </div>
            <p className="text-sm text-gray-500">{metadata?.description || session?.agents?.description}</p>
          </div>
        </div>
        {isComplete && (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Complete
          </span>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="bg-white border-t p-4">
        {error && (
          <div className="mb-2 text-sm text-red-600 text-center">{error}</div>
        )}
        
        {isComplete ? (
          <div className="text-center">
            <p className="text-gray-600 mb-3">This check-in is complete. Thanks for sharing!</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your response..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
