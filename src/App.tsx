import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage.tsx'
import LoginPage from './components/LoginPage.tsx'
import SecurityPage from './components/SecurityPage.tsx'
import AccountCreationForm from './components/AccountCreationForm.tsx'
import GroupCompanySetup from './components/GroupCompanySetup.tsx'
import Dashboard from './components/Dashboard.tsx'
import DashboardLayout from './components/DashboardLayout.tsx'
import EquipmentManagement from './components/EquipmentManagement.tsx'
import SkillsManagement from './components/SkillsManagement.tsx'
import ServiceManagement from './components/ServiceManagement.tsx'
import EquipmentDetail from './components/EquipmentDetail.tsx'
import EquipmentCategoriesManagement from './components/EquipmentCategoriesManagement.tsx'
import EquipmentCategoryDetail from './components/EquipmentCategoryDetail.tsx'
import EquipmentCreationWizard from './components/EquipmentCreationWizard.tsx'
import EmployeeManagement from './components/EmployeeManagement.tsx'
import RegionalEmployees from './components/RegionalEmployees.tsx'
import AddBusinessUnit from './components/AddBusinessUnit.tsx'
import EmployeeDetail from './components/EmployeeDetail.tsx'
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
          
          {/* Dashboard Layout with nested routes */}
          <Route path="/:companyName/*" element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="equipment" element={<EquipmentManagement />} />
            <Route path="equipment/add" element={<EquipmentCreationWizard />} />
            <Route path="equipment/categories" element={<EquipmentCategoriesManagement />} />
            <Route path="equipment/categories/:categoryId" element={<EquipmentCategoryDetail />} />
            <Route path="equipment/:equipmentType/:equipmentId" element={<EquipmentDetail />} />
            <Route path="skills" element={<SkillsManagement />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route path="business-management" element={<Dashboard />} />
            <Route path="business-management/employees" element={<EmployeeManagement />} />
            <Route path="business-management/employees/:employeeId" element={<EmployeeDetail />} />
            <Route path="business-management/add-business-unit" element={<AddBusinessUnit />} />
            <Route path="executive" element={<Dashboard />} />
            <Route path="group-sales" element={<Dashboard />} />
            <Route path="group-accounts" element={<Dashboard />} />
            <Route path="group-transport" element={<Dashboard />} />
            <Route path="group-surveying" element={<Dashboard />} />
            <Route path="group-construction" element={<Dashboard />} />
            <Route path="group-hr" element={<Dashboard />} />
            <Route path="group-marketing" element={<Dashboard />} />
            <Route path="group-app-settings" element={<Dashboard />} />
            <Route path="sales" element={<Dashboard />} />
            <Route path="transport" element={<Dashboard />} />
            <Route path="surveying" element={<Dashboard />} />
            <Route path="construction" element={<Dashboard />} />
            <Route path="hr" element={<Dashboard />} />
            <Route path="hr/employees" element={<RegionalEmployees />} />
            <Route path="hr/employees/:employeeId" element={<EmployeeDetail />} />
            <Route path="accounts" element={<Dashboard />} />
            <Route index element={<Dashboard />} />
          </Route>
        </Routes>
    </Router>
  )
}

export default App
