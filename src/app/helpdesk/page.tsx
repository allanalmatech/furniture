"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getTickets, addTicket, updateTicket, deleteTicket } from "@/services/helpdesk-service";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const ticketSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  subject: z.string().min(1, "Subject is required"),
  priority: z.enum(["Low", "Medium", "High"]),
  details: z.string().optional(),
});
type TicketFormValues = z.infer<typeof ticketSchema>;

const priorityColors: { [key in Ticket['priority']]: string } = {
  Low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  High: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const statusColors: { [key in Ticket['status']]: string } = {
  Open: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  "In Progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  Closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
};

const allTicketStatuses: Ticket['status'][] = ["Open", "In Progress", "Resolved", "Closed"];
const allPriorities: Ticket['priority'][] = ["Low", "Medium", "High"];

export default function HelpdeskPage() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | Ticket['status']>("All");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

    useEffect(() => {
        const fetchTickets = async () => {
            setIsLoading(true);
            try {
                const data = await getTickets();
                setTickets(data);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch tickets." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchTickets();
    }, [toast]);

    const form = useForm<TicketFormValues>({
      resolver: zodResolver(ticketSchema),
      defaultValues: { priority: "Low" }
    });

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket =>
            (statusFilter === 'All' || ticket.status === statusFilter) &&
            (ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
             ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             ticket.id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [tickets, statusFilter, searchQuery]);

    const handleUpdateStatus = async (ticketId: string, status: Ticket['status']) => {
        const originalTickets = [...tickets];
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
        try {
            await updateTicket(ticketId, { status });
            toast({ title: "Ticket Updated", description: `Ticket ${ticketId} status changed to ${status}.` });
        } catch (error) {
            setTickets(originalTickets);
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update ticket status." });
        }
    };

    const onSubmit = async (values: TicketFormValues) => {
      const newTicketData: Omit<Ticket, 'id'> = {
        status: "Open",
        createdDate: format(new Date(), 'yyyy-MM-dd'),
        ...values
      };
      try {
        const newId = await addTicket(newTicketData);
        setTickets(prev => [{ id: newId, ...newTicketData }, ...prev]);
        toast({ title: "Ticket Created", description: `New ticket from ${values.customerName} has been opened.` });
        setIsDialogOpen(false);
        form.reset({ customerName: "", subject: "", priority: "Low", details: "" });
      } catch (error) {
        toast({ variant: 'destructive', title: "Creation Failed", description: "Could not create the ticket." });
      }
    };
    
    const openDeleteDialog = (ticket: Ticket) => {
        setTicketToDelete(ticket);
        setIsAlertOpen(true);
    };

    const handleDeleteTicket = async () => {
        if (!ticketToDelete) return;
        const originalTickets = [...tickets];
        setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
        try {
            await deleteTicket(ticketToDelete.id);
            toast({ variant: 'destructive', title: "Ticket Deleted", description: `Ticket ${ticketToDelete.id} has been removed.` });
        } catch (error) {
            setTickets(originalTickets);
            toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the ticket." });
        } finally {
            setIsAlertOpen(false);
            setTicketToDelete(null);
        }
    };

    return (
        <div>
            <PageHeader
                title="Helpdesk"
                description="Manage customer support tickets and resolve issues efficiently."
                actions={
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          New Ticket
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                          <DialogTitle>Create New Support Ticket</DialogTitle>
                          <DialogDescription>Fill in the details for the new support ticket.</DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                              <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g. Issue with recent order" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{allPriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><FormControl><Textarea placeholder="Describe the issue in detail..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <DialogFooter>
                                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                  <Button type="submit">Create Ticket</Button>
                              </DialogFooter>
                          </form>
                      </Form>
                  </DialogContent>
                  </Dialog>
                }
            />
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="All">All</TabsTrigger>
                        <TabsTrigger value="Open">Open</TabsTrigger>
                        <TabsTrigger value="In Progress">In Progress</TabsTrigger>
                        <TabsTrigger value="Resolved">Resolved</TabsTrigger>
                    </TabsList>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search tickets..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>
            </Tabs>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Ticket ID</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="hidden md:table-cell">Customer</TableHead>
                                <TableHead className="hidden lg:table-cell">Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                          ) : filteredTickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{ticket.subject}</div>
                                    <div className="text-sm text-muted-foreground md:hidden">{ticket.customerName}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{ticket.customerName}</TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <Badge className={cn("border-transparent", priorityColors[ticket.priority])}>{ticket.priority}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn("border-transparent", statusColors[ticket.status])}>{ticket.status}</Badge>
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
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        {allTicketStatuses.map(status => (
                                                            <DropdownMenuItem key={status} onSelect={() => handleUpdateStatus(ticket.id, status)}>{status}</DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(ticket)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the ticket "{ticketToDelete?.subject}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTicketToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTicket}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
