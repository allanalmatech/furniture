
"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Video, Calendar as CalendarIcon, MoreHorizontal, Edit, Trash2, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppointments, addAppointment, updateAppointment, deleteAppointment } from "@/services/appointments-service";


const appointmentFormSchema = z.object({
    clientName: z.string().min(1, "Client name is required"),
    service: z.string().min(1, "Service description is required"),
    date: z.date({ required_error: "Please select a date." }),
    time: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i, { message: "Please enter a valid time (e.g., 02:30 PM)"}),
    videoCallProvider: z.enum(["Google Meet", "Zoom", "None"]).optional(),
});
type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

type FilterType = "upcoming" | "completed" | "cancelled" | "all";

const EmptyState = () => (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No appointments found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
            There are no appointments that match the current filter.
        </p>
    </div>
);


export default function AppointmentsPage() {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>("upcoming");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const data = await getAppointments();
                setAppointments(data);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch appointments." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAppointments();
    }, [toast]);

    const form = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentFormSchema),
        defaultValues: { clientName: "", service: "" },
    });
    
    const filteredAppointments = useMemo(() => {
        if (filter === 'all') return appointments;
        if (filter === 'upcoming') return appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed');
        return appointments.filter(a => a.status.toLowerCase() === filter);
    }, [appointments, filter]);

    useEffect(() => {
        if (isDialogOpen && selectedAppointment) {
            form.reset({
                ...selectedAppointment,
                date: parseISO(selectedAppointment.date),
            });
        } else {
            form.reset({ clientName: "", service: ""});
        }
    }, [isDialogOpen, selectedAppointment, form]);

    const onSubmit = async (values: AppointmentFormValues) => {
        const appointmentData = {
            ...values,
            date: format(values.date, "yyyy-MM-dd"),
            videoCallProvider: values.videoCallProvider === "None" ? undefined : values.videoCallProvider,
            videoCallLink: values.videoCallProvider && values.videoCallProvider !== "None" ? "#" : undefined,
        };

        if (selectedAppointment) {
            // Update existing appointment
            const updatedAppointment = { ...selectedAppointment, ...appointmentData };
            await updateAppointment(selectedAppointment.id, appointmentData);
            setAppointments(prev => prev.map(app => app.id === selectedAppointment.id ? updatedAppointment : app));
            toast({ title: "Appointment Updated", description: "The appointment details have been saved." });
        } else {
            // Create new appointment
            const newAppointmentData: Omit<Appointment, 'id'> = {
                ...appointmentData,
                status: "Pending",
            };
            const newId = await addAppointment(newAppointmentData);
            setAppointments(prev => [{ id: newId, ...newAppointmentData }, ...prev]);
            toast({ title: "Appointment Created", description: `A new appointment for ${values.clientName} has been scheduled.` });
        }
        setIsDialogOpen(false);
        setSelectedAppointment(null);
    };

    const handleStatusChange = async (id: string, status: Appointment['status']) => {
        await updateAppointment(id, { status });
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
        toast({ title: "Status Updated", description: `Appointment status changed to ${status}.` });
    };

    const handleDeleteAppointment = async () => {
        if (!selectedAppointment) return;
        await deleteAppointment(selectedAppointment.id);
        setAppointments(prev => prev.filter(app => app.id !== selectedAppointment.id));
        toast({ title: "Appointment Deleted", description: "The appointment has been removed." });
        setIsAlertOpen(false);
        setSelectedAppointment(null);
    };

    const openDialogForNew = () => {
        setSelectedAppointment(null);
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsDialogOpen(true);
    };
    
    const openAlertForDelete = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsAlertOpen(true);
    };

    return (
        <div>
            <PageHeader
                title="Appointments"
                description="Manage your client bookings and schedule."
                actions={
                    <Button onClick={openDialogForNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Appointment
                    </Button>
                }
            />
            <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
                <TabsList className="mb-4">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                           <Card key={i}>
                                <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                           </Card>
                        ))
                    ) : filteredAppointments.length > 0 ? (
                        filteredAppointments.map(app => (
                        <Card key={app.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{app.service}</CardTitle>
                                        <CardDescription>{app.clientName}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openDialogForEdit(app)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(app.id, "Pending")}>Pending</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(app.id, "Confirmed")}>Confirmed</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(app.id, "Completed")}>Completed</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(app.id, "Cancelled")}>Cancelled</DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => openAlertForDelete(app)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Badge
                                    className={cn(
                                        app.status === "Confirmed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                        app.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                                        app.status === "Completed" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                                        app.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                    )}
                                >
                                    {app.status}
                                </Badge>
                                <p className="font-medium">{format(parseISO(app.date), "PPP")}</p>
                                <p className="text-muted-foreground">{app.time}</p>
                            </CardContent>
                            {app.videoCallLink && app.status === 'Confirmed' && (
                                <CardFooter className="mt-auto pt-4">
                                    <Button asChild className="w-full">
                                        <a href={app.videoCallLink} target="_blank" rel="noopener noreferrer">
                                            <Video className="mr-2 h-4 w-4" />
                                            Join with {app.videoCallProvider}
                                        </a>
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                     <DialogHeader>
                        <DialogTitle>{selectedAppointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
                        <DialogDescription>
                            {selectedAppointment ? "Update the details for this appointment." : "Fill in the details below to schedule a new appointment."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="service" render={({ field }) => (<FormItem><FormLabel>Service</FormLabel><FormControl><Input placeholder="e.g., Project Kickoff Meeting" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < startOfToday()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input placeholder="e.g., 02:30 PM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="videoCallProvider" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Video Call (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'None'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="No video call" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="None">No video call</SelectItem>
                                            <SelectItem value="Google Meet">Google Meet</SelectItem>
                                            <SelectItem value="Zoom">Zoom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">{selectedAppointment ? "Save Changes" : "Create Appointment"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the appointment for <span className="font-semibold">{selectedAppointment?.clientName}</span>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedAppointment(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAppointment}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
