// AI Chat Interface - Conversational AI for Database Management
// This component provides a sophisticated chat interface for the AI agent

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AIAgent, AIMessage, AIConversation, createAIAgent } from '../services/AIAgent'
import './AIChatInterface.css'

interface AIChatInterfaceProps {
  businessUnitId: string
  userId?: string
  isOpen: boolean
  onClose: () => void
  onSchemaChange?: (change: any) => void
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  businessUnitId,
  userId,
  isOpen,
  onClose,
  onSchemaChange
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [aiAgent, setAiAgent] = useState<AIAgent | null>(null)
  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [conversationType, setConversationType] = useState<'general' | 'schema_modification' | 'query_generation' | 'analysis' | 'troubleshooting'>('general')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (isOpen && businessUnitId) {
      initializeAIAgent()
    }
  }, [isOpen, businessUnitId, userId])

  const initializeAIAgent = async () => {
    try {
      setIsLoading(true)
      const agent = createAIAgent(businessUnitId, userId)
      setAiAgent(agent)
      
      // Start a new conversation
      const newConversation = await agent.startConversation(conversationType, 'Database Management Session')
      setConversation(newConversation)
      
      // Add welcome message
      const welcomeMessage: AIMessage = {
        id: 'welcome',
        conversationId: newConversation.id,
        role: 'assistant',
        content: `👋 Hello! I'm your AI Database Assistant. I can help you with:\n\n🏗️ **Schema Management**: Create tables, add columns, modify relationships\n📊 **Data Analysis**: Query data, generate reports, find insights\n⚡ **Optimization**: Improve performance, suggest indexes, analyze bottlenecks\n🔒 **Security**: Review policies, check compliance, manage permissions\n🤖 **Automation**: Set up workflows, monitoring, and maintenance\n\nWhat would you like to work on today?`,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        metadata: {}
      }
      
      setMessages([welcomeMessage])
      
      // Load recent suggestions
      loadSuggestions()
      
    } catch (error) {
      console.error('❌ Error initializing AI agent:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuggestions = async () => {
    if (!aiAgent) return
    
    try {
      const recentSuggestions = await aiAgent.getSuggestions('pending')
      setSuggestions(recentSuggestions.slice(0, 3)) // Show top 3 suggestions
    } catch (error) {
      console.error('❌ Error loading suggestions:', error)
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const sendMessage = async () => {
    if (!inputMessage.trim() || !aiAgent || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsTyping(true)
    setIsLoading(true)

    try {
      // Add user message to UI immediately
      const userMessageObj: AIMessage = {
        id: `user-${Date.now()}`,
        conversationId: conversation?.id || '',
        role: 'user',
        content: userMessage,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        metadata: {}
      }
      
      setMessages(prev => [...prev, userMessageObj])
      
      // Send to AI agent and get response
      const aiResponse = await aiAgent.sendMessage(userMessage, 'text')
      
      // Add AI response to UI
      setMessages(prev => [...prev, aiResponse])
      
      // Handle any actions from the AI response
      if (aiResponse.metadata.actions) {
        handleAIActions(aiResponse.metadata.actions)
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error)
      
      // Add error message
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        conversationId: conversation?.id || '',
        role: 'assistant',
        content: `❌ I apologize, but I encountered an error: ${error.message}. Please try again.`,
        messageType: 'error',
        createdAt: new Date().toISOString(),
        metadata: {}
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleAIActions = (actions: any[]) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'create_table_suggestion':
          // Handle table creation suggestions
          if (onSchemaChange) {
            onSchemaChange({
              type: 'table_suggestion',
              data: action
            })
          }
          break
        case 'schema_analysis':
          // Handle schema analysis results
          console.log('📊 Schema analysis:', action)
          break
        case 'optimization_suggestion':
          // Handle optimization suggestions
          console.log('⚡ Optimization suggestion:', action)
          break
        default:
          console.log('🤖 AI Action:', action)
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
    inputRef.current?.focus()
  }

  // ============================================================================
  // AUTO-SCROLL
  // ============================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    
    return (
      <div
        key={message.id}
        className={`message ${message.role} ${message.messageType}`}
      >
        <div className="message-avatar">
          {isUser ? '👤' : isSystem ? '⚙️' : '🤖'}
        </div>
        
        <div className="message-content">
          <div className="message-header">
            <span className="message-role">
              {isUser ? 'You' : isSystem ? 'System' : 'AI Assistant'}
            </span>
            <span className="message-time">
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
            {message.confidenceScore && (
              <span className={`confidence-score ${message.confidenceScore > 0.8 ? 'high' : message.confidenceScore > 0.6 ? 'medium' : 'low'}`}>
                {Math.round(message.confidenceScore * 100)}%
              </span>
            )}
          </div>
          
          <div className="message-text">
            {renderMessageContent(message.content, message.messageType)}
          </div>
          
          {message.tokensUsed && message.tokensUsed > 0 && (
            <div className="message-metadata">
              <span className="tokens-used">🔤 {message.tokensUsed} tokens</span>
              {message.processingTimeMs && (
                <span className="processing-time">⏱️ {message.processingTimeMs}ms</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMessageContent = (content: string, messageType: string) => {
    // Format different message types
    switch (messageType) {
      case 'code':
      case 'query':
        return (
          <pre className="code-block">
            <code>{content}</code>
          </pre>
        )
      case 'schema':
        return (
          <div className="schema-content">
            {content.split('\n').map((line, index) => (
              <div key={index} className="schema-line">
                {line}
              </div>
            ))}
          </div>
        )
      default:
        return (
          <div className="text-content">
            {content.split('\n').map((line, index) => (
              <div key={index}>
                {line.includes('**') ? (
                  <span dangerouslySetInnerHTML={{
                    __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ) : (
                  line
                )}
              </div>
            ))}
          </div>
        )
    }
  }

  const renderQuickSuggestions = () => {
    const quickSuggestions = [
      "Show me all tables in my database",
      "Create a new table for customer orders",
      "Analyze my database performance",
      "Find missing relationships between tables",
      "Generate a report on data quality",
      "Optimize my slow queries",
      "Create an index for better performance",
      "Show me tables with no relationships"
    ]

    return (
      <div className="quick-suggestions">
        <div className="suggestions-header">
          <span>💡 Quick Actions</span>
          <button 
            className="toggle-suggestions"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            {showSuggestions ? '🔽' : '🔼'}
          </button>
        </div>
        
        {showSuggestions && (
          <div className="suggestions-grid">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) return null

  return (
    <div className="ai-chat-overlay">
      <div className="ai-chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <div className="ai-avatar">🤖</div>
            <div className="header-info">
              <h3>AI Database Assistant</h3>
              <span className="status">
                {isLoading ? '🔄 Processing...' : isTyping ? '⌨️ AI is typing...' : '✅ Ready'}
              </span>
            </div>
          </div>
          
          <div className="header-controls">
            <select
              value={conversationType}
              onChange={(e) => setConversationType(e.target.value as any)}
              className="conversation-type-select"
            >
              <option value="general">💬 General</option>
              <option value="schema_modification">🏗️ Schema</option>
              <option value="query_generation">📊 Queries</option>
              <option value="analysis">📈 Analysis</option>
              <option value="troubleshooting">🔧 Debug</option>
            </select>
            
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map(renderMessage)}
          
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>AI is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        {messages.length <= 1 && renderQuickSuggestions()}

        {/* Input */}
        <div className="chat-input">
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your database... (Press Enter to send, Shift+Enter for new line)"
              className="message-input"
              rows={1}
              disabled={isLoading}
            />
            
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
          
          <div className="input-footer">
            <span className="ai-powered">🤖 Powered by Advanced AI • Secure & Private</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChatInterface
