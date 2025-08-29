# Business Flows Documentation - The Septics Group FSM Application

## Overview
This document describes the business flows that the application will need to handle. Each flow represents a complete user journey from start to finish, including the frontend pages needed, database requirements, and business rules.

## Flow Structure Template

Each business flow will follow this structure:

### Flow Name
**Purpose**: Brief description of what this flow accomplishes

**User Journey**:
1. Step 1 - What the user does
2. Step 2 - What happens next
3. Step 3 - And so on...

**Frontend Pages Needed**:
- Page 1 - Description of what this page does
- Page 2 - Description of what this page does
- Page 3 - And so on...

**Database Requirements**:
- Table 1 - What data is created/updated
- Table 2 - What relationships are established
- Table 3 - And so on...

**Business Rules**:
- Rule 1 - Validation or logic requirement
- Rule 2 - Another business rule
- Rule 3 - And so on...

**Integration Points**:
- How this flow connects to other flows
- What triggers this flow
- What this flow triggers

---

## Business Flows

### FLOW 1: New Account Creation Flow
**Purpose**: Complete user journey from landing page to group company setup and first dashboard view

**User Journey**:
1. User visits landing page showcasing app features
2. User decides to create account and clicks "Create Account" option
3. User is redirected to security page requiring password entry
4. User enters password and clicks submit
5. Backend validates password against database
6. On success: User is redirected to account creation form
7. On failure: User is redirected to landing page with "not accepting new accounts" popup
8. User fills out account creation form with personal and company details
9. Backend validates form data (email uniqueness, company ID uniqueness)
10. On validation success: Creates group management business unit and CEO user
11. User is redirected to group company setup page
12. CEO completes company setup form (logo, contact details, financial info)
13. On submit: User lands on their workspace dashboard
14. Dashboard shows locked state until child company is created

**Frontend Pages Needed**:
- Landing Page - App features showcase with "Create Account" button
- Security Page - Password entry form with submit/back options
- Account Creation Form - Personal details (first/last name, work/personal email/phone, home address), company details (group name, Company House number)
- Group Company Setup Page - Company configuration (logo, favicon, addresses, contact emails, phone, financial details: year end month, VAT, Company House ID, PAYE, CIS)
- Dashboard - Main workspace with comprehensive layout:
  * URL: /{group-company-name}/Dashboard
  * Collapsible side menu with company logo
  * Three menu sections: 
    1. Group company departments (highlighted current page)
    2. Child business units (alphabetical, blank initially)
    3. My Account (profile access)
  * Header: Business unit name, search bar, AI agent icon (opens modal), notifications icon (shows count), settings cog (user info + dark mode)
  * Main content: Locked with message "Group Company Dashboard is locked until a child company is created" + "Create Child Company" button
  * AI Agent Modal: Persistent across navigation, "AI agent not setup yet" message, non-clickable chat, close button
- Error Popup - "Not accepting new accounts" message

**Database Requirements**:
- setup_configuration - Store global security password
- business_units - Create GROUP_MANAGEMENT business unit with Company House number
- users - Create CEO user with automatic role assignment
- business_unit_settings - Store company configuration (logo, favicon, addresses, emails, financial details)
- business_unit_departments - Auto-assign Executive department to GROUP_MANAGEMENT business unit
- departments - Executive department (controls which departments are applied)
- user_landing_pages - Set dashboard as landing page for CEO
- app_pages - Dashboard page definition with lock state
- job_roles - CEO role assignment with unlimited permissions
- business_unit_types - GROUP_MANAGEMENT type reference

**Business Rules**:
- Global security password must match to proceed (temporary until payment system)
- Work email must be unique across entire system (all user types)
- Company House number (Company ID) must be unique across all business units
- One employee can only be associated with one company at a time
- CEO role is automatically assigned to account creator
- GROUP_MANAGEMENT business units automatically get Executive department
- Executive department controls department assignments for the business unit
- Dashboard is locked until child business unit is created
- No email confirmations sent (reserved for future public release)
- Company House number validation reserved for future payment system
- CEO role transfer requires login password confirmation

**Integration Points**:
- Triggers: User decision to create account
- Connected to: Business Unit Setup Flow (next step)
- Connected to: Department Management Flow (future)
- Connected to: Child Company Creation Flow (future)
- Connected to: User Permission Management Flow (future)

---

### [FLOW 2: TBD]
**Purpose**: [To be defined by user]

**User Journey**:
1. [To be defined]
2. [To be defined]
3. [To be defined]

**Frontend Pages Needed**:
- [To be defined]

**Database Requirements**:
- [To be defined]

**Business Rules**:
- [To be defined]

**Integration Points**:
- [To be defined]

---

### [FLOW 3: TBD]
**Purpose**: [To be defined by user]

**User Journey**:
1. [To be defined]
2. [To be defined]
3. [To be defined]

**Frontend Pages Needed**:
- [To be defined]

**Database Requirements**:
- [To be defined]

**Business Rules**:
- [To be defined]

**Integration Points**:
- [To be defined]

---

## Notes

- This document will be updated as business flows are defined
- Each flow should be independent but may integrate with others
- Frontend pages and database requirements should align with existing schema
- Business rules should be enforced at both frontend and database levels

---

*This document will be populated with specific business flows as defined by the user.*
