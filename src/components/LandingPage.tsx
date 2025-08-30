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
      {/* Navigation Header */}
      <nav className="navigation">
        <div className="nav-container">
          <div className="nav-brand">
            <h3>Beast App</h3>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login-btn" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="nav-cta-btn" onClick={handleCreateAccount}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span>🚀 Now Live - Professional FSM Platform</span>
            </div>
            <h1 className="hero-title">
              Transform Your Field Service Operations
            </h1>
            <h2 className="hero-subtitle">
              The Complete Management Platform for Septic Tank & Waste Management Companies
            </h2>
            <p className="hero-description">
              Built specifically for waste management professionals, Beast App streamlines every aspect of your business - 
              from customer management and service scheduling to equipment tracking and financial reporting. 
              Scale your operations with confidence using our enterprise-grade platform.
            </p>
            
            <div className="hero-stats">
              <div className="stat">
                <h3>500+</h3>
                <p>Properties Managed</p>
              </div>
              <div className="stat">
                <h3>50+</h3>
                <p>Service Routes</p>
              </div>
              <div className="stat">
                <h3>99.9%</h3>
                <p>Uptime</p>
              </div>
            </div>
            
            <div className="hero-actions">
              <button className="primary-cta-button" onClick={handleCreateAccount}>
                <span>Start Free Trial</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14m-7-7l7 7-7 7"/>
                </svg>
              </button>
              <button className="secondary-cta-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">Beast App Dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="sidebar-item active"></div>
                  <div className="sidebar-item"></div>
                  <div className="sidebar-item"></div>
                  <div className="sidebar-item"></div>
                </div>
                <div className="preview-main">
                  <div className="preview-card"></div>
                  <div className="preview-card"></div>
                  <div className="preview-card small"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need to Scale Your Business</h2>
            <p>Comprehensive tools designed specifically for waste management professionals</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3>Multi-Location Management</h3>
              <p>Manage multiple business units under one group company with hierarchical permissions and unified reporting.</p>
              <ul>
                <li>Group-level oversight</li>
                <li>Regional autonomy</li>
                <li>Consolidated reporting</li>
                <li>Role-based access</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3>Customer & Property Tracking</h3>
              <p>Comprehensive customer management with property-centric service history that stays with locations.</p>
              <ul>
                <li>Property-based records</li>
                <li>Service history tracking</li>
                <li>Customer relationship management</li>
                <li>Automated billing</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3>Smart Scheduling & Dispatch</h3>
              <p>Intelligent route optimization and scheduling system designed for waste management operations.</p>
              <ul>
                <li>Route optimization</li>
                <li>Real-time dispatch</li>
                <li>Emergency scheduling</li>
                <li>Resource allocation</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3>Equipment & Vehicle Management</h3>
              <p>Track your fleet, equipment, and maintenance schedules with automated reminders and compliance tracking.</p>
              <ul>
                <li>Fleet tracking</li>
                <li>Maintenance schedules</li>
                <li>Compliance monitoring</li>
                <li>Asset optimization</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Financial Management</h3>
              <p>Complete financial tracking with automated invoicing, payment processing, and comprehensive reporting.</p>
              <ul>
                <li>Automated invoicing</li>
                <li>Payment tracking</li>
                <li>Financial reporting</li>
                <li>QuickBooks integration</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <line x1="7" y1="2" x2="7" y2="22"/>
                  <line x1="17" y1="2" x2="17" y2="22"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="2" y1="7" x2="7" y2="7"/>
                  <line x1="2" y1="17" x2="7" y2="17"/>
                  <line x1="17" y1="17" x2="22" y2="17"/>
                  <line x1="17" y1="7" x2="22" y2="7"/>
                </svg>
              </div>
              <h3>Mobile Field App</h3>
              <p>Dedicated mobile application for field workers with offline capabilities and real-time synchronization.</p>
              <ul>
                <li>Offline functionality</li>
                <li>GPS tracking</li>
                <li>Photo documentation</li>
                <li>Digital signatures</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>Built by Industry Professionals</h2>
              <p>
                Beast App was created by The Septics Group, a leading waste management company with over 
                a decade of experience in the industry. We understand the unique challenges you face because 
                we face them too.
              </p>
              <p>
                Our platform was born from real-world needs - managing multiple business units, tracking 
                thousands of properties, coordinating field teams, and maintaining compliance across 
                different regions. We built the solution we wished we had.
              </p>
              <div className="about-features">
                <div className="about-feature">
                  <h4>🏆 Industry Expertise</h4>
                  <p>Built by professionals who understand your business</p>
                </div>
                <div className="about-feature">
                  <h4>⚡ Real-World Tested</h4>
                  <p>Proven in actual waste management operations</p>
                </div>
                <div className="about-feature">
                  <h4>🔧 Continuously Improved</h4>
                  <p>Regular updates based on industry feedback</p>
                </div>
              </div>
            </div>
            <div className="about-visual">
              <div className="company-showcase">
                <h3>Trusted by Industry Leaders</h3>
                <div className="company-logos">
                  <div className="company-logo">The Septics Group</div>
                  <div className="company-logo">Yorkshire Septics</div>
                  <div className="company-logo">Your Company Next</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose the plan that fits your business size and needs</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Starter</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">Coming Soon</span>
                </div>
                <p>Perfect for single-location businesses</p>
              </div>
              <div className="pricing-features">
                <ul>
                  <li>✓ Up to 500 properties</li>
                  <li>✓ 5 team members</li>
                  <li>✓ Basic scheduling</li>
                  <li>✓ Customer management</li>
                  <li>✓ Mobile app access</li>
                  <li>✓ Email support</li>
                </ul>
              </div>
              <button className="pricing-button secondary">
                Coming Soon
              </button>
            </div>
            
            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-header">
                <h3>Professional</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">Coming Soon</span>
                </div>
                <p>Ideal for growing regional businesses</p>
              </div>
              <div className="pricing-features">
                <ul>
                  <li>✓ Unlimited properties</li>
                  <li>✓ Unlimited team members</li>
                  <li>✓ Advanced scheduling & routing</li>
                  <li>✓ Financial management</li>
                  <li>✓ Equipment tracking</li>
                  <li>✓ QuickBooks integration</li>
                  <li>✓ Priority support</li>
                  <li>✓ Custom reporting</li>
                </ul>
              </div>
              <button className="pricing-button primary">
                Coming Soon
              </button>
            </div>
            
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">Custom</span>
                </div>
                <p>For multi-location group companies</p>
              </div>
              <div className="pricing-features">
                <ul>
                  <li>✓ Everything in Professional</li>
                  <li>✓ Multi-business unit management</li>
                  <li>✓ Group-level reporting</li>
                  <li>✓ Advanced permissions</li>
                  <li>✓ API access</li>
                  <li>✓ Custom integrations</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ Training & onboarding</li>
                </ul>
              </div>
              <button className="pricing-button secondary">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <div className="contact-content">
            <div className="contact-info">
              <h2>Ready to Transform Your Business?</h2>
              <p>
                Join the growing number of waste management companies using Beast App to 
                streamline their operations and grow their business.
              </p>
              <div className="contact-methods">
                <div className="contact-method">
                  <div className="contact-icon">📧</div>
                  <div>
                    <h4>Email Us</h4>
                    <p>info@beastapp.com</p>
                  </div>
                </div>
                <div className="contact-method">
                  <div className="contact-icon">📞</div>
                  <div>
                    <h4>Call Us</h4>
                    <p>+44 1234 567890</p>
                  </div>
                </div>
                <div className="contact-method">
                  <div className="contact-icon">💬</div>
                  <div>
                    <h4>Live Chat</h4>
                    <p>Available 9am-5pm GMT</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="contact-form">
              <h3>Get Started Today</h3>
              <form className="demo-form">
                <input type="text" placeholder="Company Name" />
                <input type="email" placeholder="Work Email" />
                <input type="tel" placeholder="Phone Number" />
                <select>
                  <option>Business Size</option>
                  <option>1-5 employees</option>
                  <option>6-20 employees</option>
                  <option>21-50 employees</option>
                  <option>50+ employees</option>
                </select>
                <textarea placeholder="Tell us about your business needs..."></textarea>
                <button type="submit" className="form-submit-btn">
                  Request Demo
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>Beast App</h3>
              <p>The professional field service management platform for waste management companies.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#">Documentation</a>
                <a href="#">API</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#">Careers</a>
                <a href="#">Blog</a>
                <a href="#">Press</a>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="#contact">Contact</a>
                <a href="#">Help Center</a>
                <a href="#">Status</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Beast App. All rights reserved.</p>
            <div className="footer-legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
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
