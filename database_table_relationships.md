# Database Table Relationships Reference

This document maps out how each table in the database relates to other tables. It works in conjunction with `database_schema_reference.md` to provide a complete understanding of the database structure.

## Table Relationship Legend

- **1:1** = One-to-One relationship
- **1:N** = One-to-Many relationship  
- **N:M** = Many-to-Many relationship
- **FK** = Foreign Key reference
- **Self-Ref** = Self-referencing relationship

---

## Table 1: business_unit_types

**Purpose**: Master list of available business unit types that can be assigned to business units.

### Relationships:
- **1:N** → `business_units.business_unit_type_id` (FK)
  - One business unit type can be assigned to many business units
  - Example: GROUP_MANAGEMENT type can be used by "The Septics Group" and other parent companies

- **N:M** → `department_types` (via `business_unit_type_department_type_access`)
  - Many business unit types can access many department types
  - Controls which departments are available to which business unit types
  - Example: GROUP_MANAGEMENT can access EXECUTIVE, FINANCIAL, ADMINISTRATIVE departments
  - **Note**: This relationship will be manageable from within the app (admin interface)

### Business Rules:
- **Single Parent Rule**: A business unit can only have a single parent company
- **Group Management Rule**: Business units with GROUP_MANAGEMENT type cannot have a parent company (they are the top-level)
- **App Management**: Business unit types are pre-populated and cannot be managed within the app (locked for functionality)
- **Department Access Management**: The relationship between business unit types and department types will be manageable from within the app

### Current Data:
- GROUP_MANAGEMENT (Parent company that manages multiple regional business units)
- REGIONAL_SERVICE (Regional service provider business unit)

---

## Table 2: business_units

**Purpose**: Core business entities in the system, representing actual companies or business units.

### Relationships:
- **N:1** ← `business_unit_types.id` (FK: `business_unit_type_id`)
  - Many business units can be of the same type
  - Example: Multiple regional service businesses can all be REGIONAL_SERVICE type

- **1:N** → `business_unit_departments.business_unit_id` (FK)
  - One business unit can have many departments
  - Example: "The Septics Group" can have Sales, Accounts, Transport departments

- **1:N** → `users.business_unit_id` (FK)
  - One business unit can have many users
  - Example: "Yorkshire Septics" can have multiple employees, customers, etc.

- **1:N** → `properties.business_unit_id` (FK)
  - One business unit can have many properties
  - Example: "Yorkshire Septics" can have multiple properties they serve

- **Self-Ref** → `business_units.parent_business_unit_id` (FK)
  - Business units can have parent-child relationships
  - Example: "Yorkshire Septics" has "The Septics Group" as its parent
  - **Business Rule**: Only REGIONAL_SERVICE business units can have parents; GROUP_MANAGEMENT units cannot have parents

### Example Hierarchy:
```
The Septics Group (GROUP_MANAGEMENT)
├── Yorkshire Septics (REGIONAL_SERVICE)
├── [Future Regional Business] (REGIONAL_SERVICE)
└── [Future Regional Business] (REGIONAL_SERVICE)
```

---

## Table 3: contact_types

**Purpose**: Master list of available contact types for business relationships.

### Relationships:
- **1:N** → `business_contacts.contact_type_id` (FK)
  - One contact type can be used by many business contacts
  - Example: ESTATE_AGENT type can be used by multiple estate agent contacts

### Current Contact Types:
- CUSTOMER, SUPPLIER, BUSINESS_PARTNER, ESTATE_AGENT, SOLICITOR, CONTRACTOR, INSURANCE, BANK, UTILITY, REGULATORY

---

## Table 4: customer_contacts

**Purpose**: Contact information for customers (people who are customers).

### Relationships:
- **1:N** → `accounts.account_holder_id` (FK)
  - One customer contact can be the account holder for many accounts
  - Example: John Smith can be account holder for multiple accounts (if he moves properties)

- **1:N** → `account_contacts.contact_id` (FK)
  - One customer contact can be linked to many accounts in various roles
  - Example: John Smith can be account holder for one account, spouse for another

