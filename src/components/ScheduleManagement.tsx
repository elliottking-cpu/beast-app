import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  department_name: string
  job_role_name: string
  skills: string[]
}

interface Equipment {
  id: string
  name: string
  model: string
  type: 'TANKER' | 'JETVAC'
  capacity?: number
  assigned_driver?: Employee
}

interface ScheduleEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  scheduled_date: string
  employee_id?: string
  equipment_id?: string
  job_code: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  department: string
}

const ScheduleManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  console.log('🏗️ ScheduleManagement component render - companyName from URL:', companyName)
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'map' | 'list'>('day')
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)
  
  // List view pagination and filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [totalVisits, setTotalVisits] = useState(0)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const visitsPerPage = 20
  
  // Department-specific filters
  const [transportFilter, setTransportFilter] = useState<string>('All Vehicles')
  const [surveyingFilter, setSurveyingFilter] = useState<string>('All Surveyors')
  const [constructionFilter, setConstructionFilter] = useState<string>('All Job Types')

  const transportFilterOptions = ['All Vehicles', 'All Jetvacs', 'Small Jetvacs', 'All Tankers', 'Small Tankers']
  const surveyingFilterOptions = ['All Surveyors', 'Theo Waddington', 'William Ruddock']
  const constructionFilterOptions = ['All Job Types', 'Excavation', 'Pipe Installation', 'Maintenance', 'Emergency Repairs']

  useEffect(() => {
    console.log('🔄 Schedule useEffect triggered - companyName changed to:', companyName)
    loadScheduleData()
  }, [companyName])

  // Reload visits when date filter or page changes (only for list view)
  useEffect(() => {
    if (viewMode === 'list' && businessUnit) {
      console.log('🔄 Reloading visits for list view - Page:', currentPage, 'Filter:', dateFilter)
      loadVisitsForList(businessUnit.id, currentPage).then(({ visits }) => {
        setScheduleEvents(visits)
      })
    }
  }, [viewMode, currentPage, dateFilter, customStartDate, customEndDate, businessUnit])

  // Reset pagination when switching to list view or changing filters
  useEffect(() => {
    if (viewMode === 'list') {
      setCurrentPage(1)
    }
  }, [viewMode, dateFilter, customStartDate, customEndDate])

  // Force component reset when business unit changes
  useEffect(() => {
    console.log('🔄 Schedule component mounted/remounted for:', companyName)
    // Reset all state when business unit changes
    setEmployees([])
    setEquipment([])
    setScheduleEvents([])
    setBusinessUnit(null)
  }, [companyName])

  const getDateFilterQuery = () => {
    const today = new Date().toISOString().split('T')[0]
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    switch (dateFilter) {
      case 'today':
        return { start: today, end: today }
      case 'week':
        return { start: today, end: weekFromNow }
      case 'custom':
        return { start: customStartDate || '2025-09-01', end: customEndDate || '2025-12-31' }
      default:
        return { start: '2025-09-01', end: '2025-12-31' }
    }
  }

  const loadVisitsForList = async (businessUnitId: string, page: number = 1) => {
    try {
      const { start, end } = getDateFilterQuery()
      const offset = (page - 1) * visitsPerPage

      console.log('🔍 Loading visits for list view - Page:', page, 'Date range:', start, 'to', end)

      // Get total count first
      const { count, error: countError } = await supabase
        .from('schedule_visits')
        .select('*', { count: 'exact', head: true })
        .eq('business_unit_id', businessUnitId)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)

      if (countError) {
        console.error('Error counting visits:', countError)
        return { visits: [], total: 0 }
      }

      setTotalVisits(count || 0)

      // Get paginated visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('schedule_visits')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          assigned_employee_id,
          assigned_equipment_id,
          equipment_type,
          notes,
          job_id,
          department_id,
          status_id,
          business_unit_id
        `)
        .eq('business_unit_id', businessUnitId)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date')
        .order('start_time')
        .range(offset, offset + visitsPerPage - 1)

      if (visitsError) {
        console.error('Error loading visits:', visitsError)
        return { visits: [], total: count || 0 }
      }

      // Get related data
      let jobsData = []
      let departmentsData = []
      let statusesData = []
      
      if (visitsData && visitsData.length > 0) {
        const jobIds = [...new Set(visitsData.map(v => v.job_id))]
        const deptIds = [...new Set(visitsData.map(v => v.department_id))]
        const statusIds = [...new Set(visitsData.map(v => v.status_id))]

        const [jobsResult, deptsResult, statusesResult] = await Promise.all([
          supabase.from('schedule_jobs').select('id, job_code, title').in('id', jobIds),
          supabase.from('departments').select('id, name').in('id', deptIds),
          supabase.from('visit_statuses').select('id, name').in('id', statusIds)
        ])

        jobsData = jobsResult.data || []
        departmentsData = deptsResult.data || []
        statusesData = statusesResult.data || []
      }

      const formattedEvents = visitsData.map(visit => {
        const job = jobsData.find(j => j.id === visit.job_id)
        const dept = departmentsData.find(d => d.id === visit.department_id)
        const status = statusesData.find(s => s.id === visit.status_id)
        
        return {
          id: visit.id,
          title: job?.job_code || 'Unknown Job',
          start_time: visit.start_time,
          end_time: visit.end_time,
          scheduled_date: visit.scheduled_date,
          employee_id: visit.assigned_employee_id,
          equipment_id: visit.assigned_equipment_id,
          job_code: job?.job_code || '',
          status: status?.name?.toUpperCase() || 'SCHEDULED',
          department: dept?.name || 'Unknown'
        }
      })

      console.log('🔍 Loaded visits for list view:', formattedEvents.length, 'of', count)
      return { visits: formattedEvents, total: count || 0 }

    } catch (error) {
      console.error('Error loading visits for list:', error)
      return { visits: [], total: 0 }
    }
  }

  const loadScheduleData = async () => {
    try {
      setLoading(true)

      // Convert company name from URL format to proper case
      const businessUnitName = companyName
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      console.log('🔍 Schedule Debug - URL companyName:', companyName)
      console.log('🔍 Schedule Debug - Converted businessUnitName:', businessUnitName)

      // Load business unit
      const { data: buData, error: buError } = await supabase
        .from('business_units')
        .select('id, name, business_unit_type_id')
        .eq('name', businessUnitName)
        .single()

      console.log('🔍 Schedule Debug - Found business unit:', buData)
      console.log('🔍 Schedule Debug - Looking for company name:', companyName)
      console.log('🔍 Schedule Debug - Business unit ID being used:', buData.id)
      console.log('🔍 Schedule Debug - Business unit error:', buError)

      if (buError) {
        console.error('Error loading business unit:', buError)
        return
      }

      setBusinessUnit(buData)

      // Load real employees for this business unit
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          departments!inner(name),
          job_roles!inner(name),
          employee_skills!left(
            skills!inner(name)
          )
        `)
        .eq('business_unit_id', buData.id)
        .eq('is_active', true)

      if (employeesError) {
        console.error('Error loading employees:', employeesError)
      } else {
        console.log('🔍 Schedule Debug - Raw employees data:', employeesData)
        const formattedEmployees: Employee[] = employeesData.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          department_name: emp.departments?.name || 'Unknown',
          job_role_name: emp.job_roles?.name || 'Unknown',
          skills: emp.employee_skills?.map((es: any) => es.skills?.name).filter(Boolean) || []
        }))
        console.log('🔍 Schedule Debug - Formatted employees:', formattedEmployees)
        setEmployees(formattedEmployees)
      }

      // Load real equipment for this business unit
      const equipmentData: Equipment[] = []

      // Load tanker equipment
      const { data: tankersData, error: tankersError } = await supabase
        .from('tanker_equipment')
        .select('id, equipment_name, registration_number, waste_tank_capacity_litres')
        .eq('business_unit_id', buData.id)
        .eq('is_active', true)

      if (!tankersError && tankersData) {
        tankersData.forEach(tanker => {
          equipmentData.push({
            id: tanker.id,
            name: tanker.equipment_name,
            model: tanker.registration_number || '',
            type: 'TANKER',
            capacity: tanker.waste_tank_capacity_litres
          })
        })
      }

      // Load jetvac equipment
      const { data: jetvacsData, error: jetvacsError } = await supabase
        .from('jetvac_equipment')
        .select('id, equipment_name, registration_number, pressure_psi')
        .eq('business_unit_id', buData.id)
        .eq('is_active', true)

      if (!jetvacsError && jetvacsData) {
        jetvacsData.forEach(jetvac => {
          equipmentData.push({
            id: jetvac.id,
            name: jetvac.equipment_name,
            model: jetvac.registration_number || '',
            type: 'JETVAC',
            capacity: jetvac.pressure_psi
          })
        })
      }

      setEquipment(equipmentData)

      // Load real schedule visits for this business unit
      console.log('🔍 Schedule Debug - About to query visits with business_unit_id:', buData.id)
      console.log('🔍 Schedule Debug - Today date filter:', new Date().toISOString().split('T')[0])
      
      const { data: visitsData, error: visitsError } = await supabase
        .from('schedule_visits')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          assigned_employee_id,
          assigned_equipment_id,
          equipment_type,
          notes,
          job_id,
          department_id,
          status_id,
          business_unit_id
        `)
        .eq('business_unit_id', buData.id)
        .gte('scheduled_date', '2025-09-01') // Show all visits from September onwards
        .order('scheduled_date')
        .order('start_time')

      // Get job details separately
      let jobsData = []
      let departmentsData = []
      let statusesData = []
      
      if (!visitsError && visitsData && visitsData.length > 0) {
        const jobIds = [...new Set(visitsData.map(v => v.job_id))]
        const deptIds = [...new Set(visitsData.map(v => v.department_id))]
        const statusIds = [...new Set(visitsData.map(v => v.status_id))]

        const { data: jobs } = await supabase
          .from('schedule_jobs')
          .select('id, job_code, title')
          .in('id', jobIds)

        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds)

        const { data: statuses } = await supabase
          .from('visit_statuses')
          .select('id, name')
          .in('id', statusIds)

        jobsData = jobs || []
        departmentsData = depts || []
        statusesData = statuses || []
      }

      if (visitsError) {
        console.error('Error loading visits:', visitsError)
      } else {
        console.log('🔍 Schedule Debug - Raw visits data for', buData.name, ':', visitsData)
        console.log('🔍 Schedule Debug - Business Unit ID:', buData.id)
        const formattedEvents: ScheduleEvent[] = visitsData.map(visit => {
          const job = jobsData.find(j => j.id === visit.job_id)
          const dept = departmentsData.find(d => d.id === visit.department_id)
          const status = statusesData.find(s => s.id === visit.status_id)
          
          return {
            id: visit.id,
            title: job?.job_code || 'Unknown Job',
            start_time: visit.start_time,
            end_time: visit.end_time,
            scheduled_date: visit.scheduled_date,
            employee_id: visit.assigned_employee_id,
            equipment_id: visit.assigned_equipment_id,
            job_code: job?.job_code || '',
            status: status?.name?.toUpperCase() || 'SCHEDULED',
            department: dept?.name || 'Unknown'
          }
        })
        console.log('🔍 Schedule Debug - Formatted events for', buData.name, ':', formattedEvents)
        console.log('🔍 Schedule Debug - Event count:', formattedEvents.length)
        setScheduleEvents(formattedEvents)
      }

    } catch (error) {
      console.error('Error loading schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  const showPlaceholderModal = (feature: string) => {
    setShowPlaceholder(feature)
  }

  const closePlaceholderModal = () => {
    setShowPlaceholder(null)
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('en-GB', options)
  }

  const getTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 17; hour++) {
      slots.push(`${hour}:00`)
    }
    return slots
  }

  const getDepartmentEmployees = (department: string) => {
    return employees.filter(emp => emp.department_name === department)
  }

  const getFilteredTransportResources = () => {
    const transportEmployees = getDepartmentEmployees('Transport')
    let filteredEquipment = equipment

    if (transportFilter === 'All Jetvacs') {
      filteredEquipment = equipment.filter(eq => eq.type === 'JETVAC')
    } else if (transportFilter === 'Small Jetvacs') {
      filteredEquipment = equipment.filter(eq => eq.type === 'JETVAC' && (eq.capacity || 0) < 12000)
    } else if (transportFilter === 'All Tankers') {
      filteredEquipment = equipment.filter(eq => eq.type === 'TANKER')
    } else if (transportFilter === 'Small Tankers') {
      filteredEquipment = equipment.filter(eq => eq.type === 'TANKER' && (eq.capacity || 0) < 15000)
    }

    return { employees: transportEmployees, equipment: filteredEquipment }
  }

  const getFilteredSurveyingEmployees = () => {
    const surveyingEmployees = getDepartmentEmployees('Surveying')
    if (surveyingFilter === 'All Surveyors') return surveyingEmployees
    return surveyingEmployees.filter(emp => `${emp.first_name} ${emp.last_name}` === surveyingFilter)
  }

  const getFilteredConstructionEmployees = () => {
    const constructionEmployees = getDepartmentEmployees('Construction')
    if (constructionFilter === 'All Job Types') return constructionEmployees
    return constructionEmployees.filter(emp => emp.skills.some(skill => skill.toLowerCase().includes(constructionFilter.toLowerCase())))
  }

  const getEventsForResource = (resourceId: string, resourceType: 'employee' | 'equipment') => {
    return scheduleEvents.filter(event => {
      if (resourceType === 'employee') {
        return event.employee_id === resourceId
      } else {
        return event.equipment_id === resourceId
      }
    })
  }

  const getUnscheduledForDepartment = (department: string) => {
    // Filter real schedule events by department
    const departmentEvents = scheduleEvents.filter(event => 
      event.department === department || 
      (department === 'Transport' && (event.department === 'Transport' || event.department === 'Unknown')) ||
      (department === 'Surveying' && event.department === 'Surveying') ||
      (department === 'Construction' && event.department === 'Construction')
    )
    
    // Convert to unscheduled format
    return departmentEvents.map(event => ({
      id: event.id,
      code: event.job_code,
      time: `${event.start_time} - ${event.end_time}`,
      type: event.title || event.status
    }))
  }

  const renderDepartmentSchedule = (
    department: string, 
    filter: string, 
    setFilter: (value: string) => void, 
    filterOptions: string[]
  ) => {
    let resources: any[] = []
    
    if (department === 'Transport') {
      const { employees, equipment } = getFilteredTransportResources()
      resources = [...employees, ...equipment]
    } else if (department === 'Surveying') {
      resources = getFilteredSurveyingEmployees()
    } else if (department === 'Construction') {
      resources = getFilteredConstructionEmployees()
    }

    const unscheduledItems = getUnscheduledForDepartment(department)

    return (
      <div key={department} style={{ marginBottom: '2rem' }}>
        {/* Department Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px 8px 0 0', 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            {department} Department
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#64748b' }}>Filter:</label>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  padding: '0.25rem 0.5rem', 
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                {filterOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px', backgroundColor: 'white', borderRadius: '0 0 8px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Left Resources */}
          <div style={{ padding: '1rem', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '500' }}>
              ANY TIME
            </div>
            
            {department === 'Transport' && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  DRIVERS
                </div>
                {getFilteredTransportResources().employees.map(employee => (
                  <div key={employee.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {employee.first_name} {employee.last_name}
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      {getEventsForResource(employee.id, 'employee').length}
                    </div>
                  </div>
                ))}

                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  VEHICLES
                </div>
                {getFilteredTransportResources().equipment.map(item => (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        {item.capacity?.toLocaleString()}L
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      0
                    </div>
                  </div>
                ))}
              </>
            )}

            {department !== 'Transport' && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  TEAM
                </div>
                {resources.map((employee: any) => (
                  <div key={employee.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        {employee.job_role_name}
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      {getEventsForResource(employee.id, 'employee').length}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Schedule Grid */}
          <div style={{ minHeight: '200px' }}>
            {/* Time Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
              {getTimeSlots().map(time => (
                <div key={time} style={{ 
                  padding: '0.5rem 0.25rem', 
                  textAlign: 'center', 
                  fontSize: '0.625rem', 
                  color: '#64748b',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  {time}
                </div>
              ))}
            </div>

            {/* Schedule Content */}
            <div 
              onClick={() => showPlaceholderModal(`${department} Schedule Grid - Not Yet Implemented`)}
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                {department} Schedule Grid
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                ⚠️ Not yet implemented - Interactive scheduling grid coming soon
              </p>
            </div>
          </div>

          {/* Right Unscheduled */}
          <div style={{ padding: '1rem', borderLeft: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '500' }}>
                UNSCHEDULED
              </div>
              <div style={{ 
                backgroundColor: '#ef4444', 
                color: 'white', 
                borderRadius: '50%', 
                width: '16px', 
                height: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.625rem',
                fontWeight: '600'
              }}>
                {unscheduledItems.length}
              </div>
            </div>
            
            {unscheduledItems.map(item => (
              <div 
                key={item.id}
                onClick={() => showPlaceholderModal(`${department} Unscheduled Jobs - Not Yet Implemented`)}
                style={{ 
                  padding: '0.5rem', 
                  backgroundColor: '#fef2f2', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  border: '1px dashed #ef4444',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
                  {item.code}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#991b1b' }}>
                  {item.time}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#991b1b' }}>
                  {item.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading schedule...</div>
      </div>
    )
  }

  if (!businessUnit) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load schedule data</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
            {businessUnit.name}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Schedule
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'month' | 'week' | 'day' | 'map' | 'list')}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '0.5rem 2rem 0.5rem 1rem',
                fontSize: '0.875rem',
                color: '#1f2937',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                minWidth: '120px'
              }}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="map">Map</option>
              <option value="list">List</option>
            </select>
          </div>


          <button 
            onClick={() => showPlaceholderModal('More Actions Menu - Not Yet Implemented')}
            style={{ 
              backgroundColor: 'white', 
              color: '#64748b', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
            More Actions
          </button>
        </div>
      </div>

      {/* Date Navigation - Hidden in List view */}
      {viewMode !== 'list' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => showPlaceholderModal('Date Navigation - Not Yet Implemented')}
            style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem', 
              cursor: 'pointer' 
            }}
          >
            Today
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => showPlaceholderModal('Date Navigation - Not Yet Implemented')}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px', 
                padding: '0.5rem', 
                cursor: 'pointer' 
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            
            <button 
              onClick={() => showPlaceholderModal('Date Navigation - Not Yet Implemented')}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px', 
                padding: '0.5rem', 
                cursor: 'pointer' 
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
            {formatDate(selectedDate)}
          </div>
        </div>
      )}


      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  All Visits - {businessUnit.name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
                  {totalVisits} total visits • Page {currentPage} of {Math.ceil(totalVisits / visitsPerPage)}
                </p>
              </div>
              
              {/* Date Filters */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Filter:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'custom')}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">All Visits</option>
                    <option value="today">Today Only</option>
                    <option value="week">Next 7 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                
                {dateFilter === 'custom' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                    <span style={{ color: '#64748b' }}>to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Job Code
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Department
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Date
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Time
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Assigned Employee
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Equipment
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {scheduleEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                      No visits scheduled for {businessUnit.name}
                    </td>
                  </tr>
                ) : (
                  scheduleEvents.map((event, index) => {
                    const assignedEmployee = employees.find(emp => emp.id === event.employee_id)
                    const assignedEquipment = equipment.find(eq => eq.id === event.equipment_id)
                    
                    return (
                      <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                          {event.job_code || event.title}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <span style={{ 
                            backgroundColor: event.department === 'Transport' ? '#dbeafe' : event.department === 'Surveying' ? '#dcfce7' : '#fef3c7',
                            color: event.department === 'Transport' ? '#1e40af' : event.department === 'Surveying' ? '#166534' : '#92400e',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {event.department}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(event.scheduled_date).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          {event.start_time} - {event.end_time}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          {assignedEmployee ? `${assignedEmployee.first_name} ${assignedEmployee.last_name}` : 'Unassigned'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          {assignedEquipment ? assignedEquipment.name : 'No equipment'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                          <span style={{ 
                            backgroundColor: event.status === 'COMPLETED' ? '#dcfce7' : event.status === 'IN_PROGRESS' ? '#fef3c7' : '#dbeafe',
                            color: event.status === 'COMPLETED' ? '#166534' : event.status === 'IN_PROGRESS' ? '#92400e' : '#1e40af',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {event.status.toLowerCase().replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalVisits > visitsPerPage && (
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Showing {((currentPage - 1) * visitsPerPage) + 1} to {Math.min(currentPage * visitsPerPage, totalVisits)} of {totalVisits} visits
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white',
                    color: currentPage === 1 ? '#94a3b8' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {Array.from({ length: Math.min(5, Math.ceil(totalVisits / visitsPerPage)) }, (_, i) => {
                    const pageNum = i + 1
                    const isActive = pageNum === currentPage
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          backgroundColor: isActive ? '#3b82f6' : 'white',
                          color: isActive ? 'white' : '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          minWidth: '40px'
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  {Math.ceil(totalVisits / visitsPerPage) > 5 && (
                    <>
                      <span style={{ padding: '0.5rem', color: '#64748b' }}>...</span>
                      <button
                        onClick={() => setCurrentPage(Math.ceil(totalVisits / visitsPerPage))}
                        style={{
                          backgroundColor: 'white',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        {Math.ceil(totalVisits / visitsPerPage)}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalVisits / visitsPerPage), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalVisits / visitsPerPage)}
                  style={{
                    backgroundColor: currentPage === Math.ceil(totalVisits / visitsPerPage) ? '#f1f5f9' : 'white',
                    color: currentPage === Math.ceil(totalVisits / visitsPerPage) ? '#94a3b8' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    cursor: currentPage === Math.ceil(totalVisits / visitsPerPage) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Department Schedule Views (Day/Week/Month) */}
      {viewMode !== 'list' && viewMode !== 'map' && (
        <>
          {/* Transport Department Schedule */}
          {renderDepartmentSchedule('Transport', transportFilter, setTransportFilter, transportFilterOptions)}
          
          {/* Surveying Department Schedule */}
          {renderDepartmentSchedule('Surveying', surveyingFilter, setSurveyingFilter, surveyingFilterOptions)}
          
          {/* Construction Department Schedule */}
          {renderDepartmentSchedule('Construction', constructionFilter, setConstructionFilter, constructionFilterOptions)}
        </>
      )}

      {/* Map View Placeholder */}
      {viewMode === 'map' && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
            ⚠️ Map View - Not Yet Implemented
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Interactive map showing visit locations and routes is not yet implemented. This feature will be added in a future update.
          </p>
        </div>
      )}

      {/* Placeholder Modal */}
      {showPlaceholder && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Feature Coming Soon</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>{showPlaceholder}</p>
              </div>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              ⚠️ <strong>This feature is not yet implemented.</strong> The selected functionality will include department-based filtering, 
              drag-and-drop scheduling, driver-to-vehicle assignment, and real-time updates integrated 
              with your existing backend data. This will be developed in a future update.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={closePlaceholderModal}
                style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleManagement
