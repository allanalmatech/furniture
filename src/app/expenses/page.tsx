
"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Upload, Download, FileSpreadsheet, FileText, Loader2, ScanLine, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
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
import { Input } from "@/components/ui/input";
import type { Expense } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { extractInvoiceData } from "@/ai/flows/extract-invoice-data-flow";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/services/accounting-service";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";


const expenseSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpenses();
        setExpenses(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch expenses.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, [toast]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });
  
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [expenses, searchQuery]);
  
  const openManualDialog = (expense: Expense | null) => {
    setEditingExpense(expense);
    if (expense) {
        form.reset({
            ...expense,
            date: parseISO(expense.date),
        });
    } else {
        form.reset({
            date: new Date(),
            category: "",
            description: "",
            amount: 0,
        });
    }
    setIsManualOpen(true);
  };

  const onManualSubmit = async (values: ExpenseFormValues) => {
    const expenseData = {
      ...values,
      date: format(values.date, "yyyy-MM-dd"),
    };
    
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
        setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? { id: editingExpense.id, ...expenseData } : exp));
        toast({ title: "Expense Updated", description: "The expense has been successfully updated." });
      } else {
        const newId = await addExpense(expenseData);
        setExpenses(prev => [{ id: newId, ...expenseData }, ...prev]);
        toast({ title: "Expense Added", description: "The new expense has been recorded." });
      }
      setIsManualOpen(false);
      setEditingExpense(null);
      form.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the expense.' });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanInvoice = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    toast({ title: "Scanning Invoice...", description: "The AI is analyzing your document." });

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
        const base64Image = reader.result as string;
        try {
            const extractedData = await extractInvoiceData({ invoiceImageUri: base64Image });
            const newExpenseData: Omit<Expense, 'id'> = { ...extractedData };
            const newId = await addExpense(newExpenseData);
            setExpenses(prev => [{ id: newId, ...newExpenseData }, ...prev]);
            
            toast({
                title: "Scan Complete!",
                description: `Expense for ${formatCurrency(newExpenseData.amount)} added.`,
            });
            setIsOcrOpen(false);
            setSelectedFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error("Error scanning invoice:", error);
            toast({
                variant: "destructive",
                title: "Scan Failed",
                description: "The AI could not extract data from the invoice. Please try again or enter it manually.",
            });
        } finally {
            setIsScanning(false);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({
            variant: "destructive",
            title: "File Error",
            description: "Could not read the selected file.",
        });
        setIsScanning(false);
    };
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
        await deleteExpense(expenseToDelete.id);
        setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        toast({ variant: 'destructive', title: "Expense Deleted", description: "The expense has been removed." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the expense." });
    } finally {
        setExpenseToDelete(null);
    }
  };

  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["Date", "Category", "Description", "Amount"];
    const body = filteredExpenses.map(e => [e.date, e.category, e.description, e.amount]);
    const filename = "expenses_export";

    toast({ title: `Exporting Expenses`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

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
      doc.text("Expenses Report", 14, 16);
      autoTable(doc, { head: [headers], body: body as any, startY: 20 });
      doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
      XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and manage your business expenses."
        breadcrumbs={[{ href: "/accounting", label: "Accounting" }, { label: "Expenses" }]}
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={isOcrOpen} onOpenChange={setIsOcrOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan Invoice with AI</DialogTitle>
                  <DialogDescription>
                    Upload an image of your invoice or receipt, and the AI will automatically extract the details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoice-file" className="sr-only">Upload Invoice</Label>
                    <Input id="invoice-file" type="file" accept="image/*" onChange={handleFileChange} disabled={isScanning} />
                  </div>
                  {imagePreview && (
                    <div className="relative aspect-video w-full mt-4 border rounded-md overflow-hidden">
                      <Image src={imagePreview} alt="Invoice preview" fill style={{ objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOcrOpen(false)} disabled={isScanning}>Cancel</Button>
                  <Button onClick={handleScanInvoice} disabled={!selectedFile || isScanning}>
                    {isScanning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="mr-2 h-4 w-4" />
                    )}
                    Scan Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
            <Button onClick={() => openManualDialog(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manually
            </Button>
          </div>
        }
      />
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses by description or category..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={5} className="p-4">
                            <Skeleton className="h-8 w-full" />
                        </TableCell>
                    </TableRow>
                ))
            ) : filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                 <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openManualDialog(expense)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setExpenseToDelete(expense)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense Manually"}</DialogTitle>
                    <DialogDescription>
                      {editingExpense ? "Update the details for your expense." : "Enter the details for your expense below."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Office Supplies" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Printer paper" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsManualOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingExpense ? "Save Changes" : "Save Expense"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete this expense record.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
