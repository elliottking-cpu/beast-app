import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './GroupCompanySetup.css'

interface SetupData {
  logoFile: File | null
  faviconFile: File | null
  companyAddress: string
  companyCity: string
  companyPostcode: string
  generalEmail: string
  accountsEmail: string
  supportEmail: string
  customerCareEmail: string
  companyPhone: string
  yearEndMonth: string
  vatNumber: string
  companyHouseId: string
  payeNumber: string
  cisNumber: string
}

const GroupCompanySetup = () => {
  const navigate = useNavigate()
  const [accountData, setAccountData] = useState<any>(null)
  const [setupData, setSetupData] = useState<SetupData>({
    logoFile: null,
    faviconFile: null,
    companyAddress: '',
    companyCity: '',
    companyPostcode: '',
    generalEmail: '',
    accountsEmail: '',
    supportEmail: '',
    customerCareEmail: '',
    companyPhone: '',
    yearEndMonth: '',
    vatNumber: '',
    companyHouseId: '',
    payeNumber: '',
    cisNumber: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    // Get account creation data from localStorage
    const storedData = localStorage.getItem('accountCreationData')
    if (!storedData) {
      // No account data - redirect to landing page
      navigate('/')
      return
    }

    const data = JSON.parse(storedData)
    setAccountData(data)
    
    // Pre-fill Company House ID from account creation form
    setSetupData(prev => ({ 
      ...prev, 
      companyHouseId: data.formData.companyId || '' 
    }))
  }, [navigate])

  const handleGoBack = () => {
    navigate('/create-account')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSetupData(prev => ({ ...prev, [name]: value }))
    if (errors.length > 0) setErrors([])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      setSetupData(prev => ({ ...prev, [name]: files[0] }))
    }
  }

  const validateForm = () => {
    const newErrors: string[] = []
    
    if (!setupData.companyAddress.trim()) newErrors.push('Company Address is required')
    if (!setupData.companyPhone.trim()) newErrors.push('Company Phone is required')
    if (!setupData.yearEndMonth) newErrors.push('Year End Month is required')

    // Email validation for provided emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (setupData.generalEmail && !emailRegex.test(setupData.generalEmail)) {
      newErrors.push('General Email format is invalid')
    }
    if (setupData.accountsEmail && !emailRegex.test(setupData.accountsEmail)) {
      newErrors.push('Accounts Email format is invalid')
    }
    if (setupData.supportEmail && !emailRegex.test(setupData.supportEmail)) {
      newErrors.push('Support Email format is invalid')
    }
    if (setupData.customerCareEmail && !emailRegex.test(setupData.customerCareEmail)) {
      newErrors.push('Customer Care Email format is invalid')
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
      console.log('Creating complete account at final step...')
      
      // Get the stored account creation data
      const formData = accountData.formData

      // Step 1: Re-validate email and company ID
      console.log('Re-validating email and company ID...')
      
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.workEmail)
        .limit(1)

      if (userCheckError) throw userCheckError

      if (existingUser && existingUser.length > 0) {
        setErrors(['Email address was registered by someone else. Please go back and use a different email.'])
        return
      }

      const { data: existingCompany, error: companyCheckError } = await supabase
        .from('business_units')
        .select('company_registration_number')
        .eq('company_registration_number', formData.companyId)
        .limit(1)

      if (companyCheckError) throw companyCheckError

      if (existingCompany && existingCompany.length > 0) {
        setErrors(['Company House Number was registered by someone else. Please go back and use a different number.'])
        return
      }

      // Step 2: Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.workEmail,
        password: formData.password,
        options: {
          emailRedirectTo: undefined
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create authentication user')

      // Step 3: Handle file uploads FIRST
      let logoUrl = null
      if (setupData.logoFile) {
        const logoFileName = `${authData.user.id}/logo-${Date.now()}`
        const { data: logoUpload, error: logoError } = await supabase.storage
          .from('business-assets')
          .upload(logoFileName, setupData.logoFile)

        if (logoError) {
          console.warn('Logo upload failed:', logoError)
        } else {
          const { data: logoPublicUrl } = supabase.storage
            .from('business-assets')
            .getPublicUrl(logoUpload.path)
          logoUrl = logoPublicUrl.publicUrl
        }
      }

      let faviconUrl = null
      if (setupData.faviconFile) {
        const faviconFileName = `${authData.user.id}/favicon-${Date.now()}`
        const { data: faviconUpload, error: faviconError } = await supabase.storage
          .from('business-assets')
          .upload(faviconFileName, setupData.faviconFile)

        if (faviconError) {
          console.warn('Favicon upload failed:', faviconError)
        } else {
          const { data: faviconPublicUrl } = supabase.storage
            .from('business-assets')
            .getPublicUrl(faviconUpload.path)
          faviconUrl = faviconPublicUrl.publicUrl
        }
      }

      // Step 4: Create business unit with all details
      const { data: businessUnit, error: businessUnitError } = await supabase
        .from('business_units')
        .insert({
          name: formData.groupCompanyName,
          business_unit_type_id: '716008fd-932c-447f-abc2-3b1e9305bb59', // GROUP_MANAGEMENT
          company_registration_number: formData.companyId,
          address: `${setupData.companyAddress}, ${setupData.companyCity}, ${setupData.companyPostcode}`,
          phone: setupData.companyPhone,
          email: setupData.generalEmail || formData.workEmail,
          vat_number: setupData.vatNumber || null,
          tax_year_end_month: parseInt(setupData.yearEndMonth),
          logo_url: logoUrl
        })
        .select()
        .single()

      if (businessUnitError) throw businessUnitError

      // Step 5: Create user with CEO role
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.workEmail,
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type_id: '771e399d-be01-427f-bfd7-5f7019c61971', // EMPLOYEE
          job_role_id: '98711fa7-1e46-4c01-a74e-18423130fb10', // CEO
          business_unit_id: businessUnit.id
        })
        .select()
        .single()

      if (userError) throw userError

      // Step 6: Auto-assign Executive department
      const { data: executiveDept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'Executive')
        .single()

      if (deptError) throw deptError

      const { error: deptAssignError } = await supabase
        .from('business_unit_departments')
        .insert({
          business_unit_id: businessUnit.id,
          department_id: executiveDept.id,
          manager_user_id: user.id
        })

      if (deptAssignError) throw deptAssignError

      // Step 7: Store additional settings
      const settingsToStore = [
        { key: 'general_email', value: setupData.generalEmail },
        { key: 'accounts_email', value: setupData.accountsEmail },
        { key: 'support_email', value: setupData.supportEmail },
        { key: 'customer_care_email', value: setupData.customerCareEmail },
        { key: 'paye_number', value: setupData.payeNumber },
        { key: 'cis_number', value: setupData.cisNumber },
        { key: 'favicon_url', value: faviconUrl || '' }
      ].filter(setting => setting.value.trim() !== '')

      if (settingsToStore.length > 0) {
        const settingsInserts = settingsToStore.map(setting => ({
          business_unit_id: businessUnit.id,
          setting_key: setting.key,
          setting_value: setting.value,
          setting_type: 'TEXT'
        }))

        const { error: settingsError } = await supabase
          .from('business_unit_settings')
          .insert(settingsInserts)

        if (settingsError) throw settingsError
      }

      // Step 8: Update favicon if uploaded
      if (faviconUrl) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        if (favicon) {
          favicon.href = faviconUrl
        } else {
          const newFavicon = document.createElement('link')
          newFavicon.rel = 'icon'
          newFavicon.href = faviconUrl
          document.head.appendChild(newFavicon)
        }
      }

      // Clear localStorage
      localStorage.removeItem('accountCreationData')

      // Redirect to dashboard
      const companySlug = formData.groupCompanyName.toLowerCase().replace(/\s+/g, '-')
      console.log('Account creation complete! Redirecting to dashboard:', `/${companySlug}/dashboard`)
      
      setTimeout(() => {
        navigate(`/${companySlug}/dashboard`)
      }, 100)

    } catch (error) {
      console.error('Company setup error:', error)
      setErrors(['An error occurred while setting up your company. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  if (!accountData) {
    return (
      <div className="setup-loading">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="company-setup-page">
      <div className="company-setup-container">
        <div className="company-setup-card">
          <div className="company-setup-header">
            <h1>Complete Company Setup</h1>
            <p>Configure your group management company: <strong>{accountData.formData.groupCompanyName}</strong></p>
          </div>

          <form onSubmit={handleSubmit} className="company-setup-form">
            {/* Branding */}
            <div className="form-section">
              <h3>Company Branding</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="logoFile">Company Logo</label>
                  <input
                    type="file"
                    id="logoFile"
                    name="logoFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                  <small className="form-help">Upload your company logo (PNG, JPG, SVG)</small>
                </div>
                <div className="form-group">
                  <label htmlFor="faviconFile">Favicon</label>
                  <input
                    type="file"
                    id="faviconFile"
                    name="faviconFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                  <small className="form-help">Upload favicon for browser tab</small>
                </div>
              </div>
            </div>

            {/* Company Address */}
            <div className="form-section">
              <h3>Company Address Details</h3>
              <div className="form-group">
                <label htmlFor="companyAddress">Company Address *</label>
                <input
                  type="text"
                  id="companyAddress"
                  name="companyAddress"
                  value={setupData.companyAddress}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyCity">City</label>
                  <input
                    type="text"
                    id="companyCity"
                    name="companyCity"
                    value={setupData.companyCity}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="companyPostcode">Postcode</label>
                  <input
                    type="text"
                    id="companyPostcode"
                    name="companyPostcode"
                    value={setupData.companyPostcode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h3>Contact Information</h3>
              <div className="form-group">
                <label htmlFor="companyPhone">Company Phone *</label>
                <input
                  type="tel"
                  id="companyPhone"
                  name="companyPhone"
                  value={setupData.companyPhone}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="generalEmail">General Enquiries Email</label>
                  <input
                    type="email"
                    id="generalEmail"
                    name="generalEmail"
                    value={setupData.generalEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="accountsEmail">Accounts Email</label>
                  <input
                    type="email"
                    id="accountsEmail"
                    name="accountsEmail"
                    value={setupData.accountsEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="supportEmail">Support Email</label>
                  <input
                    type="email"
                    id="supportEmail"
                    name="supportEmail"
                    value={setupData.supportEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="customerCareEmail">Customer Care Email</label>
                  <input
                    type="email"
                    id="customerCareEmail"
                    name="customerCareEmail"
                    value={setupData.customerCareEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="form-section">
              <h3>Financial Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="yearEndMonth">Year End Month *</label>
                  <select
                    id="yearEndMonth"
                    name="yearEndMonth"
                    value={setupData.yearEndMonth}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select Month</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="vatNumber">VAT Number</label>
                  <input
                    type="text"
                    id="vatNumber"
                    name="vatNumber"
                    value={setupData.vatNumber}
                    onChange={handleInputChange}
                    placeholder="GB123456789"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyHouseId">Company House ID</label>
                  <input
                    type="text"
                    id="companyHouseId"
                    name="companyHouseId"
                    value={setupData.companyHouseId}
                    onChange={handleInputChange}
                    disabled={true}
                    className="readonly-field"
                  />
                  <small className="form-help">Pre-filled from registration</small>
                </div>
                <div className="form-group">
                  <label htmlFor="payeNumber">PAYE Number</label>
                  <input
                    type="text"
                    id="payeNumber"
                    name="payeNumber"
                    value={setupData.payeNumber}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="cisNumber">CIS Number</label>
                <input
                  type="text"
                  id="cisNumber"
                  name="cisNumber"
                  value={setupData.cisNumber}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
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
                ← Back to Account Details
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default GroupCompanySetup