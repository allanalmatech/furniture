
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, MoreHorizontal, Edit, Trash2, Download, FileSpreadsheet, FileText } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { Bid } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/role-context";
import { getBids, addBid, updateBid, deleteBid } from "@/services/bids-service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const bidSchema = z.object({
  title: z.string().min(1, "Bid title is required"),
  tenderNumber: z.string().min(1, "Tender number is required"),
  client: z.string().min(1, "Client name is required"),
  submissionDeadline: z.date({ required_error: "A submission deadline is required." }),
  amount: z.coerce.number().positive("Amount must be a positive number"),
});
type BidFormValues = z.infer<typeof bidSchema>;

export default function BidsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [bidToDelete, setBidToDelete] = useState<Bid | null>(null);

  useEffect(() => {
    const fetchBids = async () => {
      setIsLoading(true);
      try {
        const data = await getBids();
        setBids(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch bids.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBids();
  }, [toast]);
  
  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
  });

  const openDialog = (bid: Bid | null = null) => {
    setEditingBid(bid);
    form.reset(bid ? { ...bid, submissionDeadline: new Date(bid.submissionDeadline) } : { title: "", tenderNumber: "", client: "", amount: 0 });
    setIsDialogOpen(true);
  };
  
  const onSubmit = async (values: BidFormValues) => {
    if (!user) return;
    try {
      if (editingBid) {
        const updatedData: Partial<Bid> = { ...values, submissionDeadline: format(values.submissionDeadline, 'yyyy-MM-dd')};
        await updateBid(editingBid.id, updatedData);
        setBids(prev => prev.map(b => b.id === editingBid.id ? { ...b, ...updatedData } as Bid : b));
        toast({ title: "Bid Updated" });
      } else {
        const newBidData: Omit<Bid, 'id'> = {
          ...values,
          submissionDeadline: format(values.submissionDeadline, 'yyyy-MM-dd'),
          status: 'Draft',
          submittedBy: user.name,
        };
        const newId = await addBid(newBidData);
        setBids(prev => [{ id: newId, ...newBidData }, ...prev]);
        toast({ title: "Bid Created", description: "New bid has been saved as a draft." });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the bid.' });
    } finally {
      setIsDialogOpen(false);
      setEditingBid(null);
    }
  };
  
  const handleDelete = async () => {
    if (!bidToDelete) return;
    try {
        await deleteBid(bidToDelete.id);
        setBids(bids.filter(b => b.id !== bidToDelete.id));
        toast({ variant: 'destructive', title: "Bid Deleted" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Delete Failed' });
    } finally {
        setBidToDelete(null);
    }
  };

  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["ID", "Title", "Tender #", "Client", "Deadline", "Amount", "Status"];
    const body = bids.map(bid => [
        bid.id,
        bid.title,
        bid.tenderNumber,
        bid.client,
        bid.submissionDeadline,
        bid.amount,
        bid.status,
    ]);
    const filename = "bids_export";

    toast({ title: `Exporting Bids`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

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
      doc.text("Bids Report", 14, 16);
      autoTable(doc, { head: [headers], body: body as any, startY: 20 });
      doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bids");
      XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };


  return (
    <div>
      <PageHeader
        title="Bids Management"
        description="Track and manage all your bids and tenders."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" /> New Bid
            </Button>
          </div>
        }
      />
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Tender #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8" /></TableCell></TableRow>
            )) : bids.map((bid) => (
              <TableRow key={bid.id}>
                <TableCell className="font-medium">{bid.title}</TableCell>
                <TableCell className="hidden md:table-cell">{bid.tenderNumber}</TableCell>
                <TableCell>{bid.client}</TableCell>
                <TableCell>{bid.submissionDeadline}</TableCell>
                <TableCell>{formatCurrency(bid.amount)}</TableCell>
                <TableCell><Badge variant={bid.status === 'Won' ? 'default' : 'secondary'}>{bid.status}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(bid)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setBidToDelete(bid)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBid ? "Edit Bid" : "Create New Bid"}</DialogTitle>
            <DialogDescription>Fill in the details for the bid submission.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Bid Title</FormLabel><FormControl><Input placeholder="e.g., Office Furniture Supply" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tenderNumber" render={({ field }) => (<FormItem><FormLabel>Tender Number</FormLabel><FormControl><Input placeholder="e.g., T-2024-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="client" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><FormControl><Input placeholder="e.g., Ministry of Works" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="submissionDeadline" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Submission Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Bid Amount</FormLabel><FormControl><Input type="number" placeholder="5000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingBid ? "Save Changes" : "Create Bid"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!bidToDelete} onOpenChange={() => setBidToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action will permanently delete the bid for "{bidToDelete?.title}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
