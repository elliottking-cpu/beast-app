/**
 * Business Brain Interface - The main AI-powered business management interface
 * 
 * This component provides the comprehensive AI-powered business management
 * interface that combines schema visualization with intelligent business automation.
 */

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { naturalLanguageProcessor, NLQuery } from '../services/NaturalLanguageProcessor'
import './BusinessBrainInterface.css'

interface BusinessMetric {
  metric_name: string
  metric_value: number
  metric_unit: string
  metric_category: string
  last_updated: string
}

interface BusinessInsight {
  insight_id: string
  insight_type: string
  title: string
  description: string
  impact_level: string
  confidence_score: number
  actionable: boolean
  created_at: string
  metadata: any
}

interface ActivityItem {
  activity_id: string
  activity_type: string
  description: string
  severity: string
  activity_timestamp: string
  user_name: string
  table_affected: string
  metadata: any
}

interface LearningProgress {
  learning_area: string
  progress_percentage: number
  interactions_count: number
  accuracy_score: number
  last_learning_session: string
  next_milestone: string
}

interface BusinessBrainInterfaceProps {
  isVisible: boolean
  onClose: () => void
  businessUnitId?: string
}

const BusinessBrainInterface: React.FC<BusinessBrainInterfaceProps> = ({
  isVisible,
  onClose,
  businessUnitId = 'mock-business-unit-id'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'automation' | 'learning' | 'chat'>('overview')
  const [metrics, setMetrics] = useState<BusinessMetric[]>([])
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date, query?: NLQuery, results?: any[]}>>([])
  const [chatInput, setChatInput] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [currentQuery, setCurrentQuery] = useState<NLQuery | null>(null)
  const [showQueryPreview, setShowQueryPreview] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible) {
      loadAllData()
      // Add welcome message
      setChatMessages([{
        id: '1',
        type: 'ai',
        content: 'Welcome to the Business Brain! I\'m your AI assistant ready to help you manage every aspect of your business. I can analyze data, automate processes, provide insights, and execute complex business operations. How can I help you today?',
        timestamp: new Date()
      }])
    }
  }, [isVisible, businessUnitId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadMetrics(),
        loadInsights(),
        loadActivityFeed(),
        loadLearningProgress()
      ])
    } catch (error) {
      console.error('Failed to load Business Brain data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_ai_brain_metrics', {
        business_unit_id_param: businessUnitId
      })
      if (error) throw error
      setMetrics(data || [])
    } catch (error) {
      console.error('Failed to load metrics:', error)
    }
  }

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase.rpc('get_business_insights', {
        business_unit_id_param: businessUnitId,
        limit_param: 10
      })
      if (error) throw error
      setInsights(data || [])
    } catch (error) {
      console.error('Failed to load insights:', error)
    }
  }

  const loadActivityFeed = async () => {
    try {
      const { data, error } = await supabase.rpc('get_business_activity_feed', {
        business_unit_id_param: businessUnitId,
        limit_param: 20
      })
      if (error) throw error
      setActivityFeed(data || [])
    } catch (error) {
      console.error('Failed to load activity feed:', error)
    }
  }

  const loadLearningProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('get_ai_learning_progress', {
        business_unit_id_param: businessUnitId
      })
      if (error) throw error
      setLearningProgress(data || [])
    } catch (error) {
      console.error('Failed to load learning progress:', error)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isAIThinking) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: chatInput.trim(),
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    const userInput = chatInput.trim()
    setChatInput('')
    setIsAIThinking(true)

    try {
      // Process natural language query
      console.log('🗣️ Processing natural language:', userInput)
      const nlQuery = await naturalLanguageProcessor.processQuery(userInput, 'mock-user-id')
      setCurrentQuery(nlQuery)

      let aiResponse: any = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: nlQuery.explanation,
        timestamp: new Date(),
        query: nlQuery
      }

      // If it's a safe SQL query, show it for review
      if (nlQuery.generatedSQL) {
        aiResponse.content += `\n\n📝 Generated SQL:\n\`\`\`sql\n${nlQuery.generatedSQL}\n\`\`\``
        
        if (nlQuery.safetyCheck) {
          aiResponse.content += '\n\n✅ This query passed safety validation.'
        } else {
          aiResponse.content += '\n\n⚠️ This query requires manual review for safety.'
        }
      }

      // Add confidence indicator
      if (nlQuery.confidence < 0.7) {
        aiResponse.content += `\n\n🤔 I'm ${Math.round(nlQuery.confidence * 100)}% confident about this interpretation. Could you provide more details if this isn't what you meant?`
      }

      // Add suggestions for improvement
      if (nlQuery.intent.entities.length === 0) {
        aiResponse.content += '\n\n💡 Try being more specific about which tables or data you want to work with.'
      }

      setChatMessages(prev => [...prev, aiResponse])
      
    } catch (error) {
      console.error('Natural language processing failed:', error)
      
      // Fallback to simple response
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: generateAIResponse(userInput),
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiResponse])
    } finally {
      setIsAIThinking(false)
    }
  }

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    
    if (input.includes('customer') || input.includes('client')) {
      return 'I can help you analyze customer data, predict churn, optimize retention strategies, and automate customer communications. Would you like me to run a customer analysis or help with a specific customer management task?'
    }
    
    if (input.includes('schedule') || input.includes('booking')) {
      return 'I can optimize schedules, predict demand, automate booking confirmations, and balance workloads across your team. I can also integrate weather data and traffic conditions for route optimization. What scheduling challenge can I help you solve?'
    }
    
    if (input.includes('financial') || input.includes('money') || input.includes('profit')) {
      return 'I can analyze financial trends, predict cash flow, optimize pricing strategies, and identify cost-saving opportunities. I\'ve detected several financial optimization opportunities in your current data. Would you like me to present them?'
    }
    
    if (input.includes('equipment') || input.includes('maintenance')) {
      return 'I can predict equipment failures, optimize maintenance schedules, track utilization rates, and recommend replacements. My predictive maintenance model is currently 89.7% accurate. What equipment would you like me to analyze?'
    }
    
    if (input.includes('employee') || input.includes('staff') || input.includes('team')) {
      return 'I can help with staff scheduling, performance analysis, training recommendations, and workload balancing. I can also predict staffing needs based on demand forecasts. What HR challenge can I assist with?'
    }
    
    return 'I understand you\'re looking for business insights and automation. I can help with customer management, financial optimization, equipment maintenance, staff scheduling, route planning, and much more. Could you be more specific about what you\'d like me to analyze or automate?'
  }

  const getMetricColor = (category: string): string => {
    switch (category) {
      case 'system': return '#10b981'
      case 'ai': return '#8b5cf6'
      case 'automation': return '#f59e0b'
      case 'quality': return '#06b6d4'
      case 'compliance': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getInsightIcon = (type: string): string => {
    switch (type) {
      case 'optimization': return '⚡'
      case 'business_opportunity': return '💡'
      case 'cost_optimization': return '💰'
      case 'risk_alert': return '⚠️'
      case 'growth_opportunity': return '📈'
      default: return '💡'
    }
  }

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'data_change': return '📊'
      case 'ai_action': return '🤖'
      case 'alert': return '🚨'
      case 'optimization': return '⚡'
      case 'compliance': return '✅'
      default: return '📋'
    }
  }

  if (!isVisible) return null

  return (
    <div className="business-brain-interface">
      <div className="brain-header">
        <div className="brain-title">
          <h2>🧠 Business Brain</h2>
          <p>AI-Powered Business Management & Automation</p>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="brain-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          💡 Insights
        </button>
        <button 
          className={`tab-btn ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          🤖 Automation
        </button>
        <button 
          className={`tab-btn ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          🧠 Learning
        </button>
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 AI Chat
        </button>
      </div>

      <div className="brain-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading Business Brain data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="metrics-grid">
                  {metrics.map((metric, index) => (
                    <div key={index} className="metric-card">
                      <div className="metric-header">
                        <h4>{metric.metric_name}</h4>
                        <div 
                          className="metric-indicator"
                          style={{ backgroundColor: getMetricColor(metric.metric_category) }}
                        ></div>
                      </div>
                      <div className="metric-value">
                        {metric.metric_value.toFixed(1)}{metric.metric_unit === 'percentage' ? '%' : ''}
                      </div>
                      <div className="metric-category">{metric.metric_category}</div>
                    </div>
                  ))}
                </div>

                <div className="activity-section">
                  <h3>🔄 Recent Activity</h3>
                  <div className="activity-feed">
                    {activityFeed.slice(0, 5).map((activity) => (
                      <div key={activity.activity_id} className={`activity-item ${activity.severity}`}>
                        <div className="activity-icon">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="activity-content">
                          <div className="activity-description">{activity.description}</div>
                          <div className="activity-meta">
                            {activity.user_name} • {new Date(activity.activity_timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="insights-tab">
                <h3>💡 Business Intelligence Insights</h3>
                <div className="insights-list">
                  {insights.map((insight) => (
                    <div key={insight.insight_id} className={`insight-card ${insight.impact_level}`}>
                      <div className="insight-header">
                        <div className="insight-icon">
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <div className="insight-title-section">
                          <h4>{insight.title}</h4>
                          <div className="insight-meta">
                            <span className={`impact-badge ${insight.impact_level}`}>
                              {insight.impact_level.toUpperCase()}
                            </span>
                            <span className="confidence-score">
                              {insight.confidence_score.toFixed(1)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="insight-description">{insight.description}</p>
                      {insight.actionable && (
                        <button className="action-btn">Take Action</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="automation-tab">
                <h3>🤖 Business Process Automation</h3>
                <div className="automation-grid">
                  <div className="automation-card">
                    <h4>📅 Smart Scheduling</h4>
                    <p>AI optimizes job schedules, routes, and resource allocation in real-time.</p>
                    <div className="automation-status active">Active</div>
                  </div>
                  <div className="automation-card">
                    <h4>📧 Email Processing</h4>
                    <p>Automatically processes customer emails and creates bookings or support tickets.</p>
                    <div className="automation-status active">Active</div>
                  </div>
                  <div className="automation-card">
                    <h4>🔧 Predictive Maintenance</h4>
                    <p>Predicts equipment failures and schedules preventive maintenance automatically.</p>
                    <div className="automation-status active">Active</div>
                  </div>
                  <div className="automation-card">
                    <h4>💰 Dynamic Pricing</h4>
                    <p>Adjusts pricing based on demand, competition, and customer history.</p>
                    <div className="automation-status pending">Setup Required</div>
                  </div>
                  <div className="automation-card">
                    <h4>📊 Financial Forecasting</h4>
                    <p>Generates cash flow predictions and identifies financial opportunities.</p>
                    <div className="automation-status active">Active</div>
                  </div>
                  <div className="automation-card">
                    <h4>🎯 Customer Retention</h4>
                    <p>Identifies at-risk customers and triggers retention campaigns automatically.</p>
                    <div className="automation-status pending">Setup Required</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'learning' && (
              <div className="learning-tab">
                <h3>🧠 AI Learning Progress</h3>
                <div className="learning-areas">
                  {learningProgress.map((area, index) => (
                    <div key={index} className="learning-card">
                      <div className="learning-header">
                        <h4>{area.learning_area}</h4>
                        <div className="accuracy-score">
                          {area.accuracy_score.toFixed(1)}% accuracy
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${area.progress_percentage}%` }}
                        ></div>
                      </div>
                      <div className="learning-stats">
                        <span>{area.interactions_count.toLocaleString()} interactions</span>
                        <span>Next: {area.next_milestone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="chat-tab">
                <div className="chat-container">
                  <div className="chat-messages">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`message ${message.type}`}>
                        <div className="message-content">
                          {message.content}
                        </div>
                        <div className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    {isAIThinking && (
                      <div className="message ai thinking">
                        <div className="message-content">
                          <div className="thinking-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          AI is thinking...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form className="chat-input-form" onSubmit={handleChatSubmit}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything about your business..."
                      className="chat-input"
                      disabled={isAIThinking}
                    />
                    <button 
                      type="submit" 
                      className="send-btn"
                      disabled={!chatInput.trim() || isAIThinking}
                    >
                      🚀
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BusinessBrainInterface