### Example Usage:
- Account holders (primary customers)
- Spouses, family members
- Additional customer contacts

---

## Table 5: supplier_contacts

**Purpose**: Contact information for suppliers (people who supply goods/services).

### Relationships:
- **1:N** → `account_contacts.contact_id` (FK)
  - One supplier contact can be linked to accounts in various roles
  - Example: Estate agent can be linked to customer accounts as ESTATE_AGENT

### Example Usage:
- Supplier company representatives
- Service providers
- Business partners

---

## Table 6: business_contacts

**Purpose**: Contact information for business relationships (partners, contractors, etc.).

### Relationships:
- **N:1** ← `contact_types.id` (FK: `contact_type_id`)
  - Many business contacts can be of the same type
  - Example: Multiple estate agents can all be ESTATE_AGENT type

- **1:N** → `account_contacts.contact_id` (FK)
  - One business contact can be linked to many accounts
  - Example: ABC Estate Agents can be linked to multiple customer accounts

### Example Usage:
- Estate agents, solicitors, contractors
- Insurance companies, banks
- Regulatory bodies

---

## Table 7: accounts

**Purpose**: Billing/contractual relationships (can have multiple properties).

### Relationships:
- **N:1** ← `customer_contacts.id` (FK: `account_holder_id`)
  - Many accounts can have the same account holder
  - Example: John Smith can have multiple accounts (if he moves properties)

- **1:N** → `properties.account_id` (FK)
  - One account can be linked to many properties
  - Example: John Smith's account can be linked to his current property and any future properties

- **1:N** → `account_contacts.account_id` (FK)
  - One account can have many contacts in various roles
  - Example: Account can have account holder, spouse, estate agent, solicitor

### Business Rules:
- **Billing Address**: Each account has one billing address (can be different from service address)
- **Account Holder**: Each account has one primary account holder
- **Multiple Properties**: Account can be linked to multiple properties over time
- **Flexible Contacts**: Account can have multiple contacts in various roles

### Example Structure:
```
John Smith's Account (DOMESTIC)
├── Billing Address: 123 Main St, York, YO1 1AA
├── Account Holder: John Smith
├── Spouse: Jane Smith
├── Estate Agent: ABC Estate Agents
└── Properties:
    ├── Current: 123 Main St, York (active)
    └── Previous: 456 Oak Ave, Leeds (inactive)
```

---

## Table 8: properties

**Purpose**: Service addresses where work is performed (one property = one account at a time).

### Relationships:
- **N:1** ← `business_units.id` (FK: `business_unit_id`)
  - Many properties can be served by the same business unit
  - Example: Yorkshire Septics serves multiple properties in Yorkshire

- **N:1** ← `accounts.id` (FK: `account_id`)
  - Many properties can be linked to the same account
  - Example: John Smith's account can be linked to multiple properties over time

- **1:N** → `tanks.property_id` (FK)
  - One property can have many tanks
  - Example: Property can have septic tank, grease trap, etc.

