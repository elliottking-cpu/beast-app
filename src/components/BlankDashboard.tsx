import React from 'react'
import { useParams } from 'react-router-dom'
import './BlankDashboard.css'

const BlankDashboard: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  
  // Get department name from URL path
  const getDepartmentName = () => {
    const path = window.location.pathname
    const pathParts = path.split('/').filter(part => part)
    
    if (pathParts.length >= 2) {
      const departmentName = pathParts[pathParts.length - 2]
      return departmentName.charAt(0).toUpperCase() + departmentName.slice(1)
    }
    
    return 'Department'
  }

  const departmentName = getDepartmentName()

  return (
    <div className="blank-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1>{departmentName} Dashboard</h1>
          <p>Welcome to the {departmentName} dashboard for {companyName}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="placeholder-card">
          <div className="placeholder-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <h2>Dashboard Under Development</h2>
          <p>This dashboard is currently being developed. Check back soon for updates and new features.</p>
          <div className="placeholder-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <span>Analytics & Reports</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📈</div>
              <span>Performance Metrics</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚙️</div>
              <span>Management Tools</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📋</div>
              <span>Task Overview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlankDashboard
