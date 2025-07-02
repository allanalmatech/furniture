
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, FileSpreadsheet, FileText, MoreHorizontal, CalendarIcon, Trash2, Repeat } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, calculateTotal } from "@/lib/utils";
import type { CompanyBranding, Invoice } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths, addYears, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useBranding } from "@/context/branding-context";
import { getInvoices, addInvoice, updateInvoice, deleteInvoice } from "@/services/sales-service";
import { getContacts } from "@/services/crm-service";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";

const invoiceSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "An invoice date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Price must be positive"),
  })).min(1, "At least one item is required"),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
}).refine(data => !data.isRecurring || !!data.recurringFrequency, {
    message: "Frequency is required for recurring invoices.",
    path: ["recurringFrequency"],
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicingPage() {
  const { branding } = useBranding();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [invoicesData, contactsData] = await Promise.all([
                getInvoices(),
                getContacts(),
            ]);
            setInvoices(invoicesData);
            setCustomers([...new Set(contactsData.map(c => c.company))]);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load invoicing data." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [toast]);

  const recurringTemplates = useMemo(() => invoices.filter(inv => !!inv.recurringDetails), [invoices]);
  const standardInvoices = useMemo(() => invoices.filter(inv => !inv.recurringDetails), [invoices]);

  const filteredInvoices = useMemo(() => standardInvoices.filter(
    (invoice) =>
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchQuery.toLowerCase())
  ), [standardInvoices, searchQuery]);
  
  const filteredRecurringTemplates = useMemo(() => recurringTemplates.filter(
    (invoice) =>
      invoice.customer.toLowerCase().includes(searchQuery.toLowerCase())
  ), [recurringTemplates, searchQuery]);


  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const openDialog = (invoice: Invoice | null) => {
    setEditingInvoice(invoice);
    if (invoice) {
        form.reset({
            customer: invoice.customer,
            date: new Date(invoice.date),
            dueDate: new Date(invoice.dueDate),
            items: invoice.items,
            isRecurring: !!invoice.recurringDetails,
            recurringFrequency: invoice.recurringDetails?.frequency,
        });
    } else {
        form.reset({
            customer: "",
            date: new Date(),
            dueDate: addDays(new Date(), 14),
            items: [{ description: "", quantity: 1, unitPrice: 0 }],
            isRecurring: false,
            recurringFrequency: undefined,
        });
    }
    setIsDialogOpen(true);
  };

  const calculateNextDate = (currentDate: Date, frequency: 'monthly' | 'quarterly' | 'annually'): string => {
      let nextDate: Date;
      switch (frequency) {
          case 'monthly':
              nextDate = addMonths(currentDate, 1);
              break;
          case 'quarterly':
              nextDate = addMonths(currentDate, 3);
              break;
          case 'annually':
              nextDate = addYears(currentDate, 1);
              break;
      }
      return format(nextDate, 'yyyy-MM-dd');
  };
  
  const onSubmit = async (values: InvoiceFormValues) => {
      const { isRecurring, recurringFrequency, ...restOfValues } = values;
      
      try {
        if (editingInvoice) {
            const updatedInvoiceData: Partial<Invoice> = {
                ...restOfValues,
                date: format(values.date, "yyyy-MM-dd"),
                dueDate: format(values.dueDate, "yyyy-MM-dd"),
                items: values.items.map(item => ({...item, id: item.id || Math.random().toString()})),
                recurringDetails: isRecurring && recurringFrequency ? {
                    frequency: recurringFrequency,
                    nextDate: editingInvoice.recurringDetails?.nextDate || calculateNextDate(values.date, recurringFrequency),
                } : undefined,
            };
            await updateInvoice(editingInvoice.id, updatedInvoiceData);
            setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? { ...editingInvoice, ...updatedInvoiceData } as Invoice : inv));
            toast({ title: "Invoice Updated", description: `Invoice ${editingInvoice.id} has been updated.` });
        } else {
            const newInvoiceData: Omit<Invoice, 'id'> = {
                status: "Draft",
                ...restOfValues,
                items: values.items.map(item => ({...item, id: Math.random().toString()})),
                date: format(values.date, "yyyy-MM-dd"),
                dueDate: format(values.dueDate, "yyyy-MM-dd"),
                recurringDetails: isRecurring && recurringFrequency ? {
                    frequency: recurringFrequency,
                    nextDate: calculateNextDate(values.date, recurringFrequency),
                } : undefined,
            };
            const newId = await addInvoice(newInvoiceData);
            setInvoices(prev => [{id: newId, ...newInvoiceData }, ...prev]);
            toast({ title: "Invoice Created", description: `Invoice ${newId} has been created.` });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the invoice.'});
      } finally {
        setIsDialogOpen(false);
        setEditingInvoice(null);
      }
  }

  const handleUpdateStatus = async (id: string, status: Invoice['status']) => {
      try {
        await updateInvoice(id, { status });
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
        toast({ title: "Status Updated", description: `Invoice ${id} has been marked as ${status}.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update invoice status.'});
      }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
        await deleteInvoice(invoiceToDelete.id);
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
        toast({ variant: 'destructive', title: "Invoice Deleted", description: `Invoice ${invoiceToDelete.id} has been removed.`});
    } catch(error) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the invoice.'});
    } finally {
        setInvoiceToDelete(null);
    }
  };
  
  const downloadPDF = (invoice: Invoice, branding: CompanyBranding) => {
    const doc = new jsPDF();
    const totalAmount = calculateTotal(invoice.items);

    if (branding.logoUrl && branding.logoUrl.startsWith('data:image')) {
      try {
        const imageType = branding.logoUrl.split(';')[0].split('/')[1]?.toUpperCase();
        if (imageType) {
          doc.addImage(branding.logoUrl, imageType, 15, 12, 24, 24);
        }
      } catch (error) {
        console.error("Error adding image to PDF:", error);
      }
    }
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(branding.companyName, 45, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("123 Furniture Ave, Mukono, Uganda", 45, 28);
    doc.text("sales@footsteps.co | (123) 456-7890", 45, 33);
    
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, 50);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer, 20, 72);
    
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #:", 140, 65);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.id, 165, 65);
    
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 140, 72);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.date, 165, 72);
    
    doc.setFont("helvetica", "bold");
    doc.text("Due Date:", 140, 79);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.dueDate, 165, 79);
    
    autoTable(doc, {
        startY: 90,
        head: [['Description', 'Quantity', 'Unit Price', 'Total']],
        body: invoice.items.map(item => [item.description, item.quantity, formatCurrency(item.unitPrice), formatCurrency(item.quantity * item.unitPrice)]),
        theme: 'striped',
        headStyles: { fillColor: [30, 144, 255] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, finalY + 15);
    doc.text(formatCurrency(totalAmount), 165, finalY + 15);
    
    doc.save(`Invoice-${invoice.id}.pdf`);
  };

  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["ID", "Customer", "Date", "Due Date", "Total", "Status"];
    const body = filteredInvoices.map(inv => [
        inv.id,
        inv.customer,
        inv.date,
        inv.dueDate,
        calculateTotal(inv.items),
        inv.status
    ]);
    const filename = "invoices_export";

    toast({ title: `Exporting Invoices`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

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
      doc.text("Invoices Report", 14, 16);
      autoTable(doc, { head: [headers], body: body as any, startY: 20 });
      doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
      XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };

  const handleGenerateNow = async (recurringInvoice: Invoice) => {
    if (!recurringInvoice.recurringDetails) return;

    const newInvoiceData: Omit<Invoice, 'id'> = {
        ...recurringInvoice,
        date: format(new Date(), "yyyy-MM-dd"),
        dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
        status: 'Draft',
        recurringDetails: undefined,
    };
    
    const updatedRecurringInvoiceData: Partial<Invoice> = {
        recurringDetails: {
            ...recurringInvoice.recurringDetails,
            nextDate: calculateNextDate(new Date(recurringInvoice.recurringDetails.nextDate), recurringInvoice.recurringDetails.frequency),
        }
    };
    
    try {
        const newId = await addInvoice(newInvoiceData);
        await updateInvoice(recurringInvoice.id, updatedRecurringInvoiceData);
        
        const updatedRecurringInvoice = { ...recurringInvoice, ...updatedRecurringInvoiceData } as Invoice;
        setInvoices(prev => [
            { id: newId, ...newInvoiceData },
            ...prev.map(inv => inv.id === recurringInvoice.id ? updatedRecurringInvoice : inv)
        ]);

        toast({ title: "Invoice Generated", description: `New invoice ${newId} has been created.` });
    } catch (error) {
        toast({ variant: 'destructive', title: "Generation Failed", description: "Could not generate recurring invoice." });
    }
  };


  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create and manage your invoices."
        breadcrumbs={[{ href: "/accounting", label: "Accounting" }, { label: "Invoicing" }]}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => openDialog(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        }
      />
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <TabsContent value="all">
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.customer}</TableCell>
                        <TableCell className="hidden md:table-cell">{invoice.date}</TableCell>
                        <TableCell>{formatCurrency(calculateTotal(invoice.items))}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border-transparent",
                              invoice.status === "Paid" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                              invoice.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                              invoice.status === "Overdue" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                              invoice.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
                            )}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog(invoice)}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadPDF(invoice, branding)}>Download PDF</DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Pending')}>Pending</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Paid')}>Paid</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Overdue')}>Overdue</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setInvoiceToDelete(invoice)}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="recurring">
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Frequency</TableHead>
                  <TableHead>Next Date</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredRecurringTemplates.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>{formatCurrency(calculateTotal(invoice.items))}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{invoice.recurringDetails?.frequency}</TableCell>
                    <TableCell>{invoice.recurringDetails?.nextDate}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleGenerateNow(invoice)}>Generate Now</Button>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDialog(invoice)}>Edit Template</DropdownMenuItem>
                                  <DropdownMenuItem>Pause</DropdownMenuItem>
                                  <DropdownMenuSeparator/>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setInvoiceToDelete(invoice)}>Delete Template</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
                  <DialogDescription>{editingInvoice ? 'Update the invoice details below.' : 'Fill in the details to create a new invoice.'}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="customer" render={({ field }) => (<FormItem><FormLabel>Customer</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl><SelectContent>{customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                      </div>
                       <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-full bg-muted/50">
                            <div className="space-y-0.5">
                              <FormLabel>Recurring Invoice</FormLabel>
                              <FormDescription>
                                If enabled, this will act as a template to generate invoices on a schedule.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {form.watch("isRecurring") && (
                          <FormField
                              control={form.control}
                              name="recurringFrequency"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Frequency</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Select frequency" />
                                              </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              <SelectItem value="monthly">Monthly</SelectItem>
                                              <SelectItem value="quarterly">Quarterly</SelectItem>
                                              <SelectItem value="annually">Annually</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      )}
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
                          <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">{editingInvoice ? 'Save Changes' : 'Create Invoice'}</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete invoice {invoiceToDelete?.id}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteInvoice}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
