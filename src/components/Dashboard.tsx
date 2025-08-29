import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
  logo_url?: string
}

interface Department {
  id: string
  name: string
  menu_icon?: string
  menu_path?: string
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  job_role: { name: string }
}

const Dashboard = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [childBusinessUnits, setChildBusinessUnits] = useState<BusinessUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [companyName])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        navigate('/login')
        return
      }

      // Get user data from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          business_unit_id,
          job_roles!inner (name)
        `)
        .eq('id', authUser.id)
        .single()

      if (userError) {
        console.error('User data error:', userError)
        navigate('/login')
        return
      }

      // Load business unit data
      const { data: businessUnitData, error: businessUnitError } = await supabase
        .from('business_units')
        .select(`
          id,
          name,
          business_unit_type_id,
          logo_url
        `)
        .eq('id', userData.business_unit_id)
        .single()

      if (businessUnitError) throw businessUnitError

      setBusinessUnit(businessUnitData)

      // Load departments for this business unit
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('business_unit_departments')
        .select(`
          departments (
            id,
            name,
            menu_icon,
            menu_path
          )
        `)
        .eq('business_unit_id', businessUnitData.id)

      if (departmentsError) throw departmentsError

      const deptList = departmentsData
        .map(item => item.departments)
        .filter(Boolean)
        .flat() as Department[]
      setDepartments(deptList)

      // Load child business units (for GROUP_MANAGEMENT types)
      if (businessUnitData.business_unit_type_id === '716008fd-932c-447f-abc2-3b1e9305bb59') {
        const { data: childUnits, error: childUnitsError } = await supabase
          .from('business_units')
          .select('id, name, business_unit_type_id, logo_url')
          .eq('parent_business_unit_id', businessUnitData.id)
          .order('name')

        if (childUnitsError) throw childUnitsError
        setChildBusinessUnits(childUnits || [])
      }

      setUser({
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        job_role: { name: (userData.job_roles as any)?.name || 'Unknown' }
      })

    } catch (error) {
      console.error('Error loading dashboard:', error)
      navigate('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSideMenu = () => {
    setIsSideMenuCollapsed(!isSideMenuCollapsed)
  }

  const handleCreateChildCompany = () => {
    // TODO: Navigate to child company creation flow
    alert('Create Child Company functionality will be implemented in the next flow')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      navigate('/')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery)
  }

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!businessUnit || !user) {
    return (
      <div className="dashboard-error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Dashboard</h2>
          <p>There was an issue loading your workspace. Please try again.</p>
          <button onClick={() => navigate('/login')} className="error-button">
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard ${isDarkMode ? 'dark-mode' : ''} ${showAIModal ? 'ai-modal-open' : ''}`}>
      {/* Sidebar */}
      <div className={`sidebar ${isSideMenuCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="company-brand">
            {businessUnit.logo_url ? (
              <img src={businessUnit.logo_url} alt="Company Logo" className="company-logo" />
            ) : (
              <div className="company-logo-placeholder">
                {businessUnit.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
              </div>
            )}
            {!isSideMenuCollapsed && (
              <div className="company-info">
                <h3 className="company-name">{businessUnit.name}</h3>
                <span className="company-type">Group Management</span>
              </div>
            )}
          </div>
          <button className="sidebar-toggle" onClick={toggleSideMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isSideMenuCollapsed ? (
                <path d="M9 18l6-6-6-6" />
              ) : (
                <path d="M15 18l-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Group Company Section */}
          <div className="nav-section">
            <div className="nav-section-header">
              <span className="nav-section-title">{businessUnit.name}</span>
            </div>
            <ul className="nav-list">
              <li className="nav-item active">
                <div className="nav-link">
                  <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                  {!isSideMenuCollapsed && <span className="nav-text">Dashboard</span>}
                </div>
              </li>
              {departments.map(dept => (
                <li key={dept.id} className="nav-item">
                  <div className="nav-link">
                    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {!isSideMenuCollapsed && <span className="nav-text">{dept.name}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Regional Business Units Section */}
          <div className="nav-section">
            <div className="nav-section-header">
              <span className="nav-section-title">Regional Business Units</span>
            </div>
            <ul className="nav-list">
              {childBusinessUnits.length === 0 ? (
                <li className="nav-item-empty">
                  {!isSideMenuCollapsed && (
                    <span className="nav-empty-text">No regional units yet</span>
                  )}
                </li>
              ) : (
                childBusinessUnits.map(unit => (
                  <li key={unit.id} className="nav-item">
                    <div className="nav-link">
                      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18" />
                        <path d="M5 21V7l8-4v18" />
                        <path d="M19 21V11l-6-4" />
                      </svg>
                      {!isSideMenuCollapsed && <span className="nav-text">{unit.name}</span>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* My Account Section */}
          <div className="nav-section">
            <div className="nav-section-header">
              <span className="nav-section-title">My Account</span>
            </div>
            <ul className="nav-list">
              <li className="nav-item">
                <div className="nav-link">
                  <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {!isSideMenuCollapsed && <span className="nav-text">My Profile</span>}
                </div>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">{businessUnit.name} Dashboard</h1>
            <span className="page-subtitle">Group Management Center</span>
          </div>
          
          <div className="header-center">
            <form onSubmit={handleSearch} className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search across your business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </form>
          </div>
          
          <div className="header-right">
            <button 
              className="header-action-btn"
              onClick={() => setShowAIModal(true)}
              title="AI Assistant"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8V4H8" />
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 12h8" />
                <path d="M8 16h6" />
              </svg>
            </button>
            
            <div className="header-action-container">
              <button 
                className="header-action-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="notification-badge">0</span>
              </button>
              
              {showNotifications && (
                <div className="dropdown notifications-dropdown">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <button onClick={() => setShowNotifications(false)} className="dropdown-close">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="dropdown-content">
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <p>No notifications yet</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="header-action-container">
              <button 
                className="header-action-btn user-avatar"
                onClick={() => setShowSettings(!showSettings)}
                title="Account Settings"
              >
                <div className="avatar">
                  {user.first_name[0]}{user.last_name[0]}
                </div>
              </button>
              
              {showSettings && (
                <div className="dropdown settings-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info">
                      <div className="user-avatar-large">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div className="user-details">
                        <h4>{user.first_name} {user.last_name}</h4>
                        <p>{user.job_role.name}</p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="dropdown-close">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="dropdown-content">
                    <div className="settings-section">
                      <h5>Preferences</h5>
                      <label className="toggle-setting">
                        <input
                          type="checkbox"
                          checked={isDarkMode}
                          onChange={(e) => setIsDarkMode(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span>Dark Mode</span>
                      </label>
                    </div>
                    <div className="settings-section">
                      <button className="settings-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Edit Profile
                      </button>
                      <button className="settings-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                        </svg>
                        Account Settings
                      </button>
                    </div>
                    <div className="settings-section">
                      <button className="logout-btn" onClick={handleLogout}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16,17 21,12 16,7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="locked-state">
              <div className="locked-state-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <circle cx="12" cy="16" r="1" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="locked-state-title">Group Company Dashboard</h2>
              <p className="locked-state-description">
                Your group management dashboard is currently locked. To unlock full functionality, 
                you'll need to create your first regional business unit.
              </p>
              <button className="primary-action-btn" onClick={handleCreateChildCompany}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Create Regional Business Unit
              </button>
              
              <div className="getting-started-section">
                <h3>Getting Started</h3>
                <div className="setup-steps">
                  <div className="setup-step completed">
                    <div className="step-icon">✓</div>
                    <div className="step-content">
                      <h4>Account Created</h4>
                      <p>Your group management account is set up</p>
                    </div>
                  </div>
                  <div className="setup-step pending">
                    <div className="step-icon">2</div>
                    <div className="step-content">
                      <h4>Create Regional Unit</h4>
                      <p>Add your first regional business unit</p>
                    </div>
                  </div>
                  <div className="setup-step pending">
                    <div className="step-icon">3</div>
                    <div className="step-content">
                      <h4>Configure Services</h4>
                      <p>Set up your service offerings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <>
          <div className="ai-modal-overlay" />
          <div className="ai-modal">
            <div className="ai-modal-header">
              <div className="ai-modal-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8V4H8" />
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 12h8" />
                  <path d="M8 16h6" />
                </svg>
                <h3>AI Assistant</h3>
              </div>
              <button 
                className="ai-modal-close"
                onClick={() => setShowAIModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="ai-modal-content">
              <div className="ai-setup-message">
                <div className="ai-setup-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 8V4H8" />
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 12h8" />
                    <path d="M8 16h6" />
                  </svg>
                </div>
                <h4>AI Assistant Setup Required</h4>
                <p>Your AI assistant is not configured yet. Once set up, it will help you with:</p>
                <ul>
                  <li>Business analytics and insights</li>
                  <li>Customer service automation</li>
                  <li>Scheduling optimization</li>
                  <li>Report generation</li>
                </ul>
                <button className="setup-ai-btn">
                  Configure AI Assistant
                </button>
              </div>
              
              <div className="ai-chat-placeholder">
                <div className="chat-disabled-overlay">
                  <p>Chat will be available after AI setup</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard