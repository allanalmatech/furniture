

export type Role = 
  | 'Admin' 
  | 'ManagingDirector' 
  | 'ExecutiveDirector' 
  | 'GeneralManager' 
  | 'HRManager' 
  | 'FactoryManager'
  | 'OperationalManager'
  | 'SalesExecutive' 
  | 'SalesAgent' 
  | 'Cashier' 
  | 'StoreManager'
  | 'BidsOfficer'
  | 'ProcurementOfficer'
  | 'User';

export type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
};

export type Bid = {
  id: string;
  title: string;
  tenderNumber: string;
  client: string;
  submissionDeadline: string;
  status: 'Draft' | 'Submitted' | 'Won' | 'Lost' | 'Cancelled';
  amount: number;
  submittedBy: string;
};

export type ActivityLog = {
  id: string;
  type: "Note" | "Email" | "Call" | "Meeting" | "Stage Change";
  details: string;
  timestamp: string;
};


export type Contact = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  lastInteraction: string;
  creationDate: string;
  followUpDate: string;
  stage: "Lead" | "Prospect" | "Customer" | "Lost";
  activity: ActivityLog[];
  avatarUrl?: string;
  leadScore?: number;
};

export type Invoice = {
  id: string;
  customer: string;
  date: string;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  items: LineItem[];
  customerInfo?: {
      name: string;
      address: string;
      email: string;
  };
  recurringDetails?: {
    frequency: 'monthly' | 'quarterly' | 'annually';
    nextDate: string;
  };
};

export type Review = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  date: string;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  dueDate: string;
  status: "Not Started" | "In Progress" | "Completed" | "On Hold";
};

export type Task = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  assignee: string;
  dueDate: string;
  status: "To Do" | "In Progress" | "Done";
};

export type Milestone = {
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    dueDate: string;
    status: "Upcoming" | "Completed" | "Delayed";
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};

export type Appointment = {
  id:string;
  date: string;
  time: string;
  clientName: string;
  service: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  videoCallProvider?: "Zoom" | "Google Meet";
  videoCallLink?: string;
};

export type Inventory = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  location?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "On Leave" | "Terminated";
  department: string;
  salary?: number;
};

export type LineItem = {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Quotation = {
  id: string;
  customer: string;
  date: string;
  expiryDate: string;
  items: LineItem[];
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Pending Approval";
  signatureStatus?: "Not Requested" | "Pending" | "Signed";
  agentName?: string;
};

export type Order = {
  id: string;
  customer: string;
  date: string;
  items: LineItem[];
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Awaiting Payment";
  trackingNumber?: string;
  carrier?: string;
  agentName?: string;
  paymentMethod?: 'cash' | 'card' | 'mobile';
  totalAmount?: number;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
};

export type PurchaseOrder = {
  id: string;
  supplierName: string;
  orderDate: string;
  expectedDelivery: string;
  items: LineItem[];
  status: "Draft" | "Ordered" | "Received" | "Cancelled";
};

export type BillOfMaterial = {
  id: string;
  productName: string;
  components: {
    componentId: string;
    componentName: string;
    quantity: number;
  }[];
};

export type WorkOrder = {
  id: string;
  productName: string;
  quantity: number;
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
};

export type ProductionPlan = {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: "Draft" | "Active" | "Completed";
};

export type Ticket = {
  id: string;
  subject: string;
  customerName: string;
  createdDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
};

export type Document = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  owner: string;
  sharedWith: { email: string, role: 'Viewer' | 'Editor' }[];
};

export type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  status: "Success" | "Failure" | "Pending";
};

export type ApprovalWorkflow = {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  status: "Active" | "Inactive";
};

export type ApiKey = {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
};

export type CustomDomain = {
  id: string;
  domain: string;
  status: "Pending" | "Connected" | "Error";
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  status: 'Active' | 'Disabled';
  role: Role;
};

export type Vehicle = {
  id: string;
  name: string;
  licensePlate: string;
  model: string;
  status: "Active" | "In Shop" | "Decommissioned";
  lastService: string;
};

export type FuelLog = {
  id: string;
  vehicleName: string;
  date: string;
  gallons: number;
  cost: number;
  odometer: number;
};

export type MaintenanceSchedule = {
  id: string;
  vehicleName: string;
  serviceType: string;
  scheduledDate: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  cost?: number;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  status: "Draft" | "Sent" | "Archived" | "Scheduled";
  sentCount: number;
  openRate: string;
  clickRate: string;
  recipientIds?: string[];
  scheduledAt?: string;
  sentAt?: string;
};

export type SmsCampaign = {
  id: string;
  name: string;
  message: string;
  status: "Draft" | "Sent" | "Archived" | "Scheduled";
  sentCount: number;
  deliveryRate: string;
  recipientIds?: string[];
  scheduledAt?: string;
  sentAt?: string;
};

export type PushCampaign = {
  id: string;
  name: string;
  title: string;
  body: string;
  status: "Draft" | "Sent" | "Archived" | "Scheduled";
  sentCount: number;
  deliveryRate: string;
  clickRate: string;
  recipientIds?: string[];
  scheduledAt?: string;
  sentAt?: string;
};

export type LeaveRequest = {
  id: string;
  staffName: string;
  department: string;
  type: "Vacation" | "Sick Leave" | "Unpaid Leave";
  startDate: Date;
  endDate: Date;
  status: "Approved" | "Pending" | "Rejected";
};

export type LoanRequest = {
  id: string;
  staffName: string;
  amount: number;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected" | "Repaid";
  reason?: string;
};

export type Budget = {
  id: string;
  category: string;
  period: string;
  allocated: number;
  spent: number;
  status: "On Track" | "Over Budget" | "Under Budget";
};

export type TaxRule = {
  id: string;
  region: string;
  taxName: string;
  rate: number;
  isAutomatic: boolean;
};

export type Notification = {
  id: string;
  recipientId: string;
  type: 'task' | 'sales' | 'mention' | 'system' | 'request';
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
};

export type Workflow = {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  status: "Active" | "Draft" | "Paused";
};

export type RequestItem = {
  itemName: string;
  quantity: number;
  unit: string;
  unitCost?: number;
};

export type ApprovalStep = {
  role: Role;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp?: string;
  user?: string;
};

export type MaterialCashRequest = {
  id: string;
  title: string;
  requestType: 'cash' | 'material';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Delivered' | 'Cancelled';
  currentStage: Role;
  reason: string;
  amountOrValue: number;
  neededByDate: string;
  createdBy: string;
  createdAt: string;
  items?: RequestItem[];
  deliveryLocation?: string;
  approvalTrail: ApprovalStep[];
};

export type JobOpening = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  postedDate: string;
};

export type Applicant = {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  stage: "New" | "Screening" | "Interview" | "Offer" | "Hired";
  applicationDate: string;
};

export type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  date: Date;
  status: "Present" | "Absent" | "Holiday" | "Leave";
};

export type PerformanceReview = {
  id: string;
  staffName: string;
  managerName: string;
  reviewPeriod: string;
  status: "Pending" | "In Progress" | "Completed";
  dueDate: string;
};

export type Payslip = {
  id: string;
  staffId: string;
  staffName: string;
  period: string; // "YYYY-MM"
  grossSalary: number;
  deductions: { description: string; amount: number }[];
  netSalary: number;
  status: 'Generated' | 'Paid';
  paidDate?: string;
};

export type SalesTarget = {
  id: string;
  agentName: string;
  period: string; // YYYY-MM
  targetAmount: number;
  achievedAmount: number;
};

export type CommissionClaim = {
  id: string;
  agentName: string;
  quotationId: string;
  customerName: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  claimDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
};

export type CompanyBranding = {
  companyName: string;
  logoUrl: string;
};

export type DataSource = {
  id: 'invoices' | 'contacts' | 'orders';
  name: string;
  icon: React.ElementType;
  fields: string[];
  chartConfig: {
    category: string;
    value: string;
    valueLabel: string;
    isCurrency: boolean;
    aggregation: 'sum' | 'count';
  };
  fetcher: () => Promise<any[]>;
};

export type CustomReport = {
  id: string;
  name: string;
  dataSourceId: 'invoices' | 'contacts' | 'orders';
  selectedFields: string[];
  createdAt: string;
};

export type LocalizationSettings = {
    currency: 'UGX' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
};

export type QCChecklistItem = {
  id: string;
  check: string;
  expected: string;
};

export type QCChecklist = {
  id:string;
  productName: string;
  items: QCChecklistItem[];
};

export type QCInspectionItem = {
  checkId: string;
  check: string;
  expected: string;
  result: 'Pass' | 'Fail' | 'N/A';
  notes?: string;
}

export type QCInspection = {
  id: string;
  workOrderId: string;
  productName: string;
  inspectionDate: string;
  inspector: string;
  status: 'Pass' | 'Fail' | 'Pending';
  items: QCInspectionItem[];
};
