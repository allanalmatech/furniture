
import type { Role } from './types';

export const allPermissions = {
  "CRM": [
    { id: 'crm.view', label: 'View Contacts' },
    { id: 'crm.edit', label: 'Create & Edit Contacts' },
    { id: 'crm.delete', label: 'Delete Contacts' },
  ],
  "Projects": [
    { id: 'projects.view', label: 'View Projects' },
    { id: 'projects.edit', label: 'Create & Edit Projects' },
  ],
  "Billing": [
    { id: 'billing.manage', label: 'Manage Subscription & Billing' },
  ],
  "Team & Security": [
    { id: 'team.manage', label: 'Manage Team Members & Roles' },
  ],
};

export const defaultRolesConfig: { name: Role, description: string, permissions: string[] }[] = [
    { name: 'Admin', description: 'Full access to all features and settings. Cannot be modified.', permissions: Object.values(allPermissions).flat().map(p => p.id) },
    { name: 'ManagingDirector', description: 'Full access to all features and settings.', permissions: Object.values(allPermissions).flat().map(p => p.id) },
    { name: 'ExecutiveDirector', description: 'Full access to all features and settings.', permissions: Object.values(allPermissions).flat().map(p => p.id) },
    { name: 'GeneralManager', description: 'Broad access to most operational features.', permissions: Object.values(allPermissions).flat().map(p => p.id).filter(p => !p.startsWith('billing')) },
    { name: 'HRManager', description: 'Manages staff, leave, and recruitment.', permissions: ['team.manage'] },
    { name: 'FactoryManager', description: 'Manages manufacturing and inventory.', permissions: ['projects.view'] },
    { name: 'OperationalManager', description: 'Manages fleet and project installations.', permissions: ['projects.view', 'projects.edit'] },
    { name: 'SalesExecutive', description: 'Manages sales team and approves quotations.', permissions: ['crm.view', 'crm.edit'] },
    { name: 'SalesAgent', description: 'Creates quotations and manages their own sales.', permissions: ['crm.view', 'crm.edit'] },
    { name: 'BidsOfficer', description: 'Manages procurement and project bids.', permissions: [] },
    { name: 'ProcurementOfficer', description: 'Manages suppliers and purchase orders.', permissions: [] },
    { name: 'Cashier', description: 'Processes payments and manages point of sale.', permissions: [] },
    { name: 'StoreManager', description: 'Manages inventory and purchase orders.', permissions: [] },
    { name: 'User', description: 'Standard user with access to assigned tasks.', permissions: ['projects.view'] },
];

export const roleDisplayConfig: Record<Role, { name: string; color: string }> = {
    Admin: { name: 'Admin', color: 'bg-primary/10 text-primary' },
    ManagingDirector: { name: 'Managing Director', color: 'bg-primary/10 text-primary' },
    ExecutiveDirector: { name: 'Executive Director', color: 'bg-primary/10 text-primary' },
    GeneralManager: { name: 'General Manager', color: 'bg-blue-400/10 text-blue-500' },
    HRManager: { name: 'HR Manager', color: 'bg-indigo-400/10 text-indigo-500' },
    FactoryManager: { name: 'Factory Manager', color: 'bg-purple-400/10 text-purple-500' },
    OperationalManager: { name: 'Operational Manager', color: 'bg-pink-400/10 text-pink-500' },
    SalesExecutive: { name: 'Sales Executive', color: 'bg-orange-400/10 text-orange-500' },
    SalesAgent: { name: 'Sales Agent', color: 'bg-amber-400/10 text-amber-500' },
    BidsOfficer: { name: 'Bids Officer', color: 'bg-cyan-400/10 text-cyan-500'},
    ProcurementOfficer: { name: 'Procurement Officer', color: 'bg-lime-400/10 text-lime-500' },
    Cashier: { name: 'Cashier', color: 'bg-green-400/10 text-green-500' },
    StoreManager: { name: 'Store Manager', color: 'bg-teal-400/10 text-teal-500' },
    User: { name: 'User', color: 'bg-gray-400/10 text-gray-500' },
};
