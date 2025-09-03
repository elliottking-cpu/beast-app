import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AccountCreationForm.css'

interface FormData {
  firstName: string
  lastName: string
  workEmail: string
  workPhone: string
  personalEmail: string
  personalPhone: string
  homeAddress1: string
  homeAddress2: string
  homeAddressTown: string
  homeAddressCity: string
  homeAddressPostcode: string
  groupCompanyName: string
  companyId: string
  password: string
  confirmPassword: string
}

const AccountCreationForm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    workEmail: '',
    workPhone: '',
    personalEmail: '',
    personalPhone: '',
    homeAddress1: '',
    homeAddress2: '',
    homeAddressTown: '',
    homeAddressCity: '',
    homeAddressPostcode: '',
    groupCompanyName: '',
    companyId: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.firstName.trim()) newErrors.push('First Name is required')
    if (!formData.lastName.trim()) newErrors.push('Last Name is required')
    if (!formData.workEmail.trim()) newErrors.push('Work Email is required')
    if (!formData.workPhone.trim()) newErrors.push('Work Phone is required')
    if (!formData.homeAddress1.trim()) newErrors.push('Home Address Line 1 is required')
    if (!formData.groupCompanyName.trim()) newErrors.push('Group Company Name is required')
    if (!formData.companyId.trim()) newErrors.push('Company House Number is required')
    if (!formData.password.trim()) newErrors.push('Password is required')
    if (!formData.confirmPassword.trim()) newErrors.push('Confirm Password is required')
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.push('Passwords do not match')
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.push('Password must be at least 6 characters long')
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.workEmail && !emailRegex.test(formData.workEmail)) {
      newErrors.push('Work Email format is invalid')
    }
    if (formData.personalEmail && !emailRegex.test(formData.personalEmail)) {
      newErrors.push('Personal Email format is invalid')
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      // ONLY VALIDATION - NO DATABASE CREATION
      console.log('Validating form data (no database creation)...')
      
      // Check for existing work email in our users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.workEmail)
        .limit(1)

      if (userCheckError) throw userCheckError

      if (existingUser && existingUser.length > 0) {
        setErrors(['User already exists with this work email address'])
        return
      }

      // Check for existing company ID
      const { data: existingCompany, error: companyCheckError } = await supabase
        .from('business_units')
        .select('company_registration_number')
        .eq('company_registration_number', formData.companyId)
        .limit(1)

      if (companyCheckError) throw companyCheckError

      if (existingCompany && existingCompany.length > 0) {
        setErrors(['Company is already registered with this Company House Number'])
        return
      }

      // Store ALL form data in localStorage for final processing (NO DATABASE CREATION)
      const accountCreationData = {
        formData: formData,
        timestamp: new Date().toISOString()
      }
      
      console.log('Storing account creation data for final processing (no database records created):', accountCreationData)
      localStorage.setItem('accountCreationData', JSON.stringify(accountCreationData))

      // Redirect to company setup without creating any database records
      console.log('Proceeding to company setup (no database records created yet)...')
      setTimeout(() => {
        navigate('/company-setup')
      }, 100)

    } catch (error) {
      console.error('Account creation error:', error)
      setErrors(['An error occurred while validating your account. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    navigate('/security')
  }

  return (
    <div className="account-creation-page">
      <div className="account-creation-container">
        <div className="account-creation-card">
          <div className="account-creation-header">
            <h1>Create Your Account</h1>
            <p>Set up your group management company account</p>
          </div>

          <form onSubmit={handleSubmit} className="account-creation-form">
            {/* Personal Information */}
            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="workEmail">Work Email *</label>
                  <input
                    type="email"
                    id="workEmail"
                    name="workEmail"
                    value={formData.workEmail}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="workPhone">Work Phone *</label>
                  <input
                    type="tel"
                    id="workPhone"
                    name="workPhone"
                    value={formData.workPhone}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="personalEmail">Personal Email</label>
                  <input
                    type="email"
                    id="personalEmail"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="personalPhone">Personal Phone</label>
                  <input
                    type="tel"
                    id="personalPhone"
                    name="personalPhone"
                    value={formData.personalPhone}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Home Address */}
            <div className="form-section">
              <h3>Home Address</h3>
              <div className="form-group">
                <label htmlFor="homeAddress1">Address Line 1 *</label>
                <input
                  type="text"
                  id="homeAddress1"
                  name="homeAddress1"
                  value={formData.homeAddress1}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="homeAddress2">Address Line 2</label>
                <input
                  type="text"
                  id="homeAddress2"
                  name="homeAddress2"
                  value={formData.homeAddress2}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="homeAddressTown">Town</label>
                  <input
                    type="text"
                    id="homeAddressTown"
                    name="homeAddressTown"
                    value={formData.homeAddressTown}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="homeAddressCity">City</label>
                  <input
                    type="text"
                    id="homeAddressCity"
                    name="homeAddressCity"
                    value={formData.homeAddressCity}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="homeAddressPostcode">Postcode</label>
                  <input
                    type="text"
                    id="homeAddressPostcode"
                    name="homeAddressPostcode"
                    value={formData.homeAddressPostcode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="form-section">
              <h3>Account Security</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    required
                    disabled={isLoading}
                  />
                  <small className="form-help">Minimum 6 characters</small>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="form-section">
              <h3>Company Information</h3>
              <div className="form-group">
                <label htmlFor="groupCompanyName">Group Management Company Name *</label>
                <input
                  type="text"
                  id="groupCompanyName"
                  name="groupCompanyName"
                  value={formData.groupCompanyName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="companyId">Company House Number *</label>
                <input
                  type="text"
                  id="companyId"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleInputChange}
                  placeholder="e.g., 12345678"
                  required
                  disabled={isLoading}
                />
                <small className="form-help">
                  Your official Company House registration number
                </small>
              </div>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="error-messages">
                {errors.map((error, index) => (
                  <div key={index} className="error-message">
                    {error}
                  </div>
                ))}
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleGoBack}
                className="back-button"
                disabled={isLoading}
              >
                Go Back
              </button>
              
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Validating...' : 'Continue to Company Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AccountCreationForm
