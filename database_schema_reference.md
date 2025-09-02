# Database Schema Reference - The Septics Group FSM Application

## Overview
This document tracks the complete database schema for The Septics Group Field Service Management application. It will be updated after every schema modification to maintain a complete reference.

## Current Tables (as of latest update) - 69 Tables Total

### 1. **business_unit_types**
**Purpose**: Defines the types of business units in the system (e.g., Regional Service, Online Store, Group Management, Single Business)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Type name (e.g., "GROUP_MANAGEMENT", "REGIONAL_SERVICE")
- `description` (TEXT) - Description of the business unit type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_units.business_unit_type_id`

### 2. **business_units**
**Purpose**: Core table for all business units in the system (parent companies, regional units, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Business unit name (e.g., "The Septics Group", "Yorkshire Septics")
- `business_unit_type_id` (UUID, FK) - References business_unit_types
- `parent_business_unit_id` (UUID, FK, NULLABLE) - Self-reference for parent-child relationships
- `address` (TEXT, NULLABLE) - Business unit address
- `phone` (TEXT, NULLABLE) - Business unit phone number
- `email` (TEXT, NULLABLE) - Business unit email address
- `website` (TEXT, NULLABLE) - Business unit website URL
- `company_registration_number` (TEXT, NULLABLE) - Company registration number
- `vat_number` (TEXT, NULLABLE) - VAT registration number
- `utr_number` (TEXT, NULLABLE) - Unique Taxpayer Reference number
- `tax_year_end_month` (INTEGER, NULLABLE) - Tax year end month (1-12)
- `logo_url` (TEXT, NULLABLE) - URL to company logo
- `company_description` (TEXT, NULLABLE) - Company description
- `primary_contact_id` (UUID, FK, NULLABLE) - References users (primary contact)
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this unit is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_unit_types.id`, `users.id` (primary_contact_id)
- Self-references: `business_units.id` (parent-child)
- Referenced by: `business_unit_departments.business_unit_id`, `users.business_unit_id`, `job_role_business_unit_access.business_unit_id`, `user_landing_pages.business_unit_id`, `parent_company_setup_status.parent_business_unit_id`, `setup_task_completion.parent_business_unit_id`, `business_unit_opening_hours.business_unit_id`, `business_unit_bank_accounts.business_unit_id`, `service_areas.business_unit_id`, `business_unit_settings.business_unit_id`, `payment_terms.business_unit_id`, `business_unit_vehicles.business_unit_id`, `business_unit_equipment.business_unit_id`, `business_unit_suppliers.business_unit_id`, `business_unit_contractors.business_unit_id`, `business_unit_insurance.business_unit_id`, `business_unit_certifications.business_unit_id`, `business_unit_service_capabilities.business_unit_id`, `invoice_templates.business_unit_id`, `business_unit_documents.business_unit_id`, `business_unit_contract_template_access.business_unit_id`

**Business Rules (Enforced by Database Triggers)**:
- **GROUP_MANAGEMENT Rule**: Business units with GROUP_MANAGEMENT type cannot have a parent company
- **Parent Type Rule**: Parent business units must be of GROUP_MANAGEMENT type
- **Self-Reference Prevention**: Business units cannot be their own parent
- **Single Parent Rule**: A business unit can only have one parent company

### 3. **departments**
**Purpose**: Master list of available departments that business units can select from (pre-populated template)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Department name
- `description` (TEXT, NULLABLE) - Department description
- `department_code` (TEXT, UNIQUE, NULLABLE) - Department code/abbreviation
- `department_type_id` (UUID, FK, NULLABLE) - References department_types
- `sort_order` (INTEGER, DEFAULT: 0) - Display order in side menu
- `menu_icon` (TEXT, NULLABLE) - Icon for side menu display
- `menu_path` (TEXT, NULLABLE) - URL path for department main page
- `is_pre_populated` (BOOLEAN, DEFAULT: true) - Whether this is a pre-populated department
- `has_unique_pages` (BOOLEAN, DEFAULT: true) - Whether department has unique pages/functions
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this department is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Pre-populated Departments**:
- **Sales** - Customer acquisition, lead management, sales pipeline
- **Accounts** - Financial management, invoicing, payments, bookkeeping
- **Transport** - Fleet management, vehicle operations, driver management
- **Surveying** - Site surveys, assessments, technical evaluations
- **Construction** - Construction projects, site management, installation services

**Relationships**:
- References: `department_types.id`
- Referenced by: `business_unit_departments.department_id`

### 4. **business_unit_departments**
**Purpose**: Links business units to departments they have selected (many-to-many relationship)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK) - References departments
- `manager_user_id` (UUID, FK, NULLABLE) - References users (department manager)
- `phone` (TEXT, NULLABLE) - Department phone number
- `email` (TEXT, NULLABLE) - Department email address
- `location` (TEXT, NULLABLE) - Department location
- `budget_allocation` (DECIMAL(12,2), NULLABLE) - Budget allocation for department
- `parent_department_id` (UUID, FK, NULLABLE) - Self-reference for sub-departments
- `hierarchy_level` (INTEGER, DEFAULT: 1) - Hierarchy level in organization
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this department assignment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id`, `users.id` (manager_user_id)
- Self-references: `business_unit_departments.id` (parent-child)
- Referenced by: `users.department_id`, `business_unit_vehicles.department_id`, `business_unit_equipment.department_id`, `business_unit_suppliers.department_id`, `business_unit_contractors.department_id`, `business_unit_service_capabilities.department_id`, `department_opening_hours.department_id`, `cross_department_permissions.source_department_id`, `cross_department_permissions.target_department_id`, `department_financial_targets.department_id`, `department_expenses.department_id`, `department_equipment_assignments.department_id`, `department_vehicle_assignments.department_id`, `department_service_assignments.department_id`

### 5. **department_types**
**Purpose**: Types of departments (Executive, Operational, Support, Sales, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Department type name
- `description` (TEXT, NULLABLE) - Description of the department type
- `category` (TEXT, NULLABLE) - Category: 'EXECUTIVE', 'OPERATIONAL', 'SUPPORT', 'SALES', 'FINANCIAL', 'ADMINISTRATIVE', 'TECHNICAL'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Pre-populated Data**:
- EXECUTIVE - Executive and leadership departments
- OPERATIONAL - Core operational departments that deliver services
- SUPPORT - Support departments that enable business operations
- SALES - Sales and customer-facing departments
- FINANCIAL - Financial and accounting departments
- ADMINISTRATIVE - Administrative and HR departments
- TECHNICAL - Technical and specialized service departments

**Relationships**:
- Referenced by: `departments.department_type_id`

### 6. **department_opening_hours**
**Purpose**: Operating hours for departments (can override business unit hours)
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `day_of_week` (INTEGER) - Day of week (0=Sunday, 1=Monday, etc.)
- `open_time` (TIME, NULLABLE) - Opening time
- `close_time` (TIME, NULLABLE) - Closing time
- `is_closed` (BOOLEAN, DEFAULT: false) - Whether closed on this day
- `is_emergency_available` (BOOLEAN, DEFAULT: false) - Whether emergency service available
- `emergency_phone` (TEXT, NULLABLE) - Emergency phone number
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this schedule is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`

### 7. **cross_department_permissions**
**Purpose**: Permissions between departments within same business unit or parent
- `id` (UUID, PK) - Primary key
- `source_department_id` (UUID, FK) - References departments (source department)
- `target_department_id` (UUID, FK) - References departments (target department)
- `permission_type` (TEXT) - Type: 'READ_ONLY', 'READ_WRITE', 'FULL_ACCESS'
- `permission_scope` (TEXT) - Scope: 'DATA', 'FINANCIAL', 'OPERATIONAL', 'ALL'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this permission is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id` (both source and target)

### 7. **department_financial_targets**
**Purpose**: Financial targets and budgets for departments
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `target_year` (INTEGER) - Target year
- `target_month` (INTEGER, NULLABLE) - Target month (1-12)
- `target_type` (TEXT) - Type: 'REVENUE', 'EXPENSE', 'PROFIT', 'SALES'
- `target_amount` (DECIMAL(12,2)) - Target amount
- `actual_amount` (DECIMAL(12,2), DEFAULT: 0) - Actual amount achieved
- `target_description` (TEXT, NULLABLE) - Description of the target
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this target is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`

### 8. **department_expenses**
**Purpose**: Expense tracking for departments
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `expense_category` (TEXT) - Category: 'FUEL', 'MAINTENANCE', 'SUPPLIES', 'TRAINING'
- `expense_description` (TEXT) - Description of the expense
- `amount` (DECIMAL(10,2)) - Expense amount
- `expense_date` (DATE) - Date of expense
- `approved_by_user_id` (UUID, FK, NULLABLE) - References users (approver)
- `approved_at` (TIMESTAMPTZ, NULLABLE) - Approval timestamp
- `status` (TEXT, DEFAULT: 'PENDING') - Status: 'PENDING', 'APPROVED', 'REJECTED'
- `receipt_url` (TEXT, NULLABLE) - URL to receipt
- `notes` (TEXT, NULLABLE) - Additional notes
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this expense is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`, `users.id` (approved_by_user_id)

### 9. **department_equipment_assignments**
**Purpose**: Equipment assigned to departments
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `equipment_id` (UUID, FK) - References business_unit_equipment
- `assigned_date` (DATE) - Date equipment was assigned
- `assigned_by_user_id` (UUID, FK, NULLABLE) - References users (who assigned)
- `assignment_notes` (TEXT, NULLABLE) - Assignment notes
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this assignment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`, `business_unit_equipment.id`, `users.id` (assigned_by_user_id)

### 10. **department_vehicle_assignments**
**Purpose**: Vehicles assigned to departments
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `vehicle_id` (UUID, FK) - References business_unit_vehicles
- `assigned_date` (DATE) - Date vehicle was assigned
- `assigned_by_user_id` (UUID, FK, NULLABLE) - References users (who assigned)
- `assignment_notes` (TEXT, NULLABLE) - Assignment notes
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this assignment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`, `business_unit_vehicles.id`, `users.id` (assigned_by_user_id)

### 11. **department_service_assignments**
**Purpose**: Services that departments can provide (department-specific)
- `id` (UUID, PK) - Primary key
- `department_id` (UUID, FK) - References departments
- `service_type_id` (UUID, FK) - References service_types
- `is_capable` (BOOLEAN, DEFAULT: true) - Whether capable of providing this service
- `capability_notes` (TEXT, NULLABLE) - Notes about capability
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this assignment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `departments.id`, `service_types.id`

### 12. **user_types**
**Purpose**: Defines user categories (Customer, Employee, Subcontractor, Partner)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - User type name (e.g., "EMPLOYEE", "CUSTOMER")
- `description` (TEXT) - Description of the user type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `job_roles.user_type_id`, `users.user_type_id`

### 13. **job_roles**
**Purpose**: Specific job roles within the organization (CEO, Tanker Driver, Surveyor, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT) - Job role name (e.g., "CEO", "Tanker Driver")
- `user_type_id` (UUID, FK) - References user_types
- `description` (TEXT) - Description of the job role
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this role is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `user_types.id`
- Referenced by: `users.job_role_id`, `job_role_permissions.job_role_id`, `job_role_hierarchy.job_role_id`, `job_role_hierarchy.outranks_job_role_id`, `job_role_business_unit_access.job_role_id`, `employee_approval_workflow.requested_job_role_id`, `employee_approval_workflow.approver_job_role_id`

### 14. **users**
**Purpose**: All users in the system (employees, customers, etc.)
- `id` (UUID, PK) - Primary key
- `email` (TEXT, UNIQUE) - User's email address
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name
- `user_type_id` (UUID, FK) - References user_types
- `job_role_id` (UUID, FK) - References job_roles
- `business_unit_id` (UUID, FK, NULLABLE) - References business_units
- `department_id` (UUID, FK, NULLABLE) - References departments
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this user is active
- `last_login` (TIMESTAMPTZ, NULLABLE) - Last login timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `user_types.id`, `job_roles.id`, `business_units.id`, `departments.id`
- Referenced by: `user_landing_pages.user_id`, `employee_approval_workflow.requesting_user_id`, `employee_approval_workflow.approved_by_user_id`, `ceo_restrictions.current_ceo_user_id`, `setup_task_completion.completed_by_user_id`

### 15. **app_pages**
**Purpose**: Defines pages/sections in the application menu structure
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Page name
- `description` (TEXT) - Page description
- `page_type` (TEXT) - Type: 'AUTH', 'GROUP', 'BUSINESS_UNIT', 'PERSONAL', 'SETTINGS'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this page is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `path` (TEXT, NULLABLE) - URL path for the page
- `icon` (TEXT, NULLABLE) - Icon identifier for the page
- `parent_page_id` (UUID, FK, NULLABLE) - Self-reference for nested pages
- `sort_order` (INTEGER, DEFAULT: 0) - Display order

**Relationships**:
- Self-references: `app_pages.id` (parent-child)
- Referenced by: `permissions.app_page_id`, `user_landing_pages.landing_page_id`

### 16. **permission_types**
**Purpose**: Types of permissions (VIEW, CREATE, UPDATE, DELETE)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Permission type name
- `description` (TEXT) - Description of the permission type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `permissions.permission_type_id`

### 17. **permissions**
**Purpose**: Specific permissions for app pages
- `id` (UUID, PK) - Primary key
- `app_page_id` (UUID, FK) - References app_pages
- `description` (TEXT) - Permission description
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this permission is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `permission_type_id` (UUID, FK) - References permission_types

**Relationships**:
- References: `app_pages.id`, `permission_types.id`
- Referenced by: `job_role_permissions.permission_id`

### 18. **job_role_permissions**
**Purpose**: Links job roles to specific permissions with scope values
- `id` (UUID, PK) - Primary key
- `job_role_id` (UUID, FK) - References job_roles
- `permission_id` (UUID, FK) - References permissions
- `permission_value` (TEXT) - Scope: 'ALL', 'OWN_BUSINESS_UNIT', 'OWN_DEPARTMENT', 'NONE'
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `job_roles.id`, `permissions.id`

### 19. **job_role_hierarchy**
**Purpose**: Defines which job roles outrank others
- `id` (UUID, PK) - Primary key
- `job_role_id` (UUID, FK) - References job_roles (the role that outranks)
- `outranks_job_role_id` (UUID, FK) - References job_roles (the role being outranked)
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this hierarchy is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `job_roles.id` (both fields)

### 20. **job_role_business_unit_access**
**Purpose**: Defines which business units each job role can access
- `id` (UUID, PK) - Primary key
- `job_role_id` (UUID, FK) - References job_roles
- `business_unit_id` (UUID, FK) - References business_units
- `can_access_child_units` (BOOLEAN, DEFAULT: false) - Whether access extends to child units
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this access is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `job_roles.id`, `business_units.id`

### 21. **user_landing_pages**
**Purpose**: Defines which page each user lands on after login
- `id` (UUID, PK) - Primary key
- `user_id` (UUID, FK) - References users
- `landing_page_id` (UUID, FK) - References app_pages
- `business_unit_id` (UUID, FK, NULLABLE) - References business_units
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this landing page is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `users.id`, `app_pages.id`, `business_units.id`

### 22. **employee_approval_workflow**
**Purpose**: Tracks approval requests for job role changes
- `id` (UUID, PK) - Primary key
- `requesting_user_id` (UUID, FK) - References users (person requesting)
- `requested_job_role_id` (UUID, FK) - References job_roles (role being requested)
- `approver_job_role_id` (UUID, FK) - References job_roles (role that can approve)
- `status` (TEXT) - Status: 'PENDING', 'APPROVED', 'REJECTED'
- `notes` (TEXT, NULLABLE) - Additional notes
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `approved_at` (TIMESTAMPTZ, NULLABLE) - Approval timestamp
- `approved_by_user_id` (UUID, FK, NULLABLE) - References users (person who approved)

**Relationships**:
- References: `users.id` (requesting_user_id, approved_by_user_id), `job_roles.id` (requested_job_role_id, approver_job_role_id)

### 23. **setup_configuration**
**Purpose**: Global setup configuration for the application
- `id` (UUID, PK) - Primary key
- `setup_password` (TEXT, DEFAULT: '1234') - Password for initial setup
- `is_setup_complete` (BOOLEAN, DEFAULT: false) - Whether initial setup is complete
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

### 24. **setup_stages**
**Purpose**: Stages in the setup process
- `id` (UUID, PK) - Primary key
- `stage_name` (TEXT, UNIQUE) - Stage name
- `stage_order` (INTEGER) - Order of the stage
- `description` (TEXT) - Stage description
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this stage is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `setup_tasks.stage_id`, `parent_company_setup_status.current_stage_id`

### 25. **setup_tasks**
**Purpose**: Individual tasks within setup stages
- `id` (UUID, PK) - Primary key
- `stage_id` (UUID, FK) - References setup_stages
- `task_name` (TEXT) - Task name
- `task_description` (TEXT) - Task description
- `task_order` (INTEGER) - Order within the stage
- `is_required` (BOOLEAN, DEFAULT: true) - Whether this task is required
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this task is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `setup_stages.id`
- Referenced by: `setup_task_completion.task_id`

### 26. **parent_company_setup_status**
**Purpose**: Tracks setup progress for parent companies
- `id` (UUID, PK) - Primary key
- `parent_business_unit_id` (UUID, FK, NULLABLE) - References business_units
- `current_stage_id` (UUID, FK, NULLABLE) - References setup_stages
- `is_setup_complete` (BOOLEAN, DEFAULT: false) - Whether setup is complete
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `setup_stages.id`

### 27. **setup_task_completion**
**Purpose**: Tracks completion of setup tasks
- `id` (UUID, PK) - Primary key
- `parent_business_unit_id` (UUID, FK) - References business_units
- `task_id` (UUID, FK) - References setup_tasks
- `completed_by_user_id` (UUID, FK, NULLABLE) - References users
- `completed_at` (TIMESTAMPTZ, DEFAULT: now()) - Completion timestamp
- `notes` (TEXT, NULLABLE) - Completion notes

**Relationships**:
- References: `business_units.id`, `setup_tasks.id`, `users.id`

### 28. **ceo_restrictions**
**Purpose**: Manages CEO role restrictions and transfers
- `id` (UUID, PK) - Primary key
- `current_ceo_user_id` (UUID, FK) - References users (current CEO)
- `can_transfer_ceo` (BOOLEAN, DEFAULT: true) - Whether CEO can transfer role
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `users.id`

### 29. **contact_types**
**Purpose**: Types of contacts (Customer, Supplier, Business Partner, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Contact type name
- `description` (TEXT) - Description of the contact type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Pre-populated Contact Types**:
- CUSTOMER - Customer contacts
- SUPPLIER - Supplier contacts
- BUSINESS_PARTNER - Business partner contacts
- ESTATE_AGENT - Estate agent contacts
- SOLICITOR - Solicitor/legal contacts
- CONTRACTOR - Contractor contacts
- INSURANCE - Insurance company contacts
- BANK - Banking contacts
- UTILITY - Utility company contacts
- REGULATORY - Regulatory body contacts

**Relationships**:
- Referenced by: `business_contacts.contact_type_id`

### 30. **customer_contacts**
**Purpose**: Contact information for customers
- `id` (UUID, PK) - Primary key
- `first_name` (TEXT) - Contact's first name
- `last_name` (TEXT) - Contact's last name
- `email` (TEXT, NULLABLE) - Contact's email
- `phone` (TEXT, NULLABLE) - Contact's phone number
- `mobile` (TEXT, NULLABLE) - Contact's mobile number
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this contact is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- Referenced by: `accounts.account_holder_id`, `account_contacts.contact_id`

### 31. **supplier_contacts**
**Purpose**: Contact information for suppliers
- `id` (UUID, PK) - Primary key
- `first_name` (TEXT) - Contact's first name
- `last_name` (TEXT) - Contact's last name
- `email` (TEXT, NULLABLE) - Contact's email
- `phone` (TEXT, NULLABLE) - Contact's phone number
- `mobile` (TEXT, NULLABLE) - Contact's mobile number
- `company_name` (TEXT, NULLABLE) - Company name
- `job_title` (TEXT, NULLABLE) - Job title
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this contact is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- Referenced by: `account_contacts.contact_id`

### 32. **business_contacts**
**Purpose**: Contact information for business relationships
- `id` (UUID, PK) - Primary key
- `first_name` (TEXT) - Contact's first name
- `last_name` (TEXT) - Contact's last name
- `email` (TEXT, NULLABLE) - Contact's email
- `phone` (TEXT, NULLABLE) - Contact's phone number
- `mobile` (TEXT, NULLABLE) - Contact's mobile number
- `company_name` (TEXT, NULLABLE) - Company name
- `job_title` (TEXT, NULLABLE) - Job title
- `contact_type_id` (UUID, FK, NULLABLE) - References contact_types
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this contact is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `contact_types.id`
- Referenced by: `account_contacts.contact_id`

### 33. **accounts**
**Purpose**: Billing/contractual relationships (can have multiple properties)
- `id` (UUID, PK) - Primary key
- `account_holder_id` (UUID, FK) - References customer_contacts (primary account holder)
- `account_type` (TEXT) - Type: 'DOMESTIC' or 'COMMERCIAL'
- `billing_address` (TEXT) - Billing address (can be different from service address)
- `billing_postcode` (TEXT) - Billing postcode
- `billing_city` (TEXT, NULLABLE) - Billing city
- `billing_county` (TEXT, NULLABLE) - Billing county
- `payment_terms_days` (INTEGER, DEFAULT: 0) - Payment terms in days
- `credit_limit` (DECIMAL(12,2), NULLABLE) - Credit limit
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this account is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `customer_contacts.id` (account_holder_id)
- Referenced by: `properties.account_id`, `account_contacts.account_id`

### 34. **properties**
**Purpose**: Service addresses where work is performed (one property = one account)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units (which business unit serves this property)
- `account_id` (UUID, FK, NULLABLE) - References accounts (can be NULL - property without account)
- `address` (TEXT) - Property address
- `postcode` (TEXT) - Property postcode
- `city` (TEXT, NULLABLE) - Property city
- `county` (TEXT, NULLABLE) - Property county
- `property_type` (TEXT) - Type: 'DOMESTIC' or 'COMMERCIAL'
- `access_notes` (TEXT, NULLABLE) - Access instructions
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this property is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `accounts.id` (nullable)
- Referenced by: `tanks.property_id`

### 35. **account_contacts**
**Purpose**: Links accounts to multiple contacts (account holder, spouse, estate agent, etc.)
- `id` (UUID, PK) - Primary key
- `account_id` (UUID, FK) - References accounts
- `contact_id` (UUID) - References contact (can be customer_contacts, supplier_contacts, or business_contacts)
- `contact_type` (TEXT) - Type: 'CUSTOMER', 'SUPPLIER', 'BUSINESS'
- `relationship_type` (TEXT) - Relationship: 'ACCOUNT_HOLDER', 'SPOUSE', 'ESTATE_AGENT', 'SOLICITOR', etc.
- `is_primary_contact` (BOOLEAN, DEFAULT: false) - Whether this is the primary contact
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this relationship is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `accounts.id`
- Referenced by: Various contact tables via contact_id

### 33. **tank_types**
**Purpose**: Types of tanks (Septic, Grease Trap, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Tank type name
- `description` (TEXT) - Description of the tank type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `tanks.tank_type_id`

### 34. **tanks**
**Purpose**: Individual tanks at properties
- `id` (UUID, PK) - Primary key
- `property_id` (UUID, FK) - References properties
- `tank_type_id` (UUID, FK) - References tank_types
- `tank_name` (TEXT, NULLABLE) - Custom tank name
- `capacity_litres` (INTEGER, NULLABLE) - Tank capacity
- `installation_date` (DATE, NULLABLE) - Installation date
- `last_service_date` (DATE, NULLABLE) - Last service date
- `next_service_date` (DATE, NULLABLE) - Next scheduled service date
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this tank is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `properties.id`, `tank_types.id`
- Referenced by: `tank_equipment.tank_id`

### 35. **tank_equipment**
**Purpose**: Equipment associated with tanks
- `id` (UUID, PK) - Primary key
- `tank_id` (UUID, FK) - References tanks
- `equipment_type` (TEXT) - Type of equipment
- `equipment_name` (TEXT) - Equipment name
- `model` (TEXT, NULLABLE) - Equipment model
- `serial_number` (TEXT, NULLABLE) - Equipment serial number
- `installation_date` (DATE, NULLABLE) - Installation date
- `last_service_date` (DATE, NULLABLE) - Last service date
- `next_service_date` (DATE, NULLABLE) - Next scheduled service date
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this equipment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `tanks.id`

### 36. **customer_portal_users**
**Purpose**: Separate user accounts for customer portal access
- `id` (UUID, PK) - Primary key
- `email` (TEXT, UNIQUE) - User's email
- `password_hash` (TEXT) - Hashed password
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this user is active
- `last_login` (TIMESTAMPTZ, NULLABLE) - Last login timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp
- `contact_id` (UUID, FK, NULLABLE) - References contacts

**Relationships**:
- References: `contacts.id`

### 37. **business_unit_opening_hours**
**Purpose**: Daily operating hours for each business unit
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `day_of_week` (INTEGER) - Day of week (0=Sunday, 1=Monday, etc.)
- `open_time` (TIME, NULLABLE) - Opening time
- `close_time` (TIME, NULLABLE) - Closing time
- `is_closed` (BOOLEAN, DEFAULT: false) - Whether closed on this day
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this schedule is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 38. **business_unit_bank_accounts**
**Purpose**: Multiple bank accounts for each business unit
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `account_name` (TEXT) - Name/description of the account
- `bank_name` (TEXT) - Bank name
- `account_number` (TEXT) - Bank account number
- `sort_code` (TEXT) - Bank sort code
- `iban` (TEXT, NULLABLE) - International Bank Account Number
- `swift_code` (TEXT, NULLABLE) - SWIFT/BIC code
- `is_primary` (BOOLEAN, DEFAULT: false) - Whether this is the primary account
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this account is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 39. **service_areas**
**Purpose**: Geographic service areas for each business unit
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `area_name` (TEXT) - Name of the service area
- `postcode_prefix` (TEXT, NULLABLE) - Postcode prefix for the area
- `county` (TEXT, NULLABLE) - County name
- `region` (TEXT, NULLABLE) - Region name
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this area is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 40. **business_unit_settings**
**Purpose**: Various settings and configurations for each business unit
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `setting_key` (TEXT) - Setting identifier
- `setting_value` (TEXT, NULLABLE) - Setting value
- `setting_type` (TEXT, DEFAULT: 'TEXT') - Type: 'TEXT', 'BOOLEAN', 'INTEGER', 'JSON'
- `description` (TEXT, NULLABLE) - Setting description
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this setting is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 41. **payment_terms**
**Purpose**: Payment terms for different customer types at group level
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `customer_type` (TEXT) - Type: 'DOMESTIC' or 'COMMERCIAL'
- `payment_days` (INTEGER, DEFAULT: 0) - Number of days for payment
- `description` (TEXT, NULLABLE) - Description of payment terms
- `is_active` (BOOLEAN, DEFAULT: true) - Whether these terms are active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 42. **vehicle_types**
**Purpose**: Types of vehicles in the fleet (Tanker, Van, Jet Vac, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Vehicle type name
- `description` (TEXT) - Description of the vehicle type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_vehicles.vehicle_type_id`

### 43. **business_unit_vehicles**
**Purpose**: Fleet management for business units (tankers, vans, etc.)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK) - References departments
- `vehicle_type_id` (UUID, FK) - References vehicle_types
- `registration_number` (TEXT) - Vehicle registration number
- `make` (TEXT, NULLABLE) - Vehicle make
- `model` (TEXT, NULLABLE) - Vehicle model
- `year` (INTEGER, NULLABLE) - Vehicle year
- `capacity_litres` (INTEGER, NULLABLE) - Tank capacity for tankers
- `fuel_type` (TEXT, NULLABLE) - Fuel type
- `insurance_expiry_date` (DATE, NULLABLE) - Insurance expiry date
- `mot_expiry_date` (DATE, NULLABLE) - MOT expiry date
- `service_due_date` (DATE, NULLABLE) - Next service due date
- `last_service_date` (DATE, NULLABLE) - Last service date
- `is_available` (BOOLEAN, DEFAULT: true) - Whether vehicle is available
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this vehicle is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id`, `vehicle_types.id`

### 44. **equipment_types**
**Purpose**: Types of equipment (Tools, Plant, Jet Vac, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Equipment type name
- `description` (TEXT) - Description of the equipment type
- `category` (TEXT, NULLABLE) - Category: 'TOOLS', 'PLANT', 'JETVAC'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_equipment.equipment_type_id`

### 45. **business_unit_equipment**
**Purpose**: Plant equipment, tools, and machinery for business units
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK) - References departments
- `equipment_type_id` (UUID, FK) - References equipment_types
- `equipment_name` (TEXT) - Equipment name
- `serial_number` (TEXT, NULLABLE) - Equipment serial number
- `model` (TEXT, NULLABLE) - Equipment model
- `purchase_date` (DATE, NULLABLE) - Purchase date
- `purchase_cost` (DECIMAL(10,2), NULLABLE) - Purchase cost
- `warranty_expiry_date` (DATE, NULLABLE) - Warranty expiry date
- `last_service_date` (DATE, NULLABLE) - Last service date
- `next_service_date` (DATE, NULLABLE) - Next service date
- `is_available` (BOOLEAN, DEFAULT: true) - Whether equipment is available
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this equipment is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id`, `equipment_types.id`

### 46. **supplier_types**
**Purpose**: Types of suppliers (Parts, Fuel, Insurance, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Supplier type name
- `description` (TEXT) - Description of the supplier type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_suppliers.supplier_type_id`

### 47. **business_unit_suppliers**
**Purpose**: Suppliers for business units (can be business unit or department level)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK, NULLABLE) - References departments (NULL for business unit level)
- `supplier_type_id` (UUID, FK) - References supplier_types
- `supplier_name` (TEXT) - Supplier name
- `contact_person` (TEXT, NULLABLE) - Contact person name
- `email` (TEXT, NULLABLE) - Supplier email
- `phone` (TEXT, NULLABLE) - Supplier phone
- `address` (TEXT, NULLABLE) - Supplier address
- `account_number` (TEXT, NULLABLE) - Account number with supplier
- `payment_terms` (INTEGER, DEFAULT: 30) - Payment terms in days
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this supplier is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id` (nullable), `supplier_types.id`

### 48. **contractor_types**
**Purpose**: Types of contractors (Subcontractors, Partners, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Contractor type name
- `description` (TEXT) - Description of the contractor type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_contractors.contractor_type_id`

### 49. **business_unit_contractors**
**Purpose**: Contractors and partners for business units (can be business unit or department level)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK, NULLABLE) - References departments (NULL for business unit level)
- `contractor_type_id` (UUID, FK) - References contractor_types
- `contractor_name` (TEXT) - Contractor name
- `contact_person` (TEXT, NULLABLE) - Contact person name
- `email` (TEXT, NULLABLE) - Contractor email
- `phone` (TEXT, NULLABLE) - Contractor phone
- `address` (TEXT, NULLABLE) - Contractor address
- `insurance_expiry_date` (DATE, NULLABLE) - Insurance expiry date
- `certification_expiry_date` (DATE, NULLABLE) - Certification expiry date
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this contractor is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id` (nullable), `contractor_types.id`

### 50. **insurance_types**
**Purpose**: Types of insurance (Employers Liability, Public Liability, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Insurance type name
- `description` (TEXT) - Description of the insurance type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_insurance.insurance_type_id`

### 51. **business_unit_insurance**
**Purpose**: Insurance policies for business units
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `insurance_type_id` (UUID, FK) - References insurance_types
- `policy_number` (TEXT) - Insurance policy number
- `insurer_name` (TEXT) - Insurance company name
- `start_date` (DATE) - Policy start date
- `end_date` (DATE) - Policy end date
- `premium_amount` (DECIMAL(10,2), NULLABLE) - Premium amount
- `coverage_amount` (DECIMAL(10,2), NULLABLE) - Coverage amount
- `broker_name` (TEXT, NULLABLE) - Insurance broker name
- `broker_contact` (TEXT, NULLABLE) - Broker contact details
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this policy is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `insurance_types.id`

### 52. **certification_types**
**Purpose**: Types of certifications (ISO, Waste Carrier License, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Certification type name
- `description` (TEXT) - Description of the certification type
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_certifications.certification_type_id`

### 53. **business_unit_certifications**
**Purpose**: Certifications and licenses for business units
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `certification_type_id` (UUID, FK) - References certification_types
- `certificate_number` (TEXT) - Certificate number
- `issuing_authority` (TEXT) - Issuing authority name
- `issue_date` (DATE) - Issue date
- `expiry_date` (DATE, NULLABLE) - Expiry date
- `renewal_reminder_date` (DATE, NULLABLE) - Renewal reminder date
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this certification is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `certification_types.id`

### 54. **service_types**
**Purpose**: Types of services offered (not business unit specific)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Service type name
- `description` (TEXT) - Description of the service type
- `category` (TEXT, NULLABLE) - Category: 'EMPTYING', 'INSTALLATION', 'MAINTENANCE'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_service_capabilities.service_type_id`, `tax_rates.service_type_id`

### 55. **business_unit_service_capabilities**
**Purpose**: Links business units/departments to services they can provide
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `department_id` (UUID, FK) - References departments
- `service_type_id` (UUID, FK) - References service_types
- `is_capable` (BOOLEAN, DEFAULT: true) - Whether capable of providing this service
- `notes` (TEXT, NULLABLE) - Additional notes
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this capability is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `departments.id`, `service_types.id`

### 56. **tax_rates**
**Purpose**: Tax rates for different service types (not business unit specific)
- `id` (UUID, PK) - Primary key
- `service_type_id` (UUID, FK) - References service_types
- `rate_percentage` (DECIMAL(5,2)) - Tax rate percentage
- `effective_date` (DATE) - When this rate becomes effective
- `end_date` (DATE, NULLABLE) - When this rate ends
- `description` (TEXT, NULLABLE) - Description of the tax rate
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this rate is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `service_types.id`

### 57. **invoice_templates**
**Purpose**: Invoice templates for business units
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `template_name` (TEXT) - Template name
- `template_type` (TEXT) - Type: 'STANDARD', 'PROFORMA', 'CREDIT_NOTE'
- `template_content` (TEXT, NULLABLE) - Template content (JSON or template)
- `is_default` (BOOLEAN, DEFAULT: false) - Whether this is the default template
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this template is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`

### 58. **document_types**
**Purpose**: Types of documents (Compliance, Operational, Financial, etc.)
- `id` (UUID, PK) - Primary key
- `name` (TEXT, UNIQUE) - Document type name
- `description` (TEXT) - Description of the document type
- `category` (TEXT, NULLABLE) - Category: 'COMPLIANCE', 'OPERATIONAL', 'FINANCIAL'
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this type is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- Referenced by: `business_unit_documents.document_type_id`

### 59. **business_unit_documents**
**Purpose**: Documents for business units (Waste Carrier License, Incorporation Cert, etc.)
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `document_type_id` (UUID, FK) - References document_types
- `document_name` (TEXT) - Document name
- `document_url` (TEXT, NULLABLE) - URL to document
- `issue_date` (DATE, NULLABLE) - Issue date
- `expiry_date` (DATE, NULLABLE) - Expiry date
- `renewal_reminder_date` (DATE, NULLABLE) - Renewal reminder date
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this document is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `document_types.id`

### 60. **contract_templates**
**Purpose**: Contract templates (not business unit specific)
- `id` (UUID, PK) - Primary key
- `template_name` (TEXT) - Template name
- `template_type` (TEXT) - Type: 'SERVICE_AGREEMENT', 'INSTALLATION', 'MAINTENANCE'
- `template_content` (TEXT, NULLABLE) - Template content (JSON or template)
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this template is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- Referenced by: `business_unit_contract_template_access.contract_template_id`

### 61. **business_unit_contract_template_access**
**Purpose**: Links business units to contract templates they can access
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `contract_template_id` (UUID, FK) - References contract_templates
- `is_accessible` (BOOLEAN, DEFAULT: true) - Whether template is accessible
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this access is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp

**Relationships**:
- References: `business_units.id`, `contract_templates.id`

### 62. **operators_licenses**
**Purpose**: Professional HGV operators licenses for fleet management and compliance
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `license_name` (TEXT) - License name (e.g., "The Septics Group - Operators License")
- `license_number` (TEXT, UNIQUE) - Official license number
- `transport_manager_name` (TEXT) - Name of designated transport manager
- `transport_manager_contact` (TEXT, NULLABLE) - Transport manager phone number
- `transport_manager_email` (TEXT, NULLABLE) - Transport manager email
- `max_hgv_vehicles` (INTEGER, DEFAULT: 0) - Maximum HGV vehicles allowed on license
- `current_hgv_count` (INTEGER, DEFAULT: 0) - Current number of HGVs assigned
- `issue_date` (DATE, NULLABLE) - License issue date
- `expiry_date` (DATE, NULLABLE) - License expiry date
- `issuing_authority` (TEXT, DEFAULT: 'DVSA') - Issuing authority
- `license_status` (TEXT, DEFAULT: 'ACTIVE') - Status (ACTIVE, SUSPENDED, EXPIRED, REVOKED)
- `compliance_notes` (TEXT, NULLABLE) - Compliance notes
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this license is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`
- Referenced by: `tanker_equipment.operators_license_id`

### 63. **tanker_equipment** (Updated with Professional HGV Fields)
**Purpose**: Professional HGV tanker equipment with comprehensive fleet management data
- `id` (UUID, PK) - Primary key
- `business_unit_id` (UUID, FK) - References business_units
- `equipment_name` (TEXT) - Equipment name/identifier
- `registration_number` (TEXT, NULLABLE) - Vehicle registration number

**Tank-Specific Specifications**:
- `waste_tank_capacity_litres` (INTEGER, NULLABLE) - Waste tank capacity in litres
- `has_washdown_facility` (BOOLEAN, DEFAULT: false) - Has washdown capability
- `clean_water_capacity_litres` (INTEGER, NULLABLE) - Clean water tank capacity
- `washdown_pressure_psi` (INTEGER, NULLABLE) - Washdown pressure rating

**HGV Vehicle Specifications**:
- `vehicle_tare_weight_kg` (INTEGER, NULLABLE) - Empty vehicle weight (legal requirement)
- `max_gross_weight_kg` (INTEGER, NULLABLE) - Maximum loaded weight (legal limit)
- `number_of_axles` (INTEGER, NULLABLE) - Number of axles (affects licensing)
- `number_of_seats` (INTEGER, NULLABLE) - Driver + passenger capacity
- `vehicle_width_meters` (DECIMAL(4,2), NULLABLE) - Vehicle width for route restrictions
- `vehicle_height_meters` (DECIMAL(4,2), NULLABLE) - Vehicle height for bridge clearances
- `max_hose_capacity_meters` (INTEGER, NULLABLE) - Maximum hose storage capacity

**Licensing & Compliance**:
- `operators_license_id` (UUID, FK, NULLABLE) - References operators_licenses
- `required_license_type` (TEXT, NULLABLE) - Required HGV license (Class 1/2)
- `last_8_weekly_inspection` (DATE, NULLABLE) - Last 8-weekly HGV inspection
- `next_8_weekly_inspection` (DATE, NULLABLE) - Next 8-weekly inspection due

**Insurance & Maintenance**:
- `insurance_company` (TEXT, NULLABLE) - Insurance provider
- `insurance_policy_number` (TEXT, NULLABLE) - Policy number
- `insurance_expiry_date` (DATE, NULLABLE) - Insurance expiry
- `mot_expiry_date` (DATE, NULLABLE) - MOT expiry date
- `service_due_date` (DATE, NULLABLE) - Next service due
- `last_service_date` (DATE, NULLABLE) - Last service date

**Financial & Operational**:
- `assigned_region` (TEXT, NULLABLE) - Assigned operational region
- `purchase_date` (DATE, NULLABLE) - Purchase date
- `purchase_cost` (NUMERIC, NULLABLE) - Purchase cost
- `current_value` (NUMERIC, NULLABLE) - Current asset value
- `is_operational` (BOOLEAN, DEFAULT: true) - Whether vehicle is operational
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this record is active
- `created_at` (TIMESTAMPTZ, DEFAULT: now()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT: now()) - Last update timestamp

**Relationships**:
- References: `business_units.id`, `operators_licenses.id`

## Notes and Observations

### Current Schema Strengths:
1. **Multi-tenant Architecture**: Proper business unit isolation with parent-child relationships
2. **Role-Based Access Control**: Comprehensive permission system with hierarchical job roles
3. **Setup Management**: Structured setup process with stages and tasks
4. **Customer Management**: Separate customer portal with property and tank tracking
5. **Audit Trail**: Created/updated timestamps on most tables

### Areas for Potential Expansion:
1. **Service Operations**: No tables for service visits, appointments, or work orders
2. **Financial Management**: No invoicing, payments, or pricing tables
3. **Fleet Management**: No vehicle or equipment tracking for company assets
4. **Compliance**: No regulatory compliance or documentation tracking
5. **Communication**: No messaging or notification system
6. **Reporting**: No audit logs or activity tracking beyond basic timestamps

### Key Relationships to Understand:
- **Business Unit Hierarchy**: `business_units.parent_business_unit_id` creates tree structure
- **User Access Control**: `job_role_business_unit_access` controls which units users can access
- **Permission System**: `job_role_permissions` with `permission_value` scopes access
- **Setup Flow**: `setup_stages` → `setup_tasks` → `setup_task_completion` tracks progress
- **Customer Data**: `accounts` → `contacts` → `properties` → `tanks` → `tank_equipment`

## Next Steps
This document will be updated as we expand the schema based on your business requirements. Each table can be reviewed and enhanced with additional fields, relationships, or new related tables as needed.
