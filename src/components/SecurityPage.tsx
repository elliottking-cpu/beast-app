import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './SecurityPage.css'

const SecurityPage = () => {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('Starting security check...')
      
      // Check password against setup_configuration table
      const { data, error } = await supabase
        .from('setup_configuration')
        .select('setup_password')
        .limit(1)

      console.log('Supabase response:', { data, error })
      console.log('Detailed error:', error ? JSON.stringify(error, null, 2) : 'No error')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (data && data.length > 0 && data[0].setup_password === password) {
        // Password correct - redirect to account creation
        navigate('/create-account')
      } else {
        // Password incorrect - redirect to landing page with error
        navigate('/', { state: { showError: true } })
      }
    } catch (err) {
      console.error('Security check error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    navigate('/')
  }

  return (
    <div className="security-page">
      <div className="security-container">
        <div className="security-card">
          <div className="security-header">
            <h1>Account Creation Security</h1>
            <p>Enter the security password to create a new account</p>
          </div>

          <form onSubmit={handleSubmit} className="security-form">
            <div className="form-group">
              <label htmlFor="password">Security Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter security password"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

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
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? 'Checking...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SecurityPage
