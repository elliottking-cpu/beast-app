import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage.tsx'
import LoginPage from './components/LoginPage.tsx'
import SecurityPage from './components/SecurityPage.tsx'
import AccountCreationForm from './components/AccountCreationForm.tsx'
import GroupCompanySetup from './components/GroupCompanySetup.tsx'
import Dashboard from './components/Dashboard.tsx'
import EquipmentManagement from './components/EquipmentManagement.tsx'
import SkillsManagement from './components/SkillsManagement.tsx'
import ServiceManagement from './components/ServiceManagement.tsx'
import './App.css'

function App() {
  return (
    <Router>
              <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/create-account" element={<AccountCreationForm />} />
          <Route path="/company-setup" element={<GroupCompanySetup />} />
          <Route path="/:companyName/dashboard" element={<Dashboard />} />
          <Route path="/:companyName/equipment" element={<EquipmentManagement />} />
          <Route path="/:companyName/skills" element={<SkillsManagement />} />
          <Route path="/:companyName/services" element={<ServiceManagement />} />
        </Routes>
    </Router>
  )
}

export default App
