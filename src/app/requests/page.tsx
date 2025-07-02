
"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, CheckCircle, XCircle, Package, Wallet, ThumbsUp, X, Search, Hourglass, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MaterialCashRequest, Role as AppRole, ApprovalStep } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/role-context";
import { CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getRequests, addRequest, updateRequest, deleteRequest } from "@/services/requests-service";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";


const requestItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.coerce.number().optional(),
});

const newRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  requestType: z.enum(["cash", "material"]),
  reason: z.string().min(1, "Reason is required"),
  neededByDate: z.date({ required_error: "A due date is required" }),
  deliveryLocation: z.string().optional(),
  items: z.array(requestItemSchema).optional(),
  amountOrValue: z.coerce.number().positive("Amount must be positive"),
});
type NewRequestFormValues = z.infer<typeof newRequestSchema>;


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(amount);
};

const StatusBadge = ({ status }: { status: MaterialCashRequest['status'] }) => {
  const statusStyles = {
    Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    Approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    Issued: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    Delivered: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    Cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
  };
  return <Badge className={cn("border-transparent", statusStyles[status])}>{status}</Badge>;
};

const RequestDetailsDialog = ({ request, isOpen, onOpenChange }: { request: MaterialCashRequest | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
    if (!request) return null;

    const getStatusIcon = (status: ApprovalStep['status']) => {
        switch (status) {
            case 'Approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'Rejected': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'Pending': return <Hourglass className="h-4 w-4 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{request.title}</DialogTitle>
                    <DialogDescription>
                        Request ID: {request.id} &bull; Created by: {request.createdBy}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <h4 className="font-medium">Request Details</h4>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{request.requestType}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{request.reason}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Amount/Value:</span> <span className="font-medium">{formatCurrency(request.amountOrValue)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Needed By:</span> <span className="font-medium">{request.neededByDate}</span></div>
                            {request.deliveryLocation && <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span className="font-medium">{request.deliveryLocation}</span></div>}
                        </div>
                        {request.items && request.items.length > 0 && (
                            <>
                                <Separator />
                                <h4 className="font-medium">Items Requested</h4>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {request.items.map(item => (
                                                <TableRow key={item.itemName}><TableCell>{item.itemName}</TableCell><TableCell>{item.quantity} {item.unit}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-medium">Approval History</h4>
                        <div className="relative pl-6 after:absolute after:inset-y-0 after:w-px after:bg-border after:left-[11px]">
                            {request.approvalTrail.map((step, index) => (
                                <div key={index} className="relative flex items-start pb-8">
                                    {index < request.approvalTrail.length -1 && <div className="absolute left-[-11px] top-[5px] h-full w-px bg-border" />}
                                    <div className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 shrink-0",
                                        step.status === 'Approved' && "border-green-500",
                                        step.status === 'Rejected' && "border-red-500",
                                        step.status === 'Pending' && "border-yellow-500"
                                    )}>
                                        {getStatusIcon(step.status)}
                                    </div>
                                    <div className="ml-4 -mt-1">
                                        <p className="font-semibold">{step.role}</p>
                                        <p className="text-sm text-muted-foreground">{step.status}</p>
                                        {step.timestamp && <p className="text-xs text-muted-foreground">{format(new Date(step.timestamp), 'PPpp')}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<MaterialCashRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const role = user?.role || 'User';
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialCashRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<MaterialCashRequest | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await getRequests();
            setRequests(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load requests." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchRequests();
  }, [toast]);

  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: { requestType: "cash", items: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const requestType = form.watch("requestType");
  const items = form.watch("items");

  useEffect(() => {
    if (requestType === "material") {
      const totalValue = items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0) || 0;
      form.setValue("amountOrValue", totalValue, { shouldValidate: true });
    }
  }, [items, requestType, form]);


  const canCreateRequest = !['Cashier', 'StoreManager', 'FactoryManager'].includes(role);

  const getVisibleTabs = () => {
      const visible = new Set<string>();
      if (!['Cashier', 'StoreManager'].includes(role)) {
          visible.add('my-requests');
      }
      if (['GeneralManager', 'ManagingDirector', 'ExecutiveDirector', 'Admin'].includes(role)) {
          visible.add('approvals');
      }
      if (['Cashier', 'StoreManager', 'Admin'].includes(role)) {
          visible.add('issuance');
      }
      return Array.from(visible);
  };

  const visibleTabs = getVisibleTabs();
  const [activeTab, setActiveTab] = useState(visibleTabs[0] || 'my-requests');

  const myRequests = requests.filter(r => r.createdBy === user?.email);

  const approvalRequests = requests.filter(r => r.status === 'Pending' && r.currentStage === role);
  
  const cashIssuanceRequests = requests.filter(r => r.requestType === 'cash' && r.status === 'Approved' && r.currentStage === 'Cashier');
  const materialIssuanceRequests = requests.filter(r => r.requestType === 'material' && r.status === 'Approved' && r.currentStage === 'StoreManager');
  
  const handleViewDetails = (req: MaterialCashRequest) => {
      setSelectedRequest(req);
      setIsDetailsOpen(true);
  };

  const RequestTable = ({ requests, isLoading, actions }: { requests: MaterialCashRequest[], isLoading: boolean, actions?: (req: MaterialCashRequest) => React.ReactNode }) => (
    <div className="border rounded-lg overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden md:table-cell">Amount/Value</TableHead>
            <TableHead className="hidden md:table-cell">Needed By</TableHead>
            <TableHead>Status</TableHead>
            {actions && <TableHead className="w-[180px] text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={actions ? 6 : 5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ))
          ) : requests.length > 0 ? (
            requests.map((req) => (
                <TableRow key={req.id}>
                <TableCell>
                    <button onClick={() => handleViewDetails(req)} className="font-medium text-left hover:underline">
                    {req.title}
                    </button>
                    <div className="text-sm text-muted-foreground">{req.id}</div>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="capitalize">
                    {req.requestType === 'cash' ? <Wallet className="mr-2 h-4 w-4" /> : <Package className="mr-2 h-4 w-4" />}
                    {req.requestType}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatCurrency(req.amountOrValue)}</TableCell>
                <TableCell className="hidden md:table-cell">{req.neededByDate}</TableCell>
                <TableCell><StatusBadge status={req.status} /></TableCell>
                {actions && <TableCell className="text-right">{actions(req)}</TableCell>}
                </TableRow>
            ))
          ) : (
              <TableRow>
                  <TableCell colSpan={actions ? 6 : 5} className="text-center h-24 text-muted-foreground">
                      No requests to display.
                  </TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );


  const onNewRequestSubmit = async (data: NewRequestFormValues) => {
    if (!user) {
        toast({variant: 'destructive', title: 'Error', description: 'You must be logged in to create a request.'});
        return;
    }
    
    let approvalChain: AppRole[] = [];
    if (data.requestType === 'cash') {
        approvalChain = ['GeneralManager', 'ManagingDirector', 'Cashier'];
    } else {
        approvalChain = ['GeneralManager', 'ManagingDirector', 'StoreManager'];
    }
    
    const approvalTrail = approvalChain.map((approverRole) => ({
      role: approverRole,
      status: 'Pending' as const,
    }));

    const newRequestData: Omit<MaterialCashRequest, 'id'> = {
        status: 'Pending',
        currentStage: approvalChain[0],
        createdAt: format(new Date(), 'yyyy-MM-dd'),
        createdBy: user.email,
        neededByDate: format(data.neededByDate, 'yyyy-MM-dd'),
        approvalTrail: [
            { role: role, status: 'Approved', user: user.email, timestamp: new Date().toISOString() },
            ...approvalTrail
        ],
        title: data.title,
        requestType: data.requestType,
        reason: data.reason,
        amountOrValue: data.amountOrValue,
        items: data.items,
        deliveryLocation: data.deliveryLocation,
    };
    
    try {
        const newId = await addRequest(newRequestData);
        setRequests(prev => [{ ...newRequestData, id: newId }, ...prev]);
        toast({ title: 'Request Created', description: `Your request "${data.title}" has been submitted for approval.`});
        setIsNewRequestOpen(false);
        form.reset({ title: "", requestType: "cash", reason: "", items: [], amountOrValue: 0 });
    } catch(error) {
        toast({ variant: 'destructive', title: "Creation Failed", description: "Could not save your request." });
    }
  };

  const handleApproval = async (req: MaterialCashRequest, isApproved: boolean) => {
    if (!user) return;
    const trail = [...req.approvalTrail];
    const currentStageIndex = trail.findIndex(t => t.status === 'Pending' && t.role === role);
    if (currentStageIndex === -1) return;

    trail[currentStageIndex] = { ...trail[currentStageIndex], status: isApproved ? 'Approved' : 'Rejected', timestamp: new Date().toISOString(), user: user.email };
    
    let newStatus = req.status;
    let newCurrentStage = req.currentStage;

    if (!isApproved) {
        newStatus = 'Rejected';
    } else {
        const nextStage = trail[currentStageIndex + 1];
        if (nextStage) {
            newCurrentStage = nextStage.role;
        } else {
            newStatus = 'Approved';
        }
    }
    
    const updatedRequestData = { status: newStatus, currentStage: newCurrentStage, approvalTrail: trail };
    
    try {
        await updateRequest(req.id, updatedRequestData);
        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updatedRequestData } : r));
        toast({ title: `Request ${isApproved ? 'Approved' : 'Rejected'}`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not process approval." });
    }
  };

  const handleIssuance = async (req: MaterialCashRequest) => {
    if (!user) return;
    const newStatus = req.requestType === 'cash' ? 'Issued' : 'Delivered';
    const trail = [...req.approvalTrail];
    const issuanceIndex = trail.findIndex(t => t.role === (req.requestType === 'cash' ? 'Cashier' : 'StoreManager'));
    if (issuanceIndex !== -1) {
      trail[issuanceIndex] = { ...trail[issuanceIndex], status: 'Approved', timestamp: new Date().toISOString(), user: user.email };
    }
    
    const updatedRequestData = { status: newStatus, approvalTrail: trail };
    
    try {
        await updateRequest(req.id, updatedRequestData);
        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updatedRequestData } : r));
        toast({ title: 'Success', description: `Request marked as ${newStatus}.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not mark as issued/delivered." });
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    try {
        await deleteRequest(requestToDelete.id);
        setRequests(prev => prev.filter(r => r.id !== requestToDelete.id));
        toast({ variant: 'destructive', title: "Request Cancelled", description: "Your request has been cancelled." });
    } catch(error) {
        toast({ variant: 'destructive', title: "Cancellation Failed", description: "Could not cancel your request." });
    } finally {
        setRequestToDelete(null);
    }
  }


  return (
    <div>
      <PageHeader
        title="Cash & Material Requests"
        description="Manage requisitions for cash and materials."
        actions={
            canCreateRequest && (
                <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Request</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Create New Request</DialogTitle><DialogDescription>Fill in the details for your request.</DialogDescription></DialogHeader>
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onNewRequestSubmit)} className="space-y-4 pt-4">
                            <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Laptops for New Hires" {...field} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={form.control} name="requestType" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Request Type</FormLabel><FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="cash" /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="material" /></FormControl><FormLabel className="font-normal">Material</FormLabel></FormItem>
                                </RadioGroup></FormControl><FormMessage /></FormItem>
                            )} />
                            {requestType === 'cash' && (
                                 <FormField control={form.control} name="amountOrValue" render={({ field }) => <FormItem><FormLabel>Amount Requested</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} /></FormControl><FormMessage /></FormItem>} />
                            )}
                            {requestType === 'material' && (
                                <div className="space-y-4 p-4 border rounded-md">
                                    <h4 className="font-medium">Material Items</h4>
                                    {fields.map((field, index) => (
                                         <div key={field.id} className="grid grid-cols-[1fr_80px_80px_80px_auto] items-end gap-2">
                                            <FormField control={form.control} name={`items.${index}.itemName`} render={({ field }) => <FormItem><FormLabel>Item</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>}/>
                                            <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                                            <FormField control={form.control} name={`items.${index}.unitCost`} render={({ field }) => <FormItem><FormLabel>Cost/Unit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>}/>
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><X className="h-4 w-4"/></Button>
                                         </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ itemName: '', quantity: 1, unit: 'pcs', unitCost: 0 })}>Add Item</Button>
                                    <FormField control={form.control} name="deliveryLocation" render={({ field }) => <FormItem><FormLabel>Delivery Location</FormLabel><FormControl><Input placeholder="e.g. Head Office" {...field} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                            )}
                            <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason for Request</FormLabel><FormControl><Textarea placeholder="Provide a justification for this request..." {...field} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={form.control} name="neededByDate" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Date Needed By</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                            <DialogFooter><Button variant="ghost" type="button" onClick={() => setIsNewRequestOpen(false)}>Cancel</Button><Button type="submit">Submit Request</Button></DialogFooter>
                        </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full", `grid-cols-${visibleTabs.length > 0 ? visibleTabs.length : 1}`)}>
          {visibleTabs.includes('my-requests') && <TabsTrigger value="my-requests">My Requests</TabsTrigger>}
          {visibleTabs.includes('approvals') && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {visibleTabs.includes('issuance') && <TabsTrigger value="issuance">Issuance</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-requests">
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>All cash and material requests you have created.</CardDescription>
            </CardHeader>
            <CardContent>
              <RequestTable isLoading={isLoading} requests={myRequests} actions={(req) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleViewDetails(req)}>View Details</DropdownMenuItem>
                    {req.status === 'Pending' && <DropdownMenuItem className="text-destructive" onClick={() => setRequestToDelete(req)}>Cancel Request</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Requests waiting for your approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <RequestTable isLoading={isLoading} requests={approvalRequests} actions={(req) => (
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleApproval(req, false)}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 hover:text-primary" onClick={() => handleApproval(req, true)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                </div>
              )} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issuance">
          <Tabs defaultValue={(role === 'Cashier' || role === 'StoreManager' || role === 'Admin') ? (cashIssuanceRequests.length > 0 ? 'cashier' : 'store') : 'cashier' } className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cashier" disabled={!['Cashier', 'Admin'].includes(role)}>Cashier View</TabsTrigger>
              <TabsTrigger value="store" disabled={!['StoreManager', 'Admin'].includes(role)}>Store Manager View</TabsTrigger>
            </TabsList>
            <TabsContent value="cashier" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Issuance</CardTitle>
                  <CardDescription>Approved cash requests pending issuance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestTable isLoading={isLoading} requests={cashIssuanceRequests} actions={(req) => (
                    <Button size="sm" onClick={() => handleIssuance(req)} disabled={req.status === 'Issued'}>
                      <ThumbsUp className="mr-2 h-4 w-4" /> {req.status === 'Issued' ? 'Issued' : 'Issue Funds'}
                    </Button>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="store" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Material Issuance</CardTitle>
                  <CardDescription>Approved material requests pending issuance from the store.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestTable isLoading={isLoading} requests={materialIssuanceRequests} actions={(req) => (
                    <Button size="sm" onClick={() => handleIssuance(req)} disabled={req.status === 'Delivered'}>
                        <Package className="mr-2 h-4 w-4" /> {req.status === 'Delivered' ? 'Delivered' : 'Mark Delivered'}
                    </Button>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
       <RequestDetailsDialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} request={selectedRequest} />
       <AlertDialog open={!!requestToDelete} onOpenChange={() => setRequestToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently cancel your request for "{requestToDelete?.title}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRequest}>Yes, cancel it</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
