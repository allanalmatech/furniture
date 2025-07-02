
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, PenSquare, Trash2, X, Target, Upload, Download, FileSpreadsheet, FileText, MoreHorizontal, CheckCircle, Hourglass,ThumbsUp, ThumbsDown } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, calculateTotal } from "@/lib/utils";
import type { Quotation, Order, LineItem, SalesTarget } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameMonth } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/role-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getQuotations, addQuotation, updateQuotation, deleteQuotation, getOrders, addOrder, updateOrder, getSalesTargets } from "@/services/sales-service";
import { getContacts } from "@/services/crm-service";
import { getStaff, getUsersByRole } from "@/services/hr-service";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { addNotification } from "@/services/notification-service";

const quotationSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "A date is required." }),
  expiryDate: z.date({ required_error: "An expiry date is required." }),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Price must be positive"),
  })).min(1, "At least one item is required"),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

const TargetsView = ({ quotations, targets, isLoading }: { quotations: Quotation[], targets: SalesTarget[], isLoading: boolean}) => {
    const currentMonth = new Date();
    const currentPeriod = format(currentMonth, "yyyy-MM");

    const targetsForPeriod = targets
        .filter(t => t.period === currentPeriod)
        .map(target => {
            const acceptedQuotes = quotations.filter(q => 
                q.agentName === target.agentName &&
                q.status === 'Accepted' &&
                isSameMonth(new Date(q.date), currentMonth)
            );
            const achievedAmount = acceptedQuotes.reduce((sum, q) => sum + calculateTotal(q.items), 0);
            return { ...target, achievedAmount };
        });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {isLoading ? Array.from({length: 3}).map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            )) : targetsForPeriod.map(target => {
                const progress = target.targetAmount > 0 ? Math.min((target.achievedAmount / target.targetAmount) * 100, 100) : 0;
                return (
                    <Card key={target.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{target.agentName}</CardTitle>
                                <Target className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <CardDescription>Sales Target for {format(currentMonth, 'MMMM yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Progress value={progress} />
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{formatCurrency(target.achievedAmount)}</span>
                                    <span className="text-muted-foreground">{formatCurrency(target.targetAmount)}</span>
                                </div>
                            </div>
                            <Badge variant={progress >= 100 ? "default" : "secondary"} className={cn(progress >= 100 && "bg-green-600 hover:bg-green-700")}>
                                {progress >= 100 ? "Target Reached!" : `${progress.toFixed(0)}% of target`}
                            </Badge>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default function SalesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const role = user?.role;
  const agentName = user?.name;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [quotesData, ordersData, targetsData, contactsData] = await Promise.all([
                getQuotations(),
                getOrders(),
                getSalesTargets(),
                getContacts(),
            ]);
            setQuotations(quotesData);
            setOrders(ordersData);
            setSalesTargets(targetsData);
            setCustomers([...new Set(contactsData.map(c => c.company))]);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch sales data." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [toast]);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customer: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const onSubmit = async (values: QuotationFormValues) => {
    const newQuotationData: Omit<Quotation, 'id'> = {
        customer: values.customer,
        date: format(values.date, "yyyy-MM-dd"),
        expiryDate: format(values.expiryDate, "yyyy-MM-dd"),
        items: values.items.map(item => ({ ...item, id: Math.random().toString() })),
        status: "Draft",
        signatureStatus: "Not Requested",
        agentName: agentName,
    };
    const newId = await addQuotation(newQuotationData);
    setQuotations(prev => [{id: newId, ...newQuotationData }, ...prev]);
    toast({ title: "Quotation Created", description: `Quotation ${newId} has been saved as a draft.` });
    setIsQuotationDialogOpen(false);
    form.reset({ customer: "", items: [{ description: "", quantity: 1, unitPrice: 0 }]});
  }

  const handleUpdateQuoteStatus = async (id: string, status: Quotation['status'], signatureStatus?: Quotation['signatureStatus']) => {
      const updateData: Partial<Quotation> = { status };
      if (signatureStatus) {
        updateData.signatureStatus = signatureStatus;
      }
      await updateQuotation(id, updateData);
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updateData } : q));
      toast({ title: "Quotation Updated", description: `Quotation ${id} status set to ${status}.`});
      
      if (status === 'Pending Approval') {
          const executives = await getUsersByRole('SalesExecutive');
          const quote = quotations.find(q => q.id === id);
          if (quote) {
              for (const exec of executives) {
                  await addNotification({
                      recipientId: exec.id,
                      type: 'sales',
                      title: 'Quotation Needs Approval',
                      description: `${quote.agentName} submitted a quotation for ${quote.customer} requiring your approval.`,
                      link: `/sales`,
                  });
              }
          }
      }
  };

  const handleApproveSale = async (quote: Quotation) => {
      const newOrderData: Omit<Order, 'id'> = {
          customer: quote.customer,
          date: format(new Date(), 'yyyy-MM-dd'),
          items: quote.items,
          status: 'Awaiting Payment',
          agentName: quote.agentName,
      };
      const newId = await addOrder(newOrderData);
      setOrders(prev => [{ id: newId, ...newOrderData }, ...prev]);
      toast({ title: "Sale Approved", description: `Order ${newId} created and is now awaiting payment.`});
  };
  
  const handleReceivePayment = async (orderId: string) => {
      await updateOrder(orderId, { status: "Processing" });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Processing" } : o));
      toast({ title: "Payment Received", description: `Order ${orderId} is now being processed.` });
  }

  const handleOpenDeleteDialog = (quote: Quotation) => {
    setQuoteToDelete(quote);
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    await deleteQuotation(quoteToDelete.id);
    setQuotations(prev => prev.filter(q => q.id !== quoteToDelete.id));
    toast({
        variant: "destructive",
        title: "Quotation Deleted",
        description: `Quotation ${quoteToDelete.id} has been removed.`,
    });
    setQuoteToDelete(null);
  };
  
  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["ID", "Customer", "Agent", "Date", "Expiry Date", "Total", "Status"];
    const body = quotations.map(q => [
        q.id,
        q.customer,
        q.agentName || "N/A",
        q.date,
        q.expiryDate,
        calculateTotal(q.items),
        q.status
    ]);
    const filename = "quotations_export";
    
    toast({ title: `Exporting ${filename.replace(/_/g, ' ')}`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

    if (format === 'csv') {
        const csvContent = [headers.join(','), ...body.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text("Quotations", 14, 16);
        
        const pdfBody = body.map(row => row.map((cell, index) => {
            if (headers[index] === 'Total' && typeof cell === 'number') {
                return formatCurrency(cell);
            }
            return cell ?? '-';
        }));

        autoTable(doc, {
            head: [headers],
            body: pdfBody as any,
            startY: 20,
        });
        doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
        const worksheetData = [headers, ...body];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");
        XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };
  
  const quoteStatusColors: { [key in Quotation['status']]: string } = {
    Accepted: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    "Pending Approval": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    Draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
    Declined: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };


  return (
    <div>
      <PageHeader
        title="Sales"
        description="Manage your quotations and orders. Invoicing is handled separately."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Quotation
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Create New Quotation</DialogTitle>
                        <DialogDescription>Fill in the details below. All fields are required.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="customer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                                                <SelectContent>{customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Quotation Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="expiryDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Expiry Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-2">Line Items</h3>
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-end gap-2 p-3 bg-muted rounded-md">
                                            <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => <FormItem className="flex-grow"><FormLabel>Description</FormLabel><FormControl><Input placeholder="Service or product description" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => <FormItem className="w-24"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => <FormItem className="w-32"><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}>
                                        <Plus className="mr-2 h-4 w-4"/> Add Item
                                    </Button>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsQuotationDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Quotation</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Tabs defaultValue="quotations">
        <TabsList>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>
        <TabsContent value="quotations">
            <div className="mb-4 mt-4">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search quotations..." className="pl-9" />
                </div>
            </div>
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Agent</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10" /></TableCell></TableRow>
                )) : quotations.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.id}</TableCell>
                    <TableCell>{quote.customer}</TableCell>
                    <TableCell className="hidden md:table-cell">{quote.agentName}</TableCell>
                    <TableCell>{formatCurrency(calculateTotal(quote.items))}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-transparent", quoteStatusColors[quote.status])}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quote.signatureStatus && (
                        <Badge
                          className={cn(
                            "border-transparent",
                            quote.signatureStatus === "Signed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                            quote.signatureStatus === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                            quote.signatureStatus === "Not Requested" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
                          )}
                        >
                          <PenSquare className="mr-1 h-3 w-3" />
                          {quote.signatureStatus}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                {role === 'SalesAgent' && quote.status === 'Draft' && (
                                    <DropdownMenuItem onClick={() => handleUpdateQuoteStatus(quote.id, 'Pending Approval')}>Request Approval</DropdownMenuItem>
                                )}
                                {role === 'SalesAgent' && quote.status === 'Sent' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleUpdateQuoteStatus(quote.id, 'Accepted', 'Signed')}>
                                            <ThumbsUp className="mr-2 h-4 w-4" /> Mark as Accepted
                                        </DropdownMenuItem>
                                         <DropdownMenuItem onClick={() => handleUpdateQuoteStatus(quote.id, 'Declined')} className="text-destructive">
                                            <ThumbsDown className="mr-2 h-4 w-4" /> Mark as Declined
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {role === 'SalesExecutive' && quote.status === 'Pending Approval' && (
                                    <DropdownMenuItem onClick={() => handleUpdateQuoteStatus(quote.id, 'Sent', 'Pending')}>Approve &amp; Mark as Sent</DropdownMenuItem>
                                )}
                                {(role === 'ManagingDirector' || role === 'ExecutiveDirector' || role === 'GeneralManager') && quote.status === 'Accepted' && (
                                     <DropdownMenuItem onClick={() => handleApproveSale(quote)}>Approve Sale</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(quote)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <div className="mb-4 mt-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Tracking Info</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10" /></TableCell></TableRow>
                )) : orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell className="hidden md:table-cell">{order.date}</TableCell>
                    <TableCell>{formatCurrency(calculateTotal(order.items))}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-transparent",
                          order.status === "Delivered" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                          order.status === "Shipped" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                          order.status === "Processing" && "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
                          order.status === "Awaiting Payment" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                          order.status === "Pending" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
                          order.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                        {order.carrier && order.trackingNumber ? (
                            <div>
                                <div className="font-medium">{order.carrier}</div>
                                <Button variant="link" asChild className="p-0 h-auto font-normal text-sm text-muted-foreground">
                                    <a href="#" target="_blank" rel="noopener noreferrer">
                                        {order.trackingNumber}
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </TableCell>
                     <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                {role === 'Cashier' && order.status === 'Awaiting Payment' && (
                                    <DropdownMenuItem onClick={() => handleReceivePayment(order.id)}>Receive Payment</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="targets">
            <TargetsView quotations={quotations} targets={salesTargets} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
        <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete quotation {quoteToDelete?.id}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteQuote}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
