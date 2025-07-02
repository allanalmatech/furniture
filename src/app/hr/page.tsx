
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, CalendarCheck, UserPlus, QrCode, Star, MapPin, Briefcase, CalendarDays, Mail, Phone, Check, X, Search, Edit, Trash2, Loader2, Banknote } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StaffMember, LeaveRequest, LoanRequest, JobOpening, Applicant, AttendanceRecord, PerformanceReview, Payslip, Role } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getStaff, addStaff, updateStaff, deleteStaff, getLeaveRequests, addLeaveRequest, updateLeaveRequest, getLoanRequests, addLoanRequest, updateLoanRequest, getJobOpenings, addJobOpening, getApplicants, addApplicant, getAttendance, addAttendance, getPerformanceReviews, addPerformanceReview, getPayslips, addPayslip, updatePayslip } from "@/services/hr-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";


const staffFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  role: z.string().min(1, "Role is required."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Active", "On Leave", "Terminated"]),
  salary: z.coerce.number().min(0, "Salary must be a non-negative number.").optional(),
});
type StaffFormValues = z.infer<typeof staffFormSchema>;

const leaveRequestSchema = z.object({
    staffName: z.string().min(1, "Staff member is required."),
    type: z.enum(["Vacation", "Sick Leave", "Unpaid Leave"]),
    startDate: z.date({ required_error: "Start date is required." }),
    endDate: z.date({ required_error: "End date is required." }),
}).refine(data => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});
type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

const jobOpeningSchema = z.object({
    title: z.string().min(1, "Job title is required."),
    department: z.string().min(1, "Department is required."),
    location: z.string().min(1, "Location is required."),
    type: z.enum(["Full-time", "Part-time", "Contract"]),
});
type JobOpeningFormValues = z.infer<typeof jobOpeningSchema>;

const applicantSchema = z.object({
    name: z.string().min(1, "Applicant name is required."),
    email: z.string().email("Invalid email address."),
    phone: z.string().min(1, "Phone number is required."),
});
type ApplicantFormValues = z.infer<typeof applicantSchema>;

const performanceReviewSchema = z.object({
    staffName: z.string().min(1, "Staff member is required."),
    managerName: z.string().min(1, "Manager is required."),
    reviewPeriod: z.string().min(1, "Review period is required (e.g., Q3 2024)."),
});
type PerformanceReviewFormValues = z.infer<typeof performanceReviewSchema>;


const departments = ["All", "Engineering", "Design", "Marketing"];

const leaveTypeConfig = {
    "Vacation": { label: "Vacation", color: "bg-blue-500", style: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '0.25rem' } },
    "Sick Leave": { label: "Sick Leave", color: "bg-orange-500", style: { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))', borderRadius: '0.25rem' } },
    "Unpaid Leave": { label: "Unpaid Leave", color: "bg-gray-500", style: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderRadius: '0.25rem' } },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(amount);
};

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const IdCard = React.forwardRef<HTMLDivElement, { member: StaffMember }>(({ member }, ref) => (
    <div ref={ref} className="p-6 bg-white text-black w-[350px] mx-auto rounded-lg shadow-lg font-sans">
      <div className="flex items-center gap-4 border-b pb-4">
        <Avatar className="h-20 w-20">
            <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="person avatar"/>
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{member.name}</h2>
          <p className="text-gray-600">{member.role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm text-gray-500">ID: {member.id}</p>
          <p className="text-sm text-gray-500">Department: {member.department}</p>
          <p className="text-sm text-gray-500">Status: {member.status}</p>
        </div>
        <div className="p-2 border rounded-md">
            <QRCodeCanvas value={member.id} size={80} />
        </div>
      </div>
    </div>
  ));
IdCard.displayName = 'IdCard';

const LoanManagementView = ({ loanRequests, setLoanRequests, staff, isLoading }: { loanRequests: LoanRequest[]; setLoanRequests: React.Dispatch<React.SetStateAction<LoanRequest[]>>; staff: StaffMember[]; isLoading: boolean }) => {
    const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
    const [newLoanStaffId, setNewLoanStaffId] = useState("");
    const [newLoanAmount, setNewLoanAmount] = useState("");
    const [newLoanReason, setNewLoanReason] = useState("");
    const { toast } = useToast();

    const handleCreateLoanRequest = async () => {
        const staffMember = staff.find(s => s.id === newLoanStaffId);
        if (!staffMember || !newLoanAmount || !newLoanReason) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please select a staff member and fill out all fields.",
            });
            return;
        }

        const newRequestData: Omit<LoanRequest, 'id'> = {
            staffName: staffMember.name,
            amount: parseFloat(newLoanAmount),
            requestDate: format(new Date(), 'yyyy-MM-dd'),
            status: "Pending",
            reason: newLoanReason,
        };
        const newId = await addLoanRequest(newRequestData);
        setLoanRequests(prev => [{ id: newId, ...newRequestData }, ...prev]);
        
        toast({
            title: "Request Submitted",
            description: `Loan request for ${staffMember.name} has been submitted for approval.`,
        });

        setIsLoanDialogOpen(false);
        setNewLoanStaffId("");
        setNewLoanAmount("");
        setNewLoanReason("");
    };
    
    const handleLoanAction = async (requestId: string, status: 'Approved' | 'Rejected' | 'Repaid') => {
        await updateLoanRequest(requestId, { status });
        setLoanRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
        toast({
            title: `Loan Request ${status}`,
            description: `The request has been ${status.toLowerCase()}.`
        });
    };
    
    return (
        <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Loan & Advance Management</CardTitle>
                        <CardDescription>Track and manage employee loans and salary advances.</CardDescription>
                    </div>
                     <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Loan Request
                        </Button>
                    </DialogTrigger>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="hidden md:table-cell">Request Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>)
                            ) : loanRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.staffName}</TableCell>
                                    <TableCell>{formatCurrency(request.amount)}</TableCell>
                                    <TableCell className="hidden md:table-cell">{request.requestDate}</TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "border-transparent",
                                            request.status === "Approved" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                                            request.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                                            request.status === "Rejected" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                                            request.status === "Repaid" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                        )}>{request.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {request.status === 'Pending' ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleLoanAction(request.id, 'Approved')}><Check className="h-4 w-4 mr-1"/> Approve</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleLoanAction(request.id, 'Rejected')}><X className="h-4 w-4 mr-1"/> Reject</Button>
                                            </div>
                                        ) : request.status === 'Approved' ? (
                                             <Button size="sm" variant="outline" onClick={() => handleLoanAction(request.id, 'Repaid')}>Mark as Repaid</Button>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Loan / Advance Request</DialogTitle>
                    <DialogDescription>
                        Fill out the details below. The request will be sent for approval.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="staff-member">Staff Member</Label>
                        <Select value={newLoanStaffId} onValueChange={setNewLoanStaffId}>
                            <SelectTrigger id="staff-member">
                                <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                            <SelectContent>
                                {staff.filter(s => s.status === 'Active').map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="loan-amount">Amount</Label>
                        <Input id="loan-amount" type="number" placeholder="e.g., 1000" value={newLoanAmount} onChange={(e) => setNewLoanAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="loan-reason">Reason</Label>
                        <Textarea id="loan-reason" placeholder="Please provide a brief reason for the request..." value={newLoanReason} onChange={(e) => setNewLoanReason(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateLoanRequest}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const LeaveManagementView = ({leaveRequests, setLeaveRequests, staff, isLoading}: { leaveRequests: LeaveRequest[]; setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>; staff: StaffMember[]; isLoading: boolean}) => {
  const [month, setMonth] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const leaveForm = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema)
  });

  const onLeaveSubmit = async (values: LeaveRequestFormValues) => {
    const staffMember = staff.find(s => s.name === values.staffName);
    if (!staffMember) return;

    const newRequestData: Omit<LeaveRequest, 'id'> = {
        department: staffMember.department,
        status: "Pending",
        ...values,
    };
    const newId = await addLeaveRequest(newRequestData);
    setLeaveRequests(prev => [{ id: newId, ...newRequestData }, ...prev]);
    toast({ title: "Leave Request Submitted", description: `Request for ${values.staffName} has been submitted.` });
    setIsLeaveDialogOpen(false);
    leaveForm.reset();
  };

  const handleLeaveAction = async (requestId: string, status: 'Approved' | 'Rejected') => {
    await updateLeaveRequest(requestId, { status });
    setLeaveRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
    toast({
        title: `Leave Request ${status}`,
        description: `The request has been ${status.toLowerCase()}.`
    });
  };

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(
      (req) => (selectedDepartment === 'All' || req.department === selectedDepartment)
    );
  }, [leaveRequests, selectedDepartment]);

  const approvedLeaveRequests = useMemo(() => {
    return filteredLeaveRequests.filter(req => req.status === 'Approved');
  }, [filteredLeaveRequests]);

  const leaveDays = useMemo(() => {
    return approvedLeaveRequests.flatMap((req) =>
      eachDayOfInterval({ start: req.startDate, end: req.endDate }).map(day => ({ date: day, type: req.type }))
    );
  }, [approvedLeaveRequests]);

  const modifiers = useMemo(() => ({
    vacation: leaveDays.filter(d => d.type === 'Vacation').map(d => d.date),
    sick: leaveDays.filter(d => d.type === 'Sick Leave').map(d => d.date),
    unpaid: leaveDays.filter(d => d.type === 'Unpaid Leave').map(d => d.date),
  }), [leaveDays]);

  const modifierStyles = {
    vacation: leaveTypeConfig['Vacation'].style,
    sick: leaveTypeConfig['Sick Leave'].style,
    unpaid: leaveTypeConfig['Unpaid Leave'].style,
  };

  return (
    <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <div className="space-y-6">
            <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                <CardTitle>Leave Calendar</CardTitle>
                <CardDescription>View approved leave across different departments.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                    {departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Request Leave
                    </Button>
                </DialogTrigger>
                </div>
            </CardHeader>
            <CardContent>
                <Calendar
                    month={month}
                    onMonthChange={setMonth}
                    modifiers={modifiers}
                    modifiersStyles={modifierStyles}
                    className="rounded-md border p-0 w-full"
                />
            </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Leave Requests</CardTitle>
                    <CardDescription>Review and manage all pending leave requests.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="hidden md:table-cell">Dates</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>)
                            ) : filteredLeaveRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.staffName}</TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell className="hidden md:table-cell">{format(req.startDate, 'MMM d')} - {format(req.endDate, 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "border-transparent",
                                            req.status === "Approved" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                            req.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                                            req.status === "Rejected" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                                        )}>{req.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {req.status === 'Pending' ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleLeaveAction(req.id, 'Approved')}><Check className="h-4 w-4 mr-1"/> Approve</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleLeaveAction(req.id, 'Rejected')}><X className="h-4 w-4 mr-1"/> Reject</Button>
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>Fill out the details for your leave request.</DialogDescription>
            </DialogHeader>
            <Form {...leaveForm}>
                <form onSubmit={leaveForm.handleSubmit(onLeaveSubmit)} className="space-y-4 py-4">
                    <FormField control={leaveForm.control} name="staffName" render={({ field }) => (
                        <FormItem><FormLabel>Staff Member</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger></FormControl>
                            <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                     <FormField control={leaveForm.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger></FormControl>
                            <SelectContent>{Object.keys(leaveTypeConfig).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={leaveForm.control} name="startDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )} />
                        <FormField control={leaveForm.control} name="endDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>End Date</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )} />
                    </div>
                     <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => setIsLeaveDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Submit Request</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
};

const RecruitmentView = ({ jobOpenings, setJobOpenings, applicants, setApplicants, isLoading }: { jobOpenings: JobOpening[]; setJobOpenings: React.Dispatch<React.SetStateAction<JobOpening[]>>; applicants: Applicant[]; setApplicants: React.Dispatch<React.SetStateAction<Applicant[]>>; isLoading: boolean; }) => {
    const { toast } = useToast();
    const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
    const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
    const [isApplicantDialogOpen, setIsApplicantDialogOpen] = useState(false);

    useEffect(() => {
        if (!selectedJob && jobOpenings.length > 0) {
            setSelectedJob(jobOpenings[0]);
        }
    }, [jobOpenings, selectedJob]);

    const jobForm = useForm<JobOpeningFormValues>({ resolver: zodResolver(jobOpeningSchema) });
    const applicantForm = useForm<ApplicantFormValues>({ resolver: zodResolver(applicantSchema) });

    const onJobSubmit = async (values: JobOpeningFormValues) => {
        const newJobData: Omit<JobOpening, 'id'> = {
            ...values,
            postedDate: format(new Date(), 'yyyy-MM-dd')
        };
        const newId = await addJobOpening(newJobData);
        setJobOpenings(prev => [{id: newId, ...newJobData}, ...prev]);
        toast({ title: "Job Opening Created" });
        setIsJobDialogOpen(false);
        jobForm.reset();
    };

    const onApplicantSubmit = async (values: ApplicantFormValues) => {
        if (!selectedJob) return;
        const newApplicantData: Omit<Applicant, 'id'> = {
            jobId: selectedJob.id,
            ...values,
            stage: "New",
            applicationDate: format(new Date(), 'yyyy-MM-dd')
        };
        const newId = await addApplicant(newApplicantData);
        setApplicants(prev => [{ id: newId, ...newApplicantData }, ...prev]);
        toast({ title: "Applicant Added" });
        setIsApplicantDialogOpen(false);
        applicantForm.reset();
    };

    const handleStageChange = (applicantId: string, newStage: Applicant['stage']) => {
        setApplicants(prev => prev.map(app => app.id === applicantId ? { ...app, stage: newStage } : app));
        toast({ title: "Applicant Stage Updated" });
    };

    const applicantsForSelectedJob = useMemo(() => {
        if (!selectedJob) return [];
        return applicants.filter(app => app.jobId === selectedJob.id);
    }, [selectedJob, applicants]);

    const kanbanStages: Applicant['stage'][] = ["New", "Screening", "Interview", "Offer", "Hired"];
    
    const stageColors: { [key in Applicant['stage']]: string } = {
        New: "bg-gray-500",
        Screening: "bg-blue-500",
        Interview: "bg-purple-500",
        Offer: "bg-orange-500",
        Hired: "bg-green-500",
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Recruitment Pipeline</CardTitle>
                <CardDescription>Manage job openings and track applicants through the hiring process.</CardDescription>
            </div>
             <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Job Opening
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Job Opening</DialogTitle></DialogHeader>
                    <Form {...jobForm}><form onSubmit={jobForm.handleSubmit(onJobSubmit)} className="space-y-4">
                         <FormField control={jobForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g. Senior Developer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={jobForm.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="e.g. Engineering" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={jobForm.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g. Remote" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={jobForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="submit">Create</Button></DialogFooter>
                    </form></Form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Job Openings List */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Job Openings</h3>
            <div className="space-y-3">
              {isLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32" />) :
              jobOpenings.map(job => (
                <Card 
                  key={job.id} 
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedJob?.id === job.id ? "border-primary shadow-lg" : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <CardDescription>{job.department}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> <span>{job.location}</span></div>
                    <div className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> <span>{job.type}</span></div>
                    <div className="flex items-center gap-2"><CalendarDays className="h-3 w-3" /> <span>Posted: {job.postedDate}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {/* Applicant Kanban Board */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Applicants for: <span className="text-primary">{selectedJob?.title}</span></h3>
              <Dialog open={isApplicantDialogOpen} onOpenChange={setIsApplicantDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!selectedJob}><Plus className="mr-2 h-4 w-4" /> Add Applicant</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Applicant</DialogTitle><DialogDescription>Add a new candidate for {selectedJob?.title}</DialogDescription></DialogHeader>
                    <Form {...applicantForm}><form onSubmit={applicantForm.handleSubmit(onApplicantSubmit)} className="space-y-4">
                         <FormField control={applicantForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={applicantForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={applicantForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="submit">Add Applicant</Button></DialogFooter>
                    </form></Form>
                </DialogContent>
            </Dialog>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {kanbanStages.map(stage => {
                  const applicantsInStage = applicantsForSelectedJob.filter(app => app.stage === stage);
                  return (
                      <div key={stage} className="bg-muted/50 rounded-lg p-3">
                          <h4 className="flex items-center justify-between text-sm font-semibold mb-4">
                            <span>{stage}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full text-white", stageColors[stage])}>{applicantsInStage.length}</span>
                          </h4>
                          <div className="space-y-3">
                              {isLoading ? Array.from({length: 1}).map((_, i) => <Skeleton key={i} className="h-24" />) :
                              applicantsInStage.map(applicant => (
                                  <Card key={applicant.id} className="bg-card">
                                      <CardContent className="p-3">
                                          <div className="flex items-center gap-3">
                                              <Avatar className="h-10 w-10">
                                                  <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person avatar"/>
                                                  <AvatarFallback>{getInitials(applicant.name)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                  <p className="font-semibold text-sm">{applicant.name}</p>
                                                  <p className="text-xs text-muted-foreground">Applied: {applicant.applicationDate}</p>
                                              </div>
                                          </div>
                                      </CardContent>
                                      <CardFooter className="p-2 border-t flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-7 w-7 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Application</DropdownMenuItem>
                                                <DropdownMenuSub>
                                                  <DropdownMenuSubTrigger>Move to...</DropdownMenuSubTrigger>
                                                  <DropdownMenuSubContent>
                                                    {kanbanStages.map(s => <DropdownMenuItem key={s} onClick={() => handleStageChange(applicant.id, s)}>{s}</DropdownMenuItem>)}
                                                  </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                      </CardFooter>
                                  </Card>
                              ))}
                              {applicantsInStage.length === 0 && !isLoading && (
                                <p className="text-xs text-muted-foreground text-center py-4">No applicants</p>
                              )}
                          </div>
                      </div>
                  )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
};

const AttendanceView = ({ staff, attendance, setAttendance, isLoading }: { staff: StaffMember[]; attendance: AttendanceRecord[], setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; isLoading: boolean }) => {
    const { toast } = useToast();
    const [month, setMonth] = useState(new Date());
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isMarkingOpen, setIsMarkingOpen] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceRecord['status']>('Present');

    useEffect(() => {
        if (!selectedStaffId && staff.length > 0) {
            setSelectedStaffId(staff[0].id);
        }
    }, [staff, selectedStaffId]);

    const staffAttendance = useMemo(() => {
        return attendance.filter(att => att.staffId === selectedStaffId);
    }, [selectedStaffId, attendance]);

    const attendanceModifiers = useMemo(() => ({
        present: staffAttendance.filter(a => a.status === 'Present').map(a => a.date),
        absent: staffAttendance.filter(a => a.status === 'Absent').map(a => a.date),
        leave: staffAttendance.filter(a => a.status === 'Leave').map(a => a.date),
        holiday: attendance.filter(a => a.status === 'Holiday').map(a => a.date),
    }), [staffAttendance, attendance]);

    const attendanceModifierStyles = {
        present: { backgroundColor: 'hsl(var(--chart-2) / 0.2)', color: 'hsl(var(--chart-2))', borderRadius: '0.25rem' },
        absent: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))', borderRadius: '0.25rem' },
        leave: { backgroundColor: 'hsl(var(--accent) / 0.2)', color: 'hsl(var(--accent))', borderRadius: '0.25rem' },
        holiday: { backgroundColor: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))', borderRadius: '0.25rem' },
    };
    
    const summary = useMemo(() => {
        const currentMonth = month.getMonth();
        const currentYear = month.getFullYear();
        const attendanceThisMonth = staffAttendance.filter(att => att.date.getMonth() === currentMonth && att.date.getFullYear() === currentYear);
        return {
            present: attendanceThisMonth.filter(a => a.status === 'Present').length,
            absent: attendanceThisMonth.filter(a => a.status === 'Absent').length,
            leave: attendanceThisMonth.filter(a => a.status === 'Leave').length,
            holiday: attendance.filter(att => att.status === 'Holiday' && att.date.getMonth() === currentMonth && att.date.getFullYear() === currentYear).length,
        }
    }, [staffAttendance, month, attendance]);

    const handleMarkAttendance = async () => {
        const staffMember = staff.find(s => s.id === selectedStaffId);
        if (!staffMember) return;
        const newRecordData: Omit<AttendanceRecord, 'id'> = {
            staffId: selectedStaffId,
            staffName: staffMember.name,
            date: new Date(),
            status: attendanceStatus
        };
        const newId = await addAttendance(newRecordData);
        setAttendance(prev => [...prev, {id: newId, ...newRecordData}]);
        toast({ title: "Attendance Marked", description: `${staffMember.name} marked as ${attendanceStatus} for today.`});
        setIsMarkingOpen(false);
    };

    return (
        <Dialog open={isMarkingOpen} onOpenChange={setIsMarkingOpen}>
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Attendance Management</CardTitle>
                    <CardDescription>Track employee attendance and view records.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-full md:w-[220px]">
                            <SelectValue placeholder="Select Staff Member" />
                        </SelectTrigger>
                        <SelectContent>
                            {staff.filter(s => s.status === 'Active' || s.status === 'On Leave').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <DialogTrigger asChild><Button variant="outline">Mark Attendance</Button></DialogTrigger>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {isLoading ? <Skeleton className="w-full h-[300px]" /> :
                    <Calendar
                        month={month}
                        onMonthChange={setMonth}
                        modifiers={attendanceModifiers}
                        modifiersStyles={attendanceModifierStyles}
                        className="rounded-md border p-0"
                    />}
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Summary for {format(month, 'MMMM yyyy')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Present Days</span><span className="font-bold">{summary.present}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Absent Days</span><span className="font-bold">{summary.absent}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">On Leave</span><span className="font-bold">{summary.leave}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Holidays</span><span className="font-bold">{summary.holiday}</span></div>
                        </CardContent>
                    </Card>
                    <div>
                        <h4 className="font-medium text-sm mb-2">Legend</h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{backgroundColor: 'hsl(var(--chart-2) / 0.2)'}}></div><span>Present</span></div>
                            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{backgroundColor: 'hsl(var(--destructive) / 0.2)'}}></div><span>Absent</span></div>
                            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{backgroundColor: 'hsl(var(--accent) / 0.2)'}}></div><span>On Leave</span></div>
                            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{backgroundColor: 'hsl(var(--primary) / 0.2)'}}></div><span>Holiday</span></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mark Attendance for Today</DialogTitle>
                <DialogDescription>Mark attendance for {staff.find(s => s.id === selectedStaffId)?.name} for {format(new Date(), 'PPP')}.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label>Status</Label>
                 <Select value={attendanceStatus} onValueChange={(v) => setAttendanceStatus(v as any)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsMarkingOpen(false)}>Cancel</Button>
                <Button onClick={handleMarkAttendance}>Save</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
};

const PerformanceView = ({ reviews, setReviews, staff, managers, isLoading }: { reviews: PerformanceReview[]; setReviews: React.Dispatch<React.SetStateAction<PerformanceReview[]>>; staff: StaffMember[], managers: string[], isLoading: boolean }) => {
    const { toast } = useToast();
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const reviewForm = useForm<PerformanceReviewFormValues>({ resolver: zodResolver(performanceReviewSchema) });

    const onReviewSubmit = async (values: PerformanceReviewFormValues) => {
        const newReviewData: Omit<PerformanceReview, 'id'> = {
            ...values,
            status: "Pending",
            dueDate: format(new Date(), 'yyyy-MM-dd') // Or calculate based on period
        };
        const newId = await addPerformanceReview(newReviewData);
        setReviews(prev => [{id: newId, ...newReviewData}, ...prev]);
        toast({ title: "Performance Review Started" });
        setIsReviewDialogOpen(false);
        reviewForm.reset();
    };
    
    const handleReviewAction = (reviewId: string, status: PerformanceReview['status']) => {
        setReviews(prev => prev.map(rev => rev.id === reviewId ? { ...rev, status } : rev));
        toast({
            title: `Review Status Updated`,
            description: `The review status has been updated to ${status}.`
        });
    };
    
    return (
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Performance Reviews</CardTitle>
                    <CardDescription>Manage employee appraisals and performance reviews.</CardDescription>
                </div>
                <DialogTrigger asChild>
                    <Button>
                        <Star className="mr-2 h-4 w-4" />
                        Start New Review
                    </Button>
                </DialogTrigger>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Member</TableHead>
                            <TableHead className="hidden md:table-cell">Review Period</TableHead>
                            <TableHead className="hidden md:table-cell">Manager</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>) :
                        reviews.map((review) => (
                            <TableRow key={review.id}>
                                <TableCell className="font-medium">{review.staffName}</TableCell>
                                <TableCell className="hidden md:table-cell">{review.reviewPeriod}</TableCell>
                                <TableCell className="hidden md:table-cell">{review.managerName}</TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "border-transparent",
                                        review.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                        review.status === "In Progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                                        review.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
                                    )}>{review.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {review.status === 'Pending' && <Button variant="outline" size="sm" onClick={() => handleReviewAction(review.id, 'In Progress')}>Start Review</Button>}
                                    {review.status === 'In Progress' && <Button variant="outline" size="sm" onClick={() => handleReviewAction(review.id, 'Completed')}>Complete Review</Button>}
                                    {(review.status === 'Completed') && <Button variant="outline" size="sm">View</Button>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <DialogContent>
            <DialogHeader><DialogTitle>Start New Performance Review</DialogTitle></DialogHeader>
            <Form {...reviewForm}><form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
                <FormField control={reviewForm.control} name="staffName" render={({ field }) => (<FormItem><FormLabel>Staff Member</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl><SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={reviewForm.control} name="managerName" render={({ field }) => (<FormItem><FormLabel>Reviewing Manager</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl><SelectContent>{managers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={reviewForm.control} name="reviewPeriod" render={({ field }) => (<FormItem><FormLabel>Review Period</FormLabel><FormControl><Input placeholder="e.g. Q3 2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <DialogFooter><Button type="submit">Start Review</Button></DialogFooter>
            </form></Form>
        </DialogContent>
        </Dialog>
    );
};

const PayrollView = ({ staff, loanRequests, payslips, setPayslips, isLoading }: { staff: StaffMember[]; loanRequests: LoanRequest[]; payslips: Payslip[]; setPayslips: React.Dispatch<React.SetStateAction<Payslip[]>>; isLoading: boolean; }) => {
    const { toast } = useToast();
    const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
    const [selectedPayslipData, setSelectedPayslipData] = useState<Omit<Payslip, 'id'> | null>(null);

    const handleGeneratePayslip = (staffMember: StaffMember) => {
        const period = format(new Date(), 'yyyy-MM');
        const existingPayslip = payslips.find(p => p.staffId === staffMember.id && p.period === period);
        if (existingPayslip) {
            toast({ variant: 'destructive', title: "Already Generated", description: `A payslip for ${staffMember.name} for this month already exists.` });
            return;
        }

        const grossSalary = staffMember.salary || 0;
        if (grossSalary === 0) {
            toast({ variant: 'destructive', title: "Salary Not Set", description: `Please set a salary for ${staffMember.name} before generating a payslip.` });
            return;
        }

        const deductions: { description: string; amount: number }[] = [];
        
        // NSSF Deduction (5% of gross)
        const nssfDeduction = grossSalary * 0.05;
        deductions.push({ description: "NSSF (5%)", amount: nssfDeduction });

        // PAYE Deduction (simplified placeholder)
        const taxableIncome = grossSalary - nssfDeduction;
        const payeDeduction = taxableIncome > 235000 ? taxableIncome * 0.15 : 0;
        deductions.push({ description: "PAYE (Est.)", amount: payeDeduction });

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const netSalary = grossSalary - totalDeductions;

        setSelectedPayslipData({
            staffId: staffMember.id,
            staffName: staffMember.name,
            period,
            grossSalary,
            deductions,
            netSalary,
            status: 'Generated',
        });
        setIsPayslipDialogOpen(true);
    };
    
    const handleConfirmGeneration = async () => {
        if (!selectedPayslipData) return;
        try {
            const newId = await addPayslip(selectedPayslipData);
            setPayslips(prev => [{ id: newId, ...selectedPayslipData }, ...prev]);
            toast({ title: "Payslip Generated", description: `Payslip for ${selectedPayslipData.staffName} is ready.` });
        } catch(error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to save the payslip." });
        } finally {
            setIsPayslipDialogOpen(false);
            setSelectedPayslipData(null);
        }
    };
    
    const handleMarkAsPaid = async (payslipId: string) => {
        const updateData = { status: 'Paid' as const, paidDate: format(new Date(), 'yyyy-MM-dd') };
        await updatePayslip(payslipId, updateData);
        setPayslips(prev => prev.map(p => p.id === payslipId ? { ...p, ...updateData } : p));
        toast({ title: "Payslip Marked as Paid" });
    };
    
    const payslipsThisMonth = useMemo(() => {
        const period = format(new Date(), 'yyyy-MM');
        return payslips.filter(p => p.period === period);
    }, [payslips]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payroll Processing</CardTitle>
                    <CardDescription>Generate payslips for staff members for the current month: {format(new Date(), 'MMMM yyyy')}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Salary</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 4}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8" /></TableCell></TableRow>) :
                            staff.filter(s => s.status === 'Active').map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>{member.department}</TableCell>
                                    <TableCell>{formatCurrency(member.salary || 0)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleGeneratePayslip(member)}>Generate Payslip</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Generated Payslips - {format(new Date(), 'MMMM yyyy')}</CardTitle>
                    <CardDescription>Review and process payslips generated for the current month.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Net Salary</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payslipsThisMonth.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.staffName}</TableCell>
                                    <TableCell>{formatCurrency(p.netSalary)}</TableCell>
                                    <TableCell><Badge variant={p.status === 'Paid' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {p.status === 'Generated' && <Button variant="default" size="sm" onClick={() => handleMarkAsPaid(p.id)}>Mark as Paid</Button>}
                                        {p.status === 'Paid' && <span className="text-xs text-muted-foreground">Paid on {p.paidDate}</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Payslip for {selectedPayslipData?.staffName}</DialogTitle>
                        <DialogDescription>Period: {selectedPayslipData?.period}</DialogDescription>
                    </DialogHeader>
                    {selectedPayslipData && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2 rounded-md border p-4">
                                <h4 className="font-medium">Earnings</h4>
                                <div className="flex justify-between text-sm"><span>Gross Salary</span><span>{formatCurrency(selectedPayslipData.grossSalary)}</span></div>
                            </div>
                            <div className="space-y-2 rounded-md border p-4">
                                <h4 className="font-medium">Deductions</h4>
                                {selectedPayslipData.deductions.map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm"><span>{d.description}</span><span>({formatCurrency(d.amount)})</span></div>
                                ))}
                            </div>
                             <Separator />
                            <div className="flex justify-between text-lg font-bold p-4 bg-muted rounded-md">
                                <span>Net Salary</span>
                                <span>{formatCurrency(selectedPayslipData.netSalary)}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPayslipDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmGeneration}>Confirm & Generate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default function HrPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [
                staffData, leaveData, loanData, jobData, applicantData, attendanceData, reviewData, payslipData
            ] = await Promise.all([
                getStaff(), getLeaveRequests(), getLoanRequests(), getJobOpenings(), getApplicants(), getAttendance(), getPerformanceReviews(), getPayslips()
            ]);
            setStaff(staffData);
            setLeaveRequests(leaveData.map(r => ({...r, startDate: new Date(r.startDate), endDate: new Date(r.endDate)})));
            setLoanRequests(loanData);
            setJobOpenings(jobData);
            setApplicants(applicantData);
            setAttendance(attendanceData.map(a => ({...a, date: new Date(a.date)})));
            setPerformanceReviews(reviewData);
            setPayslips(payslipData);
        } catch (error) {
            console.error("Failed to load HR data:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to load HR data." });
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [toast]);


  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [scannedMember, setScannedMember] = useState<StaffMember | null>(null);

  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [selectedStaffForId, setSelectedStaffForId] = useState<StaffMember | null>(null);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'staff' } | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const idCardRef = useRef<HTMLDivElement>(null);

  const staffForm = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema)
  });

  useEffect(() => {
    if (!isScannerOpen) return;
    const scanner = new Html5Qrcode("reader");
    const onScanSuccess = (decodedText: string) => {
      const member = staff.find(s => s.id === decodedText);
      if (member) {
          setScannedMember(member);
          setIsClockInOpen(true);
      } else {
          toast({ variant: "destructive", title: "Staff Not Found", description: `No staff member found with ID: ${decodedText}`});
      }
      scanner.stop();
      setIsScannerOpen(false);
    };
    const onScanError = () => { /* ignore */ };
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
      .catch(err => {
        console.error("Unable to start scanning.", err);
        toast({ variant: "destructive", title: "Scanner Error", description: "Could not start camera." });
      });
    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => console.error("Failed to stop scanner.", err));
      }
    };
  }, [isScannerOpen, staff, toast]);

  const filteredStaff = useMemo(() => {
    return staff.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  const managers = useMemo(() => {
    const managerRoles: Role[] = ['Admin', 'ManagingDirector', 'ExecutiveDirector', 'GeneralManager', 'HRManager', 'FactoryManager', 'OperationalManager', 'SalesExecutive'];
    return staff.filter(s => managerRoles.includes(s.role as Role)).map(s => s.name);
  }, [staff]);

  const handleOpenStaffDialog = (staffMember: StaffMember | null) => {
    setEditingStaff(staffMember);
    staffForm.reset(staffMember ? staffMember : { name: "", email: "", role: "", department: "", status: "Active", salary: 0 });
    setIsStaffDialogOpen(true);
  };
  
  const onStaffSubmit = async (values: StaffFormValues) => {
    if (editingStaff) {
      const updatedData = { ...editingStaff, ...values };
      await updateStaff(editingStaff.id, values);
      setStaff(prev => prev.map(s => (s.id === editingStaff.id ? updatedData : s)));
      toast({ title: "Staff Updated", description: "The staff member's details have been updated." });
    } else {
      const newStaffData: Omit<StaffMember, 'id'> = values;
      const newId = await addStaff(newStaffData);
      setStaff(prev => [{ id: newId, ...newStaffData }, ...prev]);
      toast({ title: "Staff Added", description: `${values.name} has been added to the team.` });
    }
    setIsStaffDialogOpen(false);
    setEditingStaff(null);
  };

  const handleOpenDeleteDialog = (member: StaffMember) => {
    setItemToDelete({ id: member.id, type: 'staff' });
    setIsAlertOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!itemToDelete) return;
    await deleteStaff(itemToDelete.id);
    setStaff(prev => prev.filter(s => s.id !== itemToDelete.id));
    toast({ variant: "destructive", title: "Staff Member Removed" });
    setIsAlertOpen(false);
    setItemToDelete(null);
  }

  const handlePrintIdCard = (member: StaffMember) => {
    setSelectedStaffForId(member);
    setIsIdCardOpen(true);
  }

  const handlePrint = () => {
      window.print();
  }

  const handleClockIn = async () => {
    if (!scannedMember) return;

    const alreadyClockedIn = attendance.some(
      (att) => att.staffId === scannedMember.id && isToday(att.date)
    );

    if (alreadyClockedIn) {
      toast({
        title: "Already Recorded",
        description: `${scannedMember.name} has already been marked for attendance today.`,
      });
      setIsClockInOpen(false);
      setScannedMember(null);
      return;
    }

    const newRecordData: Omit<AttendanceRecord, 'id'> = {
      staffId: scannedMember.id,
      staffName: scannedMember.name,
      date: new Date(),
      status: 'Present',
    };

    const newId = await addAttendance(newRecordData);
    setAttendance(prev => [...prev, {id: newId, ...newRecordData}]);
    
    toast({
      title: "Clock In Successful",
      description: `${scannedMember.name} has been marked as Present for today.`,
    });
    setIsClockInOpen(false);
    setScannedMember(null);
  };

  return (
    <div>
      <PageHeader
        title="Human Resources"
        description="Manage your staff, payroll, attendance, leave, recruitment, and performance."
        actions={
            <div className="flex items-center gap-2">
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><QrCode className="mr-2 h-4 w-4" /> Scan ID & Clock In</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Scan Staff ID Card</DialogTitle>
                            <DialogDescription>Point your camera at the QR code on the ID card.</DialogDescription>
                        </DialogHeader>
                        <div id="reader" className="w-full"></div>
                    </DialogContent>
                </Dialog>
                <Button onClick={() => handleOpenStaffDialog(null)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Staff
                </Button>
            </div>
        }
      />

      <Tabs defaultValue="staff">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="loans">Loans & Advances</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
            <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                <Card>
                    <CardHeader>
                        <CardTitle>Staff Management</CardTitle>
                        <CardDescription>View and manage all your staff members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search by name, email, ID, or role..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-background">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {isLoading ? Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : 
                                filteredStaff.map((member) => (
                                    <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="font-medium">{member.name}</div>
                                        <div className="text-sm text-muted-foreground">{member.email}</div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{member.role}</TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "border-transparent",
                                            member.status === "Active" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                            member.status === "On Leave" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                                            member.status === "Terminated" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                                        )}>{member.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenStaffDialog(member)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePrintIdCard(member)}><QrCode className="mr-2 h-4 w-4" /> Print ID Card</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
                        <DialogDescription>Fill in the details below.</DialogDescription>
                    </DialogHeader>
                    <Form {...staffForm}>
                        <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="space-y-4 py-4">
                             <FormField control={staffForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={staffForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john.doe@company.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={staffForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input placeholder="e.g., Developer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={staffForm.control} name="department" render={({ field }) => (
                                <FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                                <SelectContent>{departments.filter(d => d !== "All").map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={staffForm.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salary (UGX)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={staffForm.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Terminated">Terminated</SelectItem></SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsStaffDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </TabsContent>
        
        <TabsContent value="payroll">
            <PayrollView staff={staff} loanRequests={loanRequests} payslips={payslips} setPayslips={setPayslips} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="loans">
            <LoanManagementView loanRequests={loanRequests} setLoanRequests={setLoanRequests} staff={staff} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="attendance">
            <AttendanceView staff={staff} attendance={attendance} setAttendance={setAttendance} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveManagementView leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} staff={staff} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="recruitment">
          <RecruitmentView jobOpenings={jobOpenings} setJobOpenings={setJobOpenings} applicants={applicants} setApplicants={setApplicants} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceView reviews={performanceReviews} setReviews={setReviews} staff={staff} managers={managers} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={isClockInOpen} onOpenChange={setIsClockInOpen}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Clock In/Out</DialogTitle>
                  <DialogDescription>Confirm attendance for the following staff member.</DialogDescription>
              </DialogHeader>
              {scannedMember && (
                  <div className="flex items-center gap-4 py-4">
                      <Avatar className="h-16 w-16">
                          <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="person avatar" />
                          <AvatarFallback>{getInitials(scannedMember.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-bold text-lg">{scannedMember.name}</p>
                          <p className="text-muted-foreground">{scannedMember.role}</p>
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsClockInOpen(false)}>Cancel</Button>
                  <Button onClick={handleClockIn}>Clock In for Today</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isIdCardOpen} onOpenChange={setIsIdCardOpen}>
        <DialogContent className="max-w-md">
           <DialogHeader>
                <DialogTitle>Print Staff ID Card</DialogTitle>
                <DialogDescription>Review the ID card below. Use your browser's print functionality to print it.</DialogDescription>
            </DialogHeader>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-id-card, .printable-id-card * { visibility: visible; }
                    .printable-id-card { position: absolute; left: 0; top: 0; }
                }
            `}</style>
            <div className="py-4 printable-id-card">
              {selectedStaffForId && <IdCard ref={idCardRef} member={selectedStaffForId} />}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsIdCardOpen(false)}>Cancel</Button>
                <Button onClick={handlePrint}>Print</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently remove the staff member from the system.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStaff}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
