import React, { useState } from 'react'
import { DataWindow } from '../services/AISchemaController'
import './AIDataWindow.css'

interface AIDataWindowProps {
  window: DataWindow
  onClose: (windowId: string) => void
  onMinimize: (windowId: string) => void
}

const AIDataWindow: React.FC<AIDataWindowProps> = ({ window, onClose, onMinimize }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState(window.position)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  if (!window.isVisible) return null

  const renderContent = () => {
    switch (window.type) {
      case 'form':
        return renderForm()
      case 'chart':
        return renderChart()
      case 'map':
        return renderMap()
      case 'query_results':
        return renderQueryResults()
      case 'workflow':
        return renderWorkflow()
      default:
        return <div className="window-content-default">Content type: {window.type}</div>
    }
  }

  const renderForm = () => {
    const { fields = [] } = window.content || {}
    return (
      <div className="form-content">
        <form className="ai-form">
          {fields.map((field: any, index: number) => (
            <div key={index} className="form-field">
              <label className="field-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  className="field-input"
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : field.type === 'select' ? (
                <select className="field-input" required={field.required}>
                  <option value="">Select {field.label}</option>
                  {field.options?.map((option: string, optIndex: number) => (
                    <option key={optIndex} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  className="field-input"
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="form-actions">
            <button type="submit" className="btn-primary">Create Customer</button>
            <button type="button" className="btn-secondary">Save Draft</button>
          </div>
        </form>
      </div>
    )
  }

  const renderChart = () => {
    const { charts = [], type } = window.content || {}
    return (
      <div className="chart-content">
        {type === 'performance_metrics' && (
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Query Performance</h4>
              <div className="metric-value">234ms</div>
              <div className="metric-change positive">-15%</div>
            </div>
            <div className="metric-card">
              <h4>Index Usage</h4>
              <div className="metric-value">87%</div>
              <div className="metric-change negative">-3%</div>
            </div>
            <div className="metric-card">
              <h4>Cache Hit Rate</h4>
              <div className="metric-value">94%</div>
              <div className="metric-change positive">+2%</div>
            </div>
          </div>
        )}
        {type === 'efficiency_metrics' && (
          <div className="efficiency-overview">
            <div className="efficiency-item">
              <span className="label">Route Efficiency</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '87%' }}></div>
              </div>
              <span className="value">87%</span>
            </div>
            <div className="efficiency-item">
              <span className="label">Staff Utilization</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '92%' }}></div>
              </div>
              <span className="value">92%</span>
            </div>
            <div className="efficiency-item">
              <span className="label">Customer Satisfaction</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '94%' }}></div>
              </div>
              <span className="value">94%</span>
            </div>
          </div>
        )}
        {charts.length > 0 && (
          <div className="charts-grid">
            {charts.map((chart: any, index: number) => (
              <div key={index} className="chart-placeholder">
                <h4>{chart.title}</h4>
                <div className="chart-mock">[{chart.type.toUpperCase()} CHART]</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderMap = () => {
    const { jobs = [], region, travelTimes } = window.content || {}
    return (
      <div className="map-content">
        <div className="map-header">
          <h4>Jobs in {region} Postcode Area</h4>
          {travelTimes && (
            <div className="travel-optimization">
              <span className="current">Current: {travelTimes.estimated}</span>
              <span className="optimized">Optimized: {travelTimes.optimized}</span>
            </div>
          )}
        </div>
        <div className="map-placeholder">
          <div className="map-mock">[INTERACTIVE MAP]</div>
          <div className="job-markers">
            {jobs.map((job: any, index: number) => (
              <div key={index} className={`job-marker ${job.status.toLowerCase().replace(' ', '-')}`}>
                <div className="marker-info">
                  <strong>{job.postcode}</strong>
                  <div>{job.customer}</div>
                  <div>{job.type} - {job.status}</div>
                  {job.engineer && <div>Engineer: {job.engineer}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="job-list">
          {jobs.map((job: any, index: number) => (
            <div key={index} className={`job-item ${job.status.toLowerCase().replace(' ', '-')}`}>
              <div className="job-header">
                <span className="job-id">{job.id}</span>
                <span className={`job-status ${job.status.toLowerCase().replace(' ', '-')}`}>
                  {job.status}
                </span>
              </div>
              <div className="job-details">
                <div><strong>{job.customer}</strong></div>
                <div>{job.postcode} • {job.type}</div>
                <div>{job.date} {job.time}</div>
                {job.engineer && <div>👤 {job.engineer}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderQueryResults = () => {
    return (
      <div className="query-results-content">
        <div className="results-header">
          <h4>Query Results</h4>
          <span className="result-count">42 records found</span>
        </div>
        <div className="results-table">
          <div className="table-placeholder">[QUERY RESULTS TABLE]</div>
        </div>
      </div>
    )
  }

  const renderWorkflow = () => {
    const { categories, todayJobs, weekJobs, efficiency, optimizations } = window.content || {}
    
    if (categories) {
      return (
        <div className="workflow-content">
          <h4>AI Capabilities</h4>
          <div className="capabilities-grid">
            {categories.map((category: string, index: number) => (
              <div key={index} className="capability-card">
                <div className="capability-icon">AI</div>
                <div className="capability-name">{category}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="workflow-content">
        <div className="workflow-stats">
          {todayJobs && <div className="stat-item">
            <span className="stat-label">Today's Jobs</span>
            <span className="stat-value">{todayJobs}</span>
          </div>}
          {weekJobs && <div className="stat-item">
            <span className="stat-label">This Week</span>
            <span className="stat-value">{weekJobs}</span>
          </div>}
          {efficiency && <div className="stat-item">
            <span className="stat-label">Efficiency</span>
            <span className="stat-value">{efficiency}%</span>
          </div>}
        </div>
        {optimizations && (
          <div className="optimizations">
            <h5>Optimization Opportunities</h5>
            {optimizations.map((opt: string, index: number) => (
              <div key={index} className="optimization-item">
                <span className="opt-icon">⚡</span>
                <span className="opt-text">{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`ai-data-window ${window.type} ${window.isMinimized ? 'minimized' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: window.isMinimized ? 200 : window.size.width,
        height: window.isMinimized ? 40 : window.size.height,
        zIndex: 1000
      }}
    >
      <div 
        className="window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">{window.title}</div>
        <div className="window-controls">
          <button 
            className="window-btn minimize"
            onClick={() => onMinimize(window.id)}
            title={window.isMinimized ? 'Restore' : 'Minimize'}
          >
            {window.isMinimized ? '□' : '_'}
          </button>
          <button 
            className="window-btn close"
            onClick={() => onClose(window.id)}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      {!window.isMinimized && (
        <div className="window-body">
          {renderContent()}
        </div>
      )}
    </div>
  )
}

export default AIDataWindow
