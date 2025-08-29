import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  useEffect(() => {
    // Check if redirected back with error state
    if (location.state?.showError) {
      setShowErrorPopup(true)
      // Clear the state to prevent showing popup on future visits
      navigate('/', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const handleCreateAccount = () => {
    navigate('/security')
  }

  const closeErrorPopup = () => {
    setShowErrorPopup(false)
  }

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Beast App</h1>
          <h2 className="hero-subtitle">Field Service Management Platform</h2>
          <p className="hero-description">
            Streamline your septic tank and waste management operations with our comprehensive 
            field service management solution. Built specifically for waste management companies 
            to manage customers, schedule services, track equipment, and grow your business.
          </p>
          
          <div className="hero-actions">
            <button className="cta-button" onClick={handleCreateAccount}>
              Create Account
            </button>
            <button className="secondary-button" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
        
        <div className="hero-image">
          <div className="feature-preview">
            <h3>Platform Features</h3>
            <ul>
              <li>Multi-location business management</li>
              <li>Customer & property tracking</li>
              <li>Service scheduling & dispatch</li>
              <li>Equipment & vehicle management</li>
              <li>Financial tracking & invoicing</li>
              <li>Mobile app for field workers</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2>Why Choose Our Platform?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Multi-Business Management</h3>
              <p>Manage multiple business units under one group company with hierarchical permissions and reporting.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile-First Design</h3>
              <p>Field workers can access everything they need on mobile devices, even when offline.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Real-Time Updates</h3>
              <p>Instant synchronization between office and field teams for up-to-date information.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>Complete Business Suite</h3>
              <p>From customer management to financial reporting, everything you need in one platform.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2025 Beast App. All rights reserved.</p>
        </div>
      </footer>

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="error-popup-overlay">
          <div className="error-popup">
            <div className="error-popup-content">
              <h3>Account Creation Unavailable</h3>
              <p>Sorry, we are not currently accepting new accounts at the moment.</p>
              <button onClick={closeErrorPopup} className="error-popup-close">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage
