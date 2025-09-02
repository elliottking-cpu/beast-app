import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
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

interface DashboardLayoutProps {
  currentPage?: string
}

const DashboardLayout = ({ currentPage = 'Dashboard' }: DashboardLayoutProps) => {
  const { companyName } = useParams<{ companyName: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [childBusinessUnits, setChildBusinessUnits] = useState<BusinessUnit[]>([])
  const [childBusinessUnitDepartments, setChildBusinessUnitDepartments] = useState<{[key: string]: Department[]}>({})
  const [expandedBusinessUnits, setExpandedBusinessUnits] = useState<{[key: string]: boolean}>({})
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    'main-departments': true, // Main business unit departments expanded by default
    'regional-units': true,   // Regional business units section expanded by default
    'account-section': false  // Account section collapsed by default
  })
  const [expandedDepartments, setExpandedDepartments] = useState<{[key: string]: boolean}>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    console.log('DashboardLayout mounting, companyName:', companyName)
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

        // Load departments for each child business unit
        const departmentsByUnit: {[key: string]: Department[]} = {}
        
        for (const unit of childUnits || []) {
          const { data: unitDepartments, error: unitDeptError } = await supabase
            .from('business_unit_departments')
            .select(`
              departments (
                id,
                name,
                menu_icon,
                menu_path
              )
            `)
            .eq('business_unit_id', unit.id)
            .eq('is_active', true)

          if (unitDeptError) {
            console.error(`Error loading departments for ${unit.name}:`, unitDeptError)
            continue
          }

          const deptList = unitDepartments
            ?.map(item => item.departments)
            .filter(Boolean)
            .flat() as Department[] || []

          departmentsByUnit[unit.id] = deptList
        }

        setChildBusinessUnitDepartments(departmentsByUnit)

        // All regional units start collapsed by default for a cleaner menu
        // Users can expand them as needed
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
      console.error('Error details:', JSON.stringify(error, null, 2))
      // Don't navigate away immediately, let's see what the error is
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSideMenu = () => {
    setIsSideMenuCollapsed(!isSideMenuCollapsed)
  }

  const toggleBusinessUnitExpansion = (businessUnitId: string) => {
    setExpandedBusinessUnits(prev => ({
      ...prev,
      [businessUnitId]: !prev[businessUnitId]
    }))
  }

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const toggleDepartmentExpansion = (departmentId: string) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [departmentId]: !prev[departmentId]
    }))
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
            {businessUnit?.logo_url ? (
              <img src={businessUnit.logo_url} alt="Company Logo" className="company-logo" />
            ) : (
              <div className="company-logo-placeholder">
                {businessUnit?.name?.split(' ').map(word => word[0]).join('').slice(0, 2) || 'BU'}
              </div>
            )}
            {!isSideMenuCollapsed && (
              <div className="company-info">
                <h3 className="company-name">{businessUnit?.name || 'Loading...'}</h3>
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
            <button 
              className="nav-section-header nav-section-toggle"
              onClick={() => toggleSectionExpansion('main-departments')}
            >
              <span className="nav-section-title">{businessUnit?.name || 'Loading...'}</span>
              {!isSideMenuCollapsed && (
                <svg 
                  className={`nav-expand-icon ${expandedSections['main-departments'] ? 'expanded' : ''}`} 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
            {(!isSideMenuCollapsed && expandedSections['main-departments']) && (
              <ul className="nav-list">
              <li className={`nav-item ${currentPage === 'Dashboard' ? 'active' : ''}`}>
                <div className="nav-link" onClick={() => {
                  const companySlug = businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'
                  navigate(`/${companySlug}/dashboard`)
                }}>
                  <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                  {!isSideMenuCollapsed && <span className="nav-text">Dashboard</span>}
                </div>
              </li>
              {departments.map(dept => {
                const deptKey = dept.name.toLowerCase().replace(/\s+/g, '-')
                const isExpanded = expandedDepartments[deptKey]
                
                return (
                  <li key={dept.id} className="nav-item">
                    <button 
                      className="nav-link nav-group-header"
                      onClick={() => toggleDepartmentExpansion(deptKey)}
                    >
                      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {dept.name === 'Executive' && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
                        {dept.name === 'Business Management' && <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />}
                        {dept.name === 'HR' && <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />}
                        {dept.name === 'HR' && <circle cx="9" cy="7" r="4" />}
                        {dept.name === 'Sales' && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
                        {dept.name === 'Transport' && <path d="M14 16H9m10 0h3m-3 0l3-3m-3 3l3 3M5 16H2m3 0L2 13m3 3l-3 3" />}
                        {dept.name === 'Surveying' && <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />}
                        {dept.name === 'Construction' && <path d="M7 21h10l2-2V8l-2-2H7L5 8v11l2 2z" />}
                        {dept.name === 'Accounts' && <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}
                        {!['Executive', 'Business Management', 'HR', 'Sales', 'Transport', 'Surveying', 'Construction', 'Accounts'].includes(dept.name) && 
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        }
                      </svg>
                      {!isSideMenuCollapsed && (
                        <>
                          <span className="nav-text">{dept.name}</span>
                          <svg 
                            className={`nav-expand-icon ${isExpanded ? 'expanded' : ''}`} 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </>
                      )}
                    </button>
                    
                    {!isSideMenuCollapsed && isExpanded && (
                      <ul className="nav-sublist">
                        {/* Department Dashboard */}
                        <li className="nav-subitem">
                          <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}${dept.menu_path}`} className="nav-link">
                            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <line x1="9" y1="9" x2="15" y2="9" />
                              <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                            <span className="nav-text">Dashboard</span>
                          </Link>
                        </li>

                        {/* Department-specific pages */}
                        {dept.name === 'Executive' && (
                          <>
                            <li className="nav-subitem">
                              <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/equipment`} className="nav-link">
                                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="M12 1v6m0 6v6" />
                                  <path d="m21 12-6 0m-6 0-6 0" />
                                </svg>
                                <span className="nav-text">Equipment Management</span>
                              </Link>
                            </li>
                            <li className="nav-subitem">
                              <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/skills`} className="nav-link">
                                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                                <span className="nav-text">Skills & Certifications</span>
                              </Link>
                            </li>
                            <li className="nav-subitem">
                              <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/services`} className="nav-link">
                                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="M12 1v6m0 6v6" />
                                  <path d="m21 12-6 0m-6 0-6 0" />
                                </svg>
                                <span className="nav-text">Service Catalog</span>
                              </Link>
                            </li>
                          </>
                        )}

                        {dept.name === 'Business Management' && (
                          <li className="nav-subitem">
                            <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/business-management/employees`} className="nav-link">
                              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="22" y1="11" x2="16" y2="11" />
                              </svg>
                              <span className="nav-text">Employee Management</span>
                            </Link>
                          </li>
                        )}

                        {dept.name === 'HR' && (
                          <li className="nav-subitem">
                            <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/hr/employees`} className="nav-link">
                              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="22" y1="11" x2="16" y2="11" />
                              </svg>
                              <span className="nav-text">Employee Management</span>
                            </Link>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                )
              })}
              </ul>
            )}
          </div>

          {/* Regional Business Units Section */}
          <div className="nav-section">
            <button 
              className="nav-section-header nav-section-toggle"
              onClick={() => toggleSectionExpansion('regional-units')}
            >
              <span className="nav-section-title">Regional Business Units</span>
              {!isSideMenuCollapsed && (
                <svg 
                  className={`nav-expand-icon ${expandedSections['regional-units'] ? 'expanded' : ''}`} 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
            {(!isSideMenuCollapsed && expandedSections['regional-units']) && (
              <ul className="nav-list">
              {childBusinessUnits.length === 0 ? (
                <li className="nav-item-empty">
                  {!isSideMenuCollapsed && (
                    <span className="nav-empty-text">No regional units yet</span>
                  )}
                </li>
              ) : (
                childBusinessUnits.map(unit => {
                  const isExpanded = expandedBusinessUnits[unit.id] || false
                  const hasDepartments = childBusinessUnitDepartments[unit.id] && childBusinessUnitDepartments[unit.id].length > 0
                  
                  return (
                    <li key={unit.id} className="nav-item nav-group">
                      <button 
                        className="nav-link nav-group-header"
                        onClick={() => toggleBusinessUnitExpansion(unit.id)}
                        disabled={!hasDepartments}
                      >
                        <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 21h18" />
                          <path d="M5 21V7l8-4v18" />
                          <path d="M19 21V11l-6-4" />
                        </svg>
                        {!isSideMenuCollapsed && (
                          <>
                            <span className="nav-text">{unit.name}</span>
                            {hasDepartments && (
                              <svg 
                                className={`nav-expand-icon ${isExpanded ? 'expanded' : ''}`} 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            )}
                          </>
                        )}
                      </button>
                      {!isSideMenuCollapsed && hasDepartments && isExpanded && (
                        <ul className="nav-sublist">
                          {childBusinessUnitDepartments[unit.id].map(dept => (
                            <li key={dept.id} className="nav-subitem">
                              <Link to={`/${unit.name?.toLowerCase().replace(/\s+/g, '-') || 'unit'}${dept.name === 'HR' ? '/hr/employees' : dept.menu_path || '#'}`} className="nav-link">
                                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {dept.name === 'HR' && (
                                    <>
                                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                      <circle cx="9" cy="7" r="4" />
                                    </>
                                  )}
                                  {dept.name !== 'HR' && (
                                    <>
                                      <circle cx="12" cy="12" r="3" />
                                      <path d="M12 1v6m0 6v6" />
                                      <path d="m21 12-6 0m-6 0-6 0" />
                                    </>
                                  )}
                                </svg>
                                <span className="nav-text">{dept.name === 'HR' ? 'Employee Management' : dept.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })
              )}
              </ul>
            )}
          </div>

          {/* My Account Section */}
          <div className="nav-section">
            <button 
              className="nav-section-header nav-section-toggle"
              onClick={() => toggleSectionExpansion('account-section')}
            >
              <span className="nav-section-title">My Account</span>
              {!isSideMenuCollapsed && (
                <svg 
                  className={`nav-expand-icon ${expandedSections['account-section'] ? 'expanded' : ''}`} 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
            {(!isSideMenuCollapsed && expandedSections['account-section']) && (
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
            )}
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">{businessUnit?.name || 'Loading...'} {currentPage}</h1>
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
                  {user?.first_name[0]}{user?.last_name[0]}
                </div>
              </button>
              
              {showSettings && (
                <div className="dropdown settings-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info">
                      <div className="user-avatar-large">
                        {user?.first_name[0]}{user?.last_name[0]}
                      </div>
                      <div className="user-details">
                        <h4>{user?.first_name} {user?.last_name}</h4>
                        <p>{user?.job_role.name}</p>
                        <p className="user-email">{user?.email}</p>
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

        {/* Page Content */}
        <main className="dashboard-main">
          <Outlet />
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

export default DashboardLayout
