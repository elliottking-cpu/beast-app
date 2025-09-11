import React, { useState, useRef } from 'react'
import { llmService } from '../services/LLMServiceNew'
import './BusinessBrainWorkspace.css'

// ============================================================================
// MINIMAL AI CHAT COMPONENT - NO OTHER FEATURES
// ============================================================================

const BusinessBrainWorkspaceMinimal: React.FC = () => {
  // ============================================================================
  // MINIMAL STATE - ONLY CHAT
  // ============================================================================
  
  const [currentQuery, setCurrentQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. This is a minimal test mode - just basic chat functionality. Type "hi" to test the connection.',
      timestamp: new Date(),
      confidence: 1.0
    }
  ])

  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // MINIMAL AI PROCESSING - NO DATABASE, NO CONTEXT
  // ============================================================================
  
  const handleSendMessage = async () => {
    if (!currentQuery.trim() || isProcessing) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuery.trim(),
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setCurrentQuery('')

    try {
      console.log('🚀 Sending minimal AI request:', currentQuery.trim())
      
      // DIRECT EDGE FUNCTION CALL - HARDCODED FOR TESTING
      const supabaseUrl = 'https://wvsmmwnfqqgtzlvzbaht.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2c21td25mcXFndHpsdnpiYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjEyNDQsImV4cCI6MjA3MTg5NzI0NH0.nWCT-4bgxpt5a-bK_YUvPmIW_rOEZ1pFVD2ruh2M4MU'
      
      console.log('🔗 Direct Edge Function URL:', `${supabaseUrl}/functions/v1/ai-chat-v28`)
      
      const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/ai-chat-v28`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          query: currentQuery.trim(),
          businessUnitId: 'fcb2dc0c-d521-4b63-bfdb-bb5680474807', // The Septics Group
          userId: 'test-user'
        })
      })

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`)
      }

      const response = await fetchResponse.json()

      console.log('✅ AI response received:', response)

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.explanation || 'No response received',
        timestamp: new Date(),
        confidence: response.confidence || 0,
        data: response.data
      }

      setChatMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('❌ AI request failed:', error)
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Error: ${error.message || 'Failed to process request'}. This is expected in minimal test mode.`,
        timestamp: new Date(),
        confidence: 0,
        isError: true
      }

      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ============================================================================
  // MINIMAL RENDER - ONLY CHAT INTERFACE
  // ============================================================================

  return (
    <div className="business-brain-workspace">
      <div className="workspace-header">
        <div className="header-content">
          <div className="workspace-title">
            <h1>Business Brain - Minimal Test Mode</h1>
            <p>AI Chat Only - No Database, No Context, Just Basic Connectivity Test</p>
          </div>
        </div>
      </div>

      <div className="workspace-content">
        {/* MINIMAL CHAT INTERFACE */}
        <div className="ai-chat-panel">
          <div className="chat-header">
            <h3>AI Assistant (Minimal Mode)</h3>
            <div className="chat-status">
              <span className="status-indicator online"></span>
              <span>Testing Basic Connectivity</span>
            </div>
          </div>

          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-meta">
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.confidence !== undefined && (
                      <span className="message-confidence">
                        {Math.round(message.confidence * 100)}% confident
                      </span>
                    )}
                    {message.data && (
                      <span className="message-version">
                        {message.data.version || 'v9'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="message ai processing">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={chatInputRef}
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type 'hi' to test basic AI connectivity..."
                className="chat-input"
                rows={1}
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentQuery.trim() || isProcessing}
                className="send-button"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessBrainWorkspaceMinimal
