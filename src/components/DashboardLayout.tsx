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
  pages?: DepartmentPage[]
}

interface DepartmentPage {
  id: string
  name: string
  path: string
  component_name: string
  sort_order: number
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  job_role: { name: string }
}

const DashboardLayout = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const navigate = useNavigate()

  // Function to get department-specific icons
  const getDepartmentIcon = (departmentName: string, size: number = 20) => {
    switch (departmentName.toLowerCase()) {
      case 'sales':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'transport':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
          </svg>
        )
      case 'accounts':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h13a1 1 0 0 1 1 1z" />
            <path d="M3 20.5v-8.5l18-1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-0.5z" />
            <path d="M18 12h.01" />
          </svg>
        )
      case 'surveying':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1 -2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
          </svg>
        )
      case 'construction':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )
      case 'hr':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        )
      case 'scheduling':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )
      case 'business management':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
        )
      case 'group hr':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        )
      case 'group marketing & advertising':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11l18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
        )
      case 'group app settings':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6" />
            <path d="m21 12-6 0m-6 0-6 0" />
          </svg>
        )
      case 'group clients':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'group properties':
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
        )
      default:
        return (
          <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6" />
            <path d="m21 12-6 0m-6 0-6 0" />
          </svg>
        )
    }
  }
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
  const [expandedDepartments, setExpandedDepartments] = useState<{[key: string]: boolean}>({
    'sales': true // Sales department expanded by default for testing
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Cache for business unit data to prevent unnecessary reloads
  const [businessUnitCache, setBusinessUnitCache] = useState<{[key: string]: any}>({})
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Initial load effect - loads all data once
  useEffect(() => {
    if (isInitialLoad) {
      loadInitialData()
    }
  }, [isInitialLoad])

  // Navigation effect - only updates business unit context when URL changes
  useEffect(() => {
    if (!isInitialLoad && businessUnitCache && Object.keys(businessUnitCache).length > 0) {
      console.log('Navigation detected, updating business unit context for:', companyName)
      updateBusinessUnitContext()
    }
  }, [companyName, isInitialLoad, businessUnitCache])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      
      // First, load all business unit data and cache it
      await loadAllBusinessUnitData()
      
      // Then load the full dashboard data
      await loadDashboardData()
      
    } catch (error) {
      console.error('Error during initial load:', error)
      setIsLoading(false)
    }
  }

  const loadAllBusinessUnitData = async () => {
    try {
      // Load all business unit data once and cache it
      const { data: allBusinessUnits, error: buError } = await supabase
        .from('business_units')
        .select(`
          id,
          name,
          business_unit_type_id,
          logo_url,
          parent_business_unit_id
        `)

      if (buError) throw buError

      // Cache all business units by name slug
      const cache: {[key: string]: any} = {}
      for (const bu of allBusinessUnits || []) {
        const slug = bu.name?.toLowerCase().replace(/\s+/g, '-') || ''
        cache[slug] = bu
      }
      
      setBusinessUnitCache(cache)
      console.log('Business unit cache loaded:', cache)
    } catch (error) {
      console.error('Error loading business unit cache:', error)
    }
  }

  const updateBusinessUnitContext = () => {
    try {
      // Only update the business unit context, don't reload sidebar data
      if (companyName && businessUnitCache[companyName]) {
        const targetBusinessUnit = businessUnitCache[companyName]
        console.log('🔄 NAVIGATION: Switching to business unit:', targetBusinessUnit.name, '(sidebar should NOT reload)')
        setBusinessUnit(targetBusinessUnit)
      } else {
        console.warn('Business unit not found in cache:', companyName)
      }
    } catch (error) {
      console.error('Error updating business unit context:', error)
    }
  }

  const loadDashboardData = async () => {
    try {
      // Don't show loading spinner for subsequent navigation
      if (isInitialLoad) {
        setIsLoading(true)
      }

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        navigate('/login')
        return
      }

      // Get user data from our users table (only on initial load or if not cached)
      let userData = null
      if (!user || isInitialLoad) {
        const { data: userDataResult, error: userError } = await supabase
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

        userData = userDataResult
        setUser({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          job_role: { name: (userData.job_roles as any)?.name || 'Unknown' }
        })
      }

      // Determine which business unit to load based on URL
      let targetBusinessUnitData
      if (companyName && businessUnitCache[companyName]) {
        // Use cached data for the specific business unit from URL
        targetBusinessUnitData = businessUnitCache[companyName]
        console.log('Using cached business unit data for:', companyName)
      } else if (userData) {
        // Fallback to user's default business unit
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
        targetBusinessUnitData = businessUnitData
      } else {
        throw new Error('No business unit data available')
      }

      setBusinessUnit(targetBusinessUnitData)

      // Load departments for this business unit (simplified approach)
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
        .eq('business_unit_id', targetBusinessUnitData.id)
        .eq('is_active', true)

      if (departmentsError) throw departmentsError

      const deptList = departmentsData
        .map(item => item.departments)
        .filter(Boolean)
        .flat() as Department[]

      // Load pages for each department separately
      const departmentsWithPages = await Promise.all(
        deptList.map(async (dept) => {
          const { data: pagesData, error: pagesError } = await supabase
            .from('department_pages')
            .select(`
              app_pages (
                id,
                name,
                path,
                component_name
              ),
              sort_order,
              is_active
            `)
            .eq('department_id', dept.id)
            .eq('is_active', true)
            .order('sort_order')
          
          if (pagesError) {
            console.error(`Error loading pages for ${dept.name}:`, pagesError)
          }

          const pages = pagesData?.map((dp: any) => {
            const appPage = Array.isArray(dp.app_pages) ? dp.app_pages[0] : dp.app_pages
            return {
              id: appPage?.id,
              name: appPage?.name,
              path: appPage?.path,
              component_name: appPage?.component_name,
              sort_order: dp.sort_order
            }
          }).filter(page => page.id) || []

          return {
            ...dept,
            pages
          }
        })
      )
      
      setDepartments(departmentsWithPages)

      // Load child business units (for GROUP_MANAGEMENT types)
      if (targetBusinessUnitData.business_unit_type_id === '716008fd-932c-447f-abc2-3b1e9305bb59') {
        const { data: childUnits, error: childUnitsError } = await supabase
          .from('business_units')
          .select('id, name, business_unit_type_id, logo_url')
          .eq('parent_business_unit_id', targetBusinessUnitData.id)
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

          // Load pages for each department
          const departmentsWithPages = await Promise.all(
            deptList.map(async (dept) => {
              const { data: pages } = await supabase
                .from('department_pages')
                .select(`
                  app_pages (
                    id,
                    name,
                    path,
                    component_name,
                    sort_order
                  )
                `)
                .eq('department_id', dept.id)
                .eq('is_active', true)
                .order('sort_order')

              return {
                ...dept,
                pages: pages?.map(p => p.app_pages).filter(Boolean).flat() || []
              }
            })
          )

          departmentsByUnit[unit.id] = departmentsWithPages
          console.log(`Loaded ${departmentsWithPages.length} departments for ${unit.name}:`, departmentsWithPages.map(d => `${d.name} (${d.pages?.length || 0} pages)`))
        }

        setChildBusinessUnitDepartments(departmentsByUnit)

        // All regional units start collapsed by default for a cleaner menu
        // Users can expand them as needed
      }

      console.log('Current business unit loaded:', targetBusinessUnitData)
      console.log('Current URL:', window.location.pathname)

    } catch (error) {
      console.error('Error loading dashboard:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      // Don't navigate away immediately, let's see what the error is
      setIsLoading(false)
    } finally {
      if (isInitialLoad) {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
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

  const getPageTitle = () => {
    // Extract current page from URL path
    const path = window.location.pathname
    const pathParts = path.split('/').filter(part => part)
    
    if (pathParts.length >= 2) {
      const pageName = pathParts[pathParts.length - 1]
      
      // Capitalize and format page names
      const formattedPage = pageName.charAt(0).toUpperCase() + pageName.slice(1)
      
      return formattedPage
    }
    
    return businessUnit?.name || 'Dashboard'
  }

  const getPageSubtitle = () => {
    // Determine subtitle based on business unit type and current context
    if (businessUnit) {
      const isGroupLevel = businessUnit.name?.toLowerCase().includes('group')
      if (isGroupLevel) {
        return 'Group Management Center'
      } else {
        return `${businessUnit.name} - Regional Operations`
      }
    }
    return 'Loading...'
  }

  const isPageActive = (pagePath: string, unitName?: string) => {
    const currentPath = window.location.pathname
    
    // Extract the company slug from the current URL
    const pathParts = currentPath.split('/').filter(part => part)
    const currentCompanySlug = pathParts[0] || ''
    
    // For regional business units, use the unit name if provided
    let companySlug = businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'
    if (unitName) {
      companySlug = unitName.toLowerCase().replace(/\s+/g, '-')
    }
    
    // If we're on a regional page, use the current URL's company slug
    if (currentCompanySlug && currentCompanySlug !== companySlug) {
      companySlug = currentCompanySlug
    }
    
    const fullPath = `/${companySlug}${pagePath}`
    const isActive = currentPath === fullPath
    
    // Debug logging (can be removed in production)
    // console.log('Page Active Check:', { pagePath, currentPath, fullPath, isActive })
    
    return isActive
  }

  // Add console log to track sidebar re-renders
  console.log('🎨 RENDER: DashboardLayout rendering, businessUnit:', businessUnit?.name, 'isLoading:', isLoading)

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
                <li className="nav-item nav-group">
                  <button 
                    className="nav-link nav-group-header"
                    onClick={() => {
                      const companySlug = businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'
                      navigate(`/${companySlug}/dashboard`)
                    }}
                  >
                    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                    {!isSideMenuCollapsed && <span className="nav-text">Dashboard</span>}
                  </button>
                </li>
                
                {/* Department Sections */}
                {departments.map(dept => {
                  const deptKey = dept.name.toLowerCase().replace(/\s+/g, '-')
                  const isExpanded = expandedDepartments[deptKey]
                  const hasDepartmentPages = (dept.pages && dept.pages.length > 0) || dept.name === 'Business Management'
                  
                  return (
                    <li key={dept.id} className="nav-item nav-group">
                      <button 
                        className="nav-link nav-group-header"
                        onClick={() => toggleDepartmentExpansion(deptKey)}
                        disabled={!hasDepartmentPages}
                      >
{getDepartmentIcon(dept.name)}
                        {!isSideMenuCollapsed && (
                          <>
                            <span className="nav-text">{dept.name}</span>
                            {hasDepartmentPages && (
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
                      {!isSideMenuCollapsed && hasDepartmentPages && isExpanded && (
                        <ul className="nav-sublist">
                          {/* Dynamic department pages from database */}
                          {dept.pages?.map(page => (
                            <li key={page.id} className={`nav-subitem ${isPageActive(page.path) ? 'active' : ''}`}>
                              <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}${page.path}`} className="nav-link">
                                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="M12 1v6m0 6v6" />
                                  <path d="m21 12-6 0m-6 0-6 0" />
                                </svg>
                                <span className="nav-text">{page.name}</span>
                              </Link>
                            </li>
                          ))}
                          
                          {/* Department-specific hardcoded pages */}
                          {dept.name === 'Business Management' && (
                            <>
                              <li className={`nav-subitem ${isPageActive('/equipment') ? 'active' : ''}`}>
                                <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/equipment`} className="nav-link">
                                  <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v6m0 6v6" />
                                    <path d="m21 12-6 0m-6 0-6 0" />
                                  </svg>
                                  <span className="nav-text">Equipment Management</span>
                                </Link>
                              </li>
                              <li className={`nav-subitem ${isPageActive('/skills') ? 'active' : ''}`}>
                                <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/skills`} className="nav-link">
                                  <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                  </svg>
                                  <span className="nav-text">Skills & Certifications</span>
                                </Link>
                              </li>
                              <li className={`nav-subitem ${isPageActive('/services') ? 'active' : ''}`}>
                                <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/services`} className="nav-link">
                                  <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v6m0 6v6" />
                                    <path d="m21 12-6 0m-6 0-6 0" />
                                  </svg>
                                  <span className="nav-text">Service Catalog</span>
                                </Link>
                              </li>
                              <li className={`nav-subitem ${isPageActive('/business-management/employees') ? 'active' : ''}`}>
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
                              <li className="nav-subitem">
                                <Link to={`/${businessUnit?.name?.toLowerCase().replace(/\s+/g, '-') || 'company'}/business-management/add-business-unit`} className="nav-link">
                                  <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                  </svg>
                                  <span className="nav-text">Add Business Unit</span>
                                </Link>
                              </li>
                            </>
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
                          {/* Dashboard item for this business unit */}
                          <li className="nav-subitem">
                            <Link to={`/${unit.name?.toLowerCase().replace(/\s+/g, '-') || 'unit'}/dashboard`} className="nav-link">
                              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="9" x2="15" y2="9" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                              </svg>
                              <span className="nav-text">Dashboard</span>
                            </Link>
                          </li>
                          
                          {/* Department sections for this business unit */}
                          {childBusinessUnitDepartments[unit.id].map(dept => {
                            const deptKey = `${unit.id}-${dept.name.toLowerCase().replace(/\s+/g, '-')}`
                            const isDeptExpanded = expandedDepartments[deptKey]
                            
                            return (
                              <li key={dept.id} className="nav-subitem nav-group">
                                <button 
                                  className="nav-link nav-group-header"
                                  onClick={() => toggleDepartmentExpansion(deptKey)}
                                >
                                  {getDepartmentIcon(dept.name, 16)}
                                  <span className="nav-text">{dept.name}</span>
                                  <svg 
                                    className={`nav-expand-icon ${isDeptExpanded ? 'expanded' : ''}`} 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                  >
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </button>
                                {isDeptExpanded && dept.pages && dept.pages.length > 0 && (
                                  <ul className="nav-sublist">
                                    {dept.pages.map(page => (
                                      <li key={page.id} className={`nav-subitem ${isPageActive(page.path, unit.name) ? 'active' : ''}`}>
                                        <Link to={`/${unit.name?.toLowerCase().replace(/\s+/g, '-') || 'unit'}${page.path}`} className="nav-link">
                                          <svg className="nav-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M12 1v6m0 6v6" />
                                            <path d="m21 12-6 0m-6 0-6 0" />
                                          </svg>
                                          <span className="nav-text">{page.name}</span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            )
                          })}
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
            <h1 className="page-title">{getPageTitle()}</h1>
            <span className="page-subtitle">{getPageSubtitle()}</span>
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
