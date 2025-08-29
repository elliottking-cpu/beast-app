import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './LoginPage.css'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      if (authData.user) {
        // Get user's business unit information
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            business_unit_id,
            business_units (
              name,
              business_unit_type_id
            )
          `)
          .eq('email', email)
          .single()

        if (userError) throw userError

        if (userData && userData.business_units) {
          // Update last login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userData.id)

          // Redirect to their dashboard
          const companySlug = userData.business_units.name.toLowerCase().replace(/\s+/g, '-')
          navigate(`/${companySlug}/dashboard`)
        } else {
          throw new Error('User business unit not found')
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = () => {
    navigate('/security')
  }

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    alert('Forgot password functionality will be implemented later')
  }

  const handleGoBack = () => {
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <button className="back-to-home" onClick={handleGoBack}>
              ← Back to Home
            </button>
            <h1>Sign In</h1>
            <p>Access your Field Service Management platform</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Work Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <button 
              type="button" 
              className="link-button"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </button>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <button 
              type="button" 
              className="create-account-button"
              onClick={handleCreateAccount}
            >
              Create New Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
