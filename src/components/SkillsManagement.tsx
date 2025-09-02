import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

import './SkillsManagement.css'

interface SkillCategory {
  id: string
  name: string
  description: string
  icon: string
  requires_license_tracking: boolean
  skillCount: number
}

interface Skill {
  id: string
  name: string
  description: string
  requires_certification: boolean
  requires_license: boolean
  license_type: string
  renewal_period_months: number
  minimum_experience_months: number
  is_regulatory_requirement: boolean
  regulatory_authority: string
  category_name: string
  category_icon: string
}

interface SkillsStats {
  totalSkills: number
  totalCategories: number
  licenseRequiredSkills: number
  regulatorySkills: number
}

const SkillsManagement = () => {
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<SkillsStats>({ totalSkills: 0, totalCategories: 0, licenseRequiredSkills: 0, regulatorySkills: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showLicenseOnly, setShowLicenseOnly] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState<string | null>(null)

  useEffect(() => {
    loadSkillsData()
  }, [])

  const loadSkillsData = async () => {
    try {
      setIsLoading(true)

      // Load skill categories with skill counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('skill_categories')
        .select(`
          id, name, description, icon, requires_license_tracking,
          skills(count)
        `)
        .order('sort_order')

      if (categoriesError) throw categoriesError

      const categoriesWithCounts = (categoriesData || []).map(cat => ({
        ...cat,
        skillCount: cat.skills?.length || 0
      }))

      setCategories(categoriesWithCounts as SkillCategory[])

      // Load all skills with category information
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select(`
          id, name, description, requires_certification, requires_license,
          license_type, renewal_period_months, minimum_experience_months,
          is_regulatory_requirement, regulatory_authority,
          skill_categories(name, icon)
        `)
        .eq('is_active', true)
        .order('name')

      if (skillsError) throw skillsError

      const skillsWithCategory = (skillsData || []).map(skill => ({
        ...skill,
        category_name: (skill.skill_categories as any)?.name || 'Uncategorized',
        category_icon: (skill.skill_categories as any)?.icon || '📋'
      }))

      setSkills(skillsWithCategory as Skill[])

      // Calculate stats
      const totalSkills = skillsData?.length || 0
      const licenseRequiredSkills = skillsData?.filter(s => s.requires_license).length || 0
      const regulatorySkills = skillsData?.filter(s => s.is_regulatory_requirement).length || 0

      setStats({
        totalSkills,
        totalCategories: categoriesData?.length || 0,
        licenseRequiredSkills,
        regulatorySkills
      })

    } catch (error) {
      console.error('Error loading skills data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSkill = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setShowAddModal(true)
  }

  const handleDeleteSkill = async (skillId: string) => {
    try {
      // Check if skill is assigned to any employees first
      const { data: assignments, error: checkError } = await supabase
        .from('employee_skills')
        .select('id')
        .eq('skill_id', skillId)
        .limit(1)

      if (checkError) throw checkError

      if (assignments && assignments.length > 0) {
        alert('Cannot delete skill - it is assigned to employees. Remove employee assignments first.')
        return
      }

      // Delete the skill
      const { error: deleteError } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId)

      if (deleteError) throw deleteError

      // Reload data
      await loadSkillsData()
      setShowDeleteConfirm(null)

    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Error deleting skill. Please try again.')
    }
  }

  const handleAssignEmployees = (skillId: string) => {
    setShowEmployeeAssignment(skillId)
  }

  const filteredSkills = skills.filter(skill => {
    const categoryMatch = filterCategory === 'all' || skill.category_name === filterCategory
    const licenseMatch = !showLicenseOnly || skill.requires_license
    return categoryMatch && licenseMatch
  })

  if (isLoading) {
    return (
      <div className="skills-loading">
        <div className="loading-spinner"></div>
        <p>Loading skills data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="skills-management">
        <div className="skills-header">
          <div className="skills-title-section">
            <h1>Skills & Certifications Management</h1>
            <p>Define employee skills, certifications, and license requirements for your operations</p>
          </div>
          
          <div className="skills-actions">
            <button 
              className="manage-categories-btn"
              onClick={() => alert('Skill category management will be implemented next')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Manage Categories
            </button>
            <button 
              className="add-skill-btn"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Skill
            </button>
          </div>
        </div>

        {/* Skills Statistics */}
        <div className="skills-stats">
          <div className="stat-card">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <h3>{stats.totalSkills}</h3>
              <p>Total Skills</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📜</div>
            <div className="stat-content">
              <h3>{stats.licenseRequiredSkills}</h3>
              <p>License Required</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏛️</div>
            <div className="stat-content">
              <h3>{stats.regulatorySkills}</h3>
              <p>Regulatory Required</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏷️</div>
            <div className="stat-content">
              <h3>{stats.totalCategories}</h3>
              <p>Skill Categories</p>
            </div>
          </div>
        </div>

        {/* Skill Categories Overview */}
        <div className="skill-categories">
          <h2>Skills by Category</h2>
          <div className="category-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-header">
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-content">
                    <h3>{category.name}</h3>
                    <p>{category.skillCount} skills</p>
                    {category.requires_license_tracking && (
                      <span className="license-badge">License Tracking</span>
                    )}
                  </div>
                  <button 
                    className="category-add-btn"
                    onClick={() => handleAddSkill(category.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <div className="category-description">
                  <p>{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills List */}
        <div className="skills-list-section">
          <div className="skills-list-header">
            <h2>Skills Inventory</h2>
            <div className="skills-filters">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={showLicenseOnly}
                  onChange={(e) => setShowLicenseOnly(e.target.checked)}
                />
                <span>License Required Only</span>
              </label>
            </div>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3>No Skills Found</h3>
              <p>Adjust your filters or add new skills to build your skills catalog.</p>
              <button 
                className="empty-state-btn"
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Skill
              </button>
            </div>
          ) : (
            <div className="skills-grid">
              {filteredSkills.map(skill => (
                <div key={skill.id} className="skill-card">
                  <div className="skill-card-header">
                    <div className="skill-category-badge">
                      {skill.category_icon} {skill.category_name}
                    </div>
                    <div className="skill-badges">
                      {skill.requires_license && (
                        <span className="badge license-badge">License Required</span>
                      )}
                      {skill.requires_certification && (
                        <span className="badge cert-badge">Certification</span>
                      )}
                      {skill.is_regulatory_requirement && (
                        <span className="badge regulatory-badge">Regulatory</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="skill-card-content">
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    
                    <div className="skill-details">
                      {skill.requires_license && (
                        <div className="skill-detail">
                          <strong>License Type:</strong> {skill.license_type?.replace(/_/g, ' ')}
                        </div>
                      )}
                      {skill.minimum_experience_months > 0 && (
                        <div className="skill-detail">
                          <strong>Min Experience:</strong> {skill.minimum_experience_months} months
                        </div>
                      )}
                      {skill.renewal_period_months && (
                        <div className="skill-detail">
                          <strong>Renewal:</strong> Every {skill.renewal_period_months} months
                        </div>
                      )}
                      {skill.regulatory_authority && (
                        <div className="skill-detail">
                          <strong>Authority:</strong> {skill.regulatory_authority}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="skill-card-actions">
                    <button className="edit-btn">Edit</button>
                    <button className="view-btn">View Details</button>
                    <button className="assign-btn" onClick={() => handleAssignEmployees(skill.id)}>
                      Assign Employees
                    </button>
                    {skill.requires_license && (
                      <button className="license-btn">Manage Licenses</button>
                    )}
                    <button className="delete-btn" onClick={() => setShowDeleteConfirm(skill.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Skill Modal */}
        {showAddModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowAddModal(false)} />
            <div className="skills-modal">
              <div className="skills-modal-header">
                <h3>Add New Skill</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="skills-modal-content">
                <div className="skill-category-selector">
                  <h4>Choose Skill Category</h4>
                  <p>Select the category for the new skill:</p>
                  
                  <div className="skill-category-grid">
                    {categories.map(category => (
                      <div 
                        key={category.id}
                        className="skill-category-card" 
                        onClick={() => {
                          alert(`${category.name} skill form will be implemented in next phase`)
                          setShowAddModal(false)
                        }}
                      >
                        <div className="skill-category-icon">{category.icon}</div>
                        <h5>{category.name}</h5>
                        <p>{category.description}</p>
                        {category.requires_license_tracking && (
                          <span className="license-tracking-badge">License Tracking</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)} />
            <div className="delete-modal">
              <div className="delete-modal-header">
                <h3>Delete Skill</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="delete-modal-content">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <h4>Are you sure you want to delete this skill?</h4>
                  <p>
                    This action cannot be undone. The skill will be permanently removed from your system.
                    Make sure no employees are assigned to this skill before deleting.
                  </p>
                </div>
                
                <div className="delete-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-delete-btn"
                    onClick={() => handleDeleteSkill(showDeleteConfirm)}
                  >
                    Delete Skill
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Employee Assignment Modal */}
        {showEmployeeAssignment && (
          <>
            <div className="modal-overlay" onClick={() => setShowEmployeeAssignment(null)} />
            <div className="assignment-modal">
              <div className="assignment-modal-header">
                <h3>Assign Employees to Skill</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowEmployeeAssignment(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="assignment-modal-content">
                <div className="assignment-placeholder">
                  <div className="placeholder-icon">👥</div>
                  <h4>Employee Assignment System</h4>
                  <p>
                    Employee assignment interface will be implemented when employee 
                    management is added to the system. This will include:
                  </p>
                  <ul>
                    <li>Select employees to assign this skill</li>
                    <li>Set proficiency levels (Trainee, Competent, Expert)</li>
                    <li>Manage license details for license-required skills</li>
                    <li>Track certification dates and renewals</li>
                    <li>Monitor compliance status</li>
                  </ul>
                  <button 
                    className="placeholder-btn"
                    onClick={() => setShowEmployeeAssignment(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default SkillsManagement
