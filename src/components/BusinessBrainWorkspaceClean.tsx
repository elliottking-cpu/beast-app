import React, { useState, useEffect, useRef } from 'react'
import { llmService } from '../services/LLMServiceNew'
import './BusinessBrainWorkspaceClean.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  confidence?: number
  attachments?: FileAttachment[]
}

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

interface AIDisplayContent {
  type: 'chart' | 'table' | 'form' | 'report' | 'visualization' | 'empty'
  title?: string
  data?: any
  component?: React.ReactNode
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BusinessBrainWorkspaceClean: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m NEXUS, your AI business partner. I have complete access to your business operations - from customer records to financial data, job scheduling to strategic planning. I can chat casually, analyze trends, create visualizations, generate reports, and even help you make strategic decisions. What would you like to explore today?',
      timestamp: new Date(),
      confidence: 0.98
    }
  ])
  const [currentQuery, setCurrentQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiDisplayContent, setAiDisplayContent] = useState<AIDisplayContent>({
    type: 'empty'
  })
  const [showSettings, setShowSettings] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    const files = Array.from(event.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ============================================================================
  // CHAT FUNCTIONALITY
  // ============================================================================

  const handleSendMessage = async () => {
    if (!currentQuery.trim() || isProcessing) return

    const attachments: FileAttachment[] = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type
    }))

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuery.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    }

    setChatMessages(prev => [...prev, userMessage])
    const query = currentQuery.trim()
    setCurrentQuery('')
    setSelectedFiles([])
    setIsProcessing(true)

    try {
      console.log('🤖 Sending query to Claude 4 Sonnet:', query)
      
      const result = await llmService.processRequest({
        query: query,
        context: { 
          aiDisplayContent,
          aiName: 'NEXUS',
          personality: 'conversational_business_partner',
          capabilities: 'full_business_control'
        },
        conversationHistory: chatMessages.slice(-10)
      })
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: result.explanation || 'I\'ve processed your request.',
        timestamp: new Date(),
        confidence: result.confidence
      }

      setChatMessages(prev => [...prev, aiMessage])
      
      // Check if Claude wants to display something in the AI panel
      if (result.explanation?.includes('DISPLAY:')) {
        // Parse display commands from Claude's response
        const displayMatch = result.explanation.match(/DISPLAY:\s*({.*?})/s)
        if (displayMatch) {
          try {
            const displayData = JSON.parse(displayMatch[1])
            setAiDisplayContent(displayData)
          } catch (e) {
            console.log('Could not parse display data:', e)
          }
        }
      }
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
      
    } catch (error) {
      console.error('AI processing failed:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '⚠️ I encountered an issue processing your request. Please try rephrasing or contact support if this continues.',
        timestamp: new Date(),
        confidence: 0.1
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
  // AI DISPLAY PANEL RENDERER
  // ============================================================================

  const renderAIDisplayContent = () => {
    switch (aiDisplayContent.type) {
      case 'empty':
        return (
          <div className="ai-display-empty">
            <div className="ai-display-placeholder">
              <div className="ai-display-header">
                <div className="display-title">
                  <div className="display-icon"></div>
                  <h3>NEXUS Display</h3>
                </div>
                <div className="display-status">
                  <span className="status-dot"></span>
                  Ready
                </div>
              </div>
              <p>This intelligent display adapts to show exactly what you need - charts, reports, data tables, forms, or strategic insights. Just ask NEXUS to visualize anything.</p>
              <div className="ai-display-examples">
                <div className="example-category">
                  <h4>Financial Analysis</h4>
                  <div className="example-item">Generate monthly revenue report</div>
                  <div className="example-item">Show cash flow analysis</div>
                </div>
                <div className="example-category">
                  <h4>Operational Insights</h4>
                  <div className="example-item">Display job completion metrics</div>
                  <div className="example-item">Analyze customer satisfaction trends</div>
                </div>
                <div className="example-category">
                  <h4>Strategic Planning</h4>
                  <div className="example-item">Create market expansion analysis</div>
                  <div className="example-item">Generate performance benchmarks</div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'chart':
        return (
          <div className="ai-display-content">
            <h3>{aiDisplayContent.title || 'AI Generated Chart'}</h3>
            <div className="chart-placeholder">
              📊 Chart will be rendered here
              <pre>{JSON.stringify(aiDisplayContent.data, null, 2)}</pre>
            </div>
          </div>
        )
      case 'table':
        return (
          <div className="ai-display-content">
            <h3>{aiDisplayContent.title || 'AI Generated Table'}</h3>
            <div className="table-placeholder">
              📋 Table will be rendered here
              <pre>{JSON.stringify(aiDisplayContent.data, null, 2)}</pre>
            </div>
          </div>
        )
      case 'report':
        return (
          <div className="ai-display-content">
            <h3>{aiDisplayContent.title || 'AI Generated Report'}</h3>
            <div className="report-placeholder">
              📄 Report will be rendered here
              <pre>{JSON.stringify(aiDisplayContent.data, null, 2)}</pre>
            </div>
          </div>
        )
      default:
        return (
          <div className="ai-display-content">
            <h3>{aiDisplayContent.title || 'AI Display'}</h3>
            {aiDisplayContent.component || <div>Content will appear here</div>}
          </div>
        )
    }
  }

  // ============================================================================
  // SETTINGS PANEL
  // ============================================================================

  const renderSettings = () => {
    if (!showSettings) return null

    return (
      <div className="settings-overlay">
        <div className="settings-panel">
          <div className="settings-header">
            <h3>AI Settings</h3>
            <button 
              className="close-button"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>
          </div>
          <div className="settings-content">
            <div className="setting-group">
              <label>AI Model</label>
              <div className="setting-value">Claude 4 Sonnet (claude-sonnet-4-20250514)</div>
            </div>
            <div className="setting-group">
              <label>Business Data Access</label>
              <div className="setting-value">✅ Full Access Enabled</div>
            </div>
            <div className="setting-group">
              <label>Response Confidence</label>
              <div className="setting-value">95% Average</div>
            </div>
            <div className="setting-group">
              <label>Dynamic Display</label>
              <div className="setting-value">✅ AI-Controlled Interface</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="business-brain-clean">
      {/* Header */}
      <div className="brain-header">
        <div className="header-left">
          <div className="brand-container">
            <div className="nexus-logo">
              <div className="logo-icon"></div>
              <div className="logo-text">
                <h1>NEXUS</h1>
                <span className="tagline">AI Business Partner</span>
              </div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            System Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="brain-content">
        {/* AI Display Panel */}
        <div className="ai-display-panel">
          {renderAIDisplayContent()}
        </div>

        {/* Chat Panel */}
        <div className="chat-panel">
          <div className="chat-header">
            <div className="ai-identity">
              <div className="ai-avatar"></div>
              <div className="ai-info">
                <h3>NEXUS</h3>
                <span className="ai-description">Your AI Business Partner</span>
              </div>
            </div>
            <div className="ai-status">
              <span className="status-indicator online"></span>
              <span className="status-text">Online & Ready</span>
            </div>
          </div>
          
          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-content">
                  {message.content}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-item">
                          <div className="attachment-icon">
                            <div className={`file-type-icon ${
                              attachment.type.startsWith('image/') ? 'image' : 
                              attachment.type.includes('pdf') ? 'pdf' :
                              attachment.type.includes('excel') || attachment.type.includes('spreadsheet') ? 'spreadsheet' :
                              attachment.type.includes('word') || attachment.type.includes('document') ? 'document' : 'file'
                            }`}></div>
                          </div>
                          <div className="attachment-info">
                            <div className="attachment-name">{attachment.name}</div>
                            <div className="attachment-size">{formatFileSize(attachment.size)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="message-meta">
                  <span className="timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.confidence && (
                    <span className="confidence">
                      {Math.round(message.confidence * 100)}% confidence
                    </span>
                  )}
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
                  Claude is thinking...
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-container">
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="selected-file">
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({formatFileSize(file.size)})</span>
                    </div>
                    <button 
                      onClick={() => removeFile(index)}
                      className="remove-file-btn"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div 
              className={`input-area ${isDragOver ? 'drag-over' : ''}`}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="input-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="attach-button"
                  type="button"
                  disabled={isProcessing}
                >
                  Attach Files
                </button>
              </div>
              
              <textarea
                ref={inputRef}
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Chat with NEXUS about anything - business insights, casual conversation, strategic planning, or data analysis. Attach files for deeper analysis."
                className="chat-input"
                rows={3}
                disabled={isProcessing}
              />
              
              <button 
                onClick={handleSendMessage}
                disabled={!currentQuery.trim() || isProcessing}
                className="send-button"
              >
                {isProcessing ? 'Processing...' : 'Send Query'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Overlay */}
      {renderSettings()}
    </div>
  )
}

export default BusinessBrainWorkspaceClean