### Business Rules:
- **One Account Per Property**: Property can only have one account at a time
- **Property Without Account**: Property can exist without an account (when no one claims it)
- **Account Without Property**: Account can exist without properties (when account holder moves but doesn't have new property)
- **Service History**: Service history stays with property, not account

### Example Structure:
```
Property: 123 Main St, York
├── Business Unit: Yorkshire Septics
├── Account: John Smith's Account (current)
├── Property Type: DOMESTIC
├── Access Notes: "Gate on left side"
└── Tanks:
    ├── Septic Tank (5000L)
    └── Grease Trap (1000L)
```

---

## Table 9: account_contacts

**Purpose**: Links accounts to multiple contacts in various roles.

### Relationships:
- **N:1** ← `accounts.id` (FK: `account_id`)
  - Many account contacts can belong to the same account
  - Example: One account can have account holder, spouse, estate agent

- **N:1** ← Various contact tables (FK: `contact_id`)
  - Account contacts can reference customer_contacts, supplier_contacts, or business_contacts
  - Example: Account holder (customer_contact), estate agent (business_contact)

### Business Rules:
- **Multiple Contacts**: Account can have multiple contacts in various roles
- **Contact Types**: Can link to customer_contacts, supplier_contacts, or business_contacts
- **Relationship Types**: ACCOUNT_HOLDER, SPOUSE, ESTATE_AGENT, SOLICITOR, etc.
- **Primary Contact**: One contact can be marked as primary

### Example Structure:
```
Account: John Smith's Account
├── Account Holder: John Smith (customer_contact, primary)
├── Spouse: Jane Smith (customer_contact)
├── Estate Agent: ABC Estate Agents (business_contact)
└── Solicitor: XYZ Law (business_contact)
```

---

## Table 10: departments

**Purpose**: Master list of available departments that business units can select from (pre-populated template).

### Relationships:
- **N:1** ← `department_types.id` (FK: `department_type_id`)
  - Many departments can be of the same type
  - Example: Sales, Marketing, and Customer Service can all be SALES type

- **1:N** → `business_unit_departments.department_id` (FK)
  - One master department can be selected by many business units
  - Example: "Sales" department template can be used by "The Septics Group" and "Yorkshire Septics"

### Current Master Departments:
- Sales (SALES type)
- Accounts (FINANCIAL type)  
- Transport (OPERATIONAL type)
- Surveying (TECHNICAL type)
- Construction (OPERATIONAL type)
- Customer Service (SUPPORT type)
- HR (ADMINISTRATIVE type)
- Marketing & Advertising (SALES type)

---

## Table 11: business_unit_departments

**Purpose**: Links business units to departments they have selected (many-to-many relationship with additional data).

### Relationships:
- **N:1** ← `business_units.id` (FK: `business_unit_id`)
  - Many business unit departments can belong to the same business unit
  - Example: "The Septics Group" can have Sales, Accounts, Transport departments

- **N:1** ← `departments.id` (FK: `department_id`)
  - Many business unit departments can reference the same master department
  - Example: Both "The Septics Group" and "Yorkshire Septics" can have Sales departments

- **N:1** ← `users.id` (FK: `manager_user_id`)
  - Many business unit departments can have the same manager
  - Example: One user could manage Sales for multiple business units

- **Self-Ref** → `business_unit_departments.parent_department_id` (FK)
  - Business unit departments can have parent-child relationships within the same business unit
  - Example: "Transport - Fleet Management" could be a child of "Transport"

### Example Structure:
```
The Septics Group
├── Sales (manager: John Smith, phone: 01234 567890)
├── Accounts (manager: Jane Doe, phone: 01234 567891)
└── Transport (manager: Bob Wilson, phone: 01234 567892)
    └── Transport - Fleet Management (parent: Transport)

Yorkshire Septics  
├── Sales (manager: Sarah Johnson, phone: 01904 123456)
├── Accounts (manager: Mike Brown, phone: 01904 123457)
└── Transport (manager: Lisa Davis, phone: 01904 123458)
```

---

## Relationship Flow Examples

### 1. Business Unit Setup Flow:
```
business_unit_types → business_units → business_unit_departments ← departments
```

### 2. User Assignment Flow:
```
business_units → users → business_unit_departments (as manager)
```

### 3. Department Selection Flow:
```
business_unit_types → business_unit_type_department_type_access → department_types → departments → business_unit_departments
```

### 4. Customer Management Flow:
```
business_units → properties ← accounts ← customer_contacts
```

### 5. Account Contact Management Flow:
```
accounts → account_contacts ← [customer_contacts, supplier_contacts, business_contacts]
```

---

## Notes

- **Master Data**: `business_unit_types`, `department_types`, and `departments` contain master/template data
- **Instance Data**: `business_units` and `business_unit_departments` contain actual business data
- **Linking Tables**: `business_unit_type_department_type_access` and `business_unit_departments` handle many-to-many relationships
- **Self-References**: Both `business_units` and `business_unit_departments` support hierarchical structures

---

*This document will be updated as new tables are added to the schema.*
