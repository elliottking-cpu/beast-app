import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EmployeeManagement.css'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  job_role: string
  department_name: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  skills_count: number
  licenses_count: number
}

interface BusinessUnit {
  id: string
  name: string
}

interface JobRole {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

const RegionalEmployeeManagement = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [currentBusinessUnit, setCurrentBusinessUnit] = useState<BusinessUnit | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterJobRole, setFilterJobRole] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  useEffect(() => {
    loadRegionalEmployeeData()
  }, [companyName])

  const loadRegionalEmployeeData = async () => {
    try {
      setIsLoading(true)

      // First, get the current business unit based on company name
      const formattedCompanyName = companyName?.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')

      const { data: businessUnitData, error: businessUnitError } = await supabase
        .from('business_units')
        .select('id, name')
        .eq('name', formattedCompanyName)
        .single()

      if (businessUnitError) throw businessUnitError
      setCurrentBusinessUnit(businessUnitData)

      // Load employees for this business unit
      const { data: employeeData, error: employeeError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          last_login,
          created_at,
          job_roles (name),
          departments (name)
        `)
        .eq('business_unit_id', businessUnitData.id)
        .order('last_name')

      if (employeeError) throw employeeError

      // Get skills and licenses count for each employee
      const employeeIds = employeeData?.map(emp => emp.id) || []
      
      const [skillsData, licensesData] = await Promise.all([
        supabase
          .from('employee_skills')
          .select('user_id')
          .in('user_id', employeeIds)
          .eq('is_active', true),
        supabase
          .from('employee_licenses')
          .select('user_id')
          .in('user_id', employeeIds)
          .eq('is_active', true)
      ])

      const skillsCounts = skillsData.data?.reduce((acc, skill) => {
        acc[skill.user_id] = (acc[skill.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const licensesCounts = licensesData.data?.reduce((acc, license) => {
        acc[license.user_id] = (acc[license.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const formattedEmployees = employeeData?.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        job_role: (emp.job_roles as any)?.name || 'Unknown',
        department_name: (emp.departments as any)?.name || null,
        is_active: emp.is_active,
        last_login: emp.last_login,
        created_at: emp.created_at,
        skills_count: skillsCounts[emp.id] || 0,
        licenses_count: licensesCounts[emp.id] || 0
      })) || []

      setEmployees(formattedEmployees)

      // Load job roles for employees
      const { data: jobRoleData, error: jobRoleError } = await supabase
        .from('job_roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (jobRoleError) throw jobRoleError
      setJobRoles(jobRoleData || [])

      // Load departments for this business unit
      const { data: departmentData, error: departmentError } = await supabase
        .from('business_unit_departments')
        .select(`
          departments (id, name)
        `)
        .eq('business_unit_id', businessUnitData.id)
        .eq('is_active', true)

      if (departmentError) throw departmentError

      const formattedDepartments = departmentData?.map(dept => ({
        id: (dept.departments as any)?.id,
        name: (dept.departments as any)?.name
      })).filter(dept => dept.id && dept.name) || []

      setDepartments(formattedDepartments)

    } catch (error) {
      console.error('Error loading regional employee data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchQuery || 
      employee.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.job_role.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesJobRole = filterJobRole === 'all' || employee.job_role === filterJobRole
    const matchesDepartment = filterDepartment === 'all' || employee.department_name === filterDepartment
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && employee.is_active) ||
      (filterStatus === 'inactive' && !employee.is_active)

    return matchesSearch && matchesJobRole && matchesDepartment && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusBadge = (isActive: boolean, lastLogin: string | null) => {
    if (!isActive) {
      return <span className="status-badge inactive">Inactive</span>
    }
    
    if (!lastLogin) {
      return <span className="status-badge pending">Never Logged In</span>
    }

    const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLogin <= 7) {
      return <span className="status-badge active">Active</span>
    } else if (daysSinceLogin <= 30) {
      return <span className="status-badge warning">Inactive ({daysSinceLogin}d)</span>
    } else {
      return <span className="status-badge inactive">Long Inactive ({daysSinceLogin}d)</span>
    }
  }

  if (isLoading) {
    return (
      <div className="employee-loading">
        <div className="loading-spinner"></div>
        <p>Loading employee data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="equipment-management">
        <div className="equipment-header">
          <div className="equipment-title-section">
            <h1>HR - Employee Management</h1>
            <p>Manage employees for {currentBusinessUnit?.name}</p>
          </div>
          <div className="equipment-actions">
            <button 
              className="add-equipment-btn"
              onClick={() => setShowAddEmployee(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Hire Employee
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="employee-filters">
          <div className="search-section">
            <div className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search employees by name, email, or job role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <select 
              value={filterJobRole} 
              onChange={(e) => setFilterJobRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Job Roles</option>
              {jobRoles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>

            <select 
              value={filterDepartment} 
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>

            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="employee-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{employees.length}</div>
              <div className="stat-label">Total Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{employees.filter(e => e.is_active).length}</div>
              <div className="stat-label">Active Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <div className="stat-number">{employees.reduce((sum, e) => sum + e.skills_count, 0)}</div>
              <div className="stat-label">Total Skills</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📜</div>
            <div className="stat-content">
              <div className="stat-number">{employees.reduce((sum, e) => sum + e.licenses_count, 0)}</div>
              <div className="stat-label">Active Licenses</div>
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job Role</th>
                <th>Department</th>
                <th>Skills</th>
                <th>Licenses</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    {searchQuery || filterJobRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all' 
                      ? 'No employees match your search criteria' 
                      : 'No employees found'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(employee => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-info">
                        <div className="employee-avatar">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                        <div className="employee-details">
                          <div className="employee-name">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="employee-email">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="job-role-badge">{employee.job_role}</span>
                    </td>
                    <td>{employee.department_name || 'Unassigned'}</td>
                    <td>
                      <span className="count-badge skills">
                        {employee.skills_count} skills
                      </span>
                    </td>
                    <td>
                      <span className="count-badge licenses">
                        {employee.licenses_count} licenses
                      </span>
                    </td>
                    <td>{getStatusBadge(employee.is_active, employee.last_login)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="View Profile">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </button>
                        <button className="btn-icon" title="Manage Skills">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                        <button className="btn-icon" title="Edit Employee">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          Showing {filteredEmployees.length} of {employees.length} employees for {currentBusinessUnit?.name}
        </div>
      </div>

      {/* Add Employee Modal - Placeholder */}
      {showAddEmployee && (
        <div className="modal-overlay" onClick={() => setShowAddEmployee(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Hire New Employee</h3>
              <button className="modal-close" onClick={() => setShowAddEmployee(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Employee hiring form will be implemented here...</p>
              <p>This will include:</p>
              <ul>
                <li>Personal details (name, email, phone)</li>
                <li>Job role assignment for this business unit</li>
                <li>Department assignment</li>
                <li>Initial skills assessment</li>
                <li>License verification</li>
                <li>Equipment assignments</li>
                <li>Training requirements</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddEmployee(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                Hire Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RegionalEmployeeManagement
