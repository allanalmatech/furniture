
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Calendar as CalendarIcon, Truck, Gauge, Wrench, Fuel, Eye, Upload, Download, FileSpreadsheet, FileText, FileUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Vehicle, FuelLog, MaintenanceSchedule } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, getFuelLogs, addFuelLog, updateFuelLog, deleteFuelLog, getMaintenanceSchedules, addMaintenanceSchedule, updateMaintenanceSchedule, deleteMaintenanceSchedule } from "@/services/fleet-service";
import { Skeleton } from "@/components/ui/skeleton";


const vehicleSchema = z.object({
  name: z.string().min(1, "Vehicle name is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  model: z.string().min(1, "Model year is required"),
  status: z.enum(["Active", "In Shop", "Decommissioned"]),
});
type VehicleFormValues = z.infer<typeof vehicleSchema>;

const fuelLogSchema = z.object({
    vehicleName: z.string().min(1, "Please select a vehicle."),
    date: z.date({ required_error: "Date is required." }),
    gallons: z.coerce.number().positive("Gallons must be a positive number."),
    cost: z.coerce.number().positive("Cost must be a positive number."),
    odometer: z.coerce.number().int().positive("Odometer reading must be a positive number."),
});
type FuelLogFormValues = z.infer<typeof fuelLogSchema>;

const maintenanceSchema = z.object({
    vehicleName: z.string().min(1, "Please select a vehicle."),
    serviceType: z.string().min(1, "Service type is required."),
    scheduledDate: z.date({ required_error: "Date is required." }),
    status: z.enum(["Scheduled", "In Progress", "Completed", "Cancelled"]),
    cost: z.coerce.number().nonnegative("Cost cannot be negative.").optional(),
});
type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;


const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
);

export default function FleetPage() {
    const { toast } = useToast();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState<{ vehicle: boolean; fuel: boolean; maintenance: boolean; }>({ vehicle: false, fuel: false, maintenance: false });
    const [alertOpen, setAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'vehicle' | 'fuel' | 'maintenance' } | null>(null);
    const [editingItem, setEditingItem] = useState<Vehicle | FuelLog | MaintenanceSchedule | null>(null);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importType, setImportType] = useState<"Vehicles" | "Fuel Logs" | "Maintenance">("Vehicles");

    const [selectedMonth, setSelectedMonth] = useState(new Date());


    const vehicleForm = useForm<VehicleFormValues>({ resolver: zodResolver(vehicleSchema) });
    const fuelForm = useForm<FuelLogFormValues>({ resolver: zodResolver(fuelLogSchema) });
    const maintenanceForm = useForm<MaintenanceFormValues>({ resolver: zodResolver(maintenanceSchema) });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [vehiclesData, fuelLogsData, maintenanceData] = await Promise.all([
                    getVehicles(),
                    getFuelLogs(),
                    getMaintenanceSchedules(),
                ]);
                setVehicles(vehiclesData);
                setFuelLogs(fuelLogsData);
                setMaintenance(maintenanceData);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch fleet data." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const openDialog = (type: 'vehicle' | 'fuel' | 'maintenance', item: any | null = null) => {
        setEditingItem(item);
        if (type === 'vehicle') {
            vehicleForm.reset(item ? { ...item } : { name: "", licensePlate: "", model: "", status: "Active" });
            setDialogOpen({ vehicle: true, fuel: false, maintenance: false });
        } else if (type === 'fuel') {
            fuelForm.reset(item ? { ...item, date: new Date(item.date) } : { vehicleName: "", gallons: 0, cost: 0, odometer: 0 });
            setDialogOpen({ vehicle: false, fuel: true, maintenance: false });
        } else {
            maintenanceForm.reset(item ? { ...item, scheduledDate: new Date(item.scheduledDate) } : { vehicleName: "", serviceType: "", status: "Scheduled", cost: 0 });
            setDialogOpen({ vehicle: false, fuel: false, maintenance: true });
        }
    };
    
    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsSheetOpen(true);
    };

    const closeDialogs = () => {
        setDialogOpen({ vehicle: false, fuel: false, maintenance: false });
        setEditingItem(null);
    }

    const onVehicleSubmit = async (data: VehicleFormValues) => {
        try {
            if (editingItem && 'licensePlate' in editingItem) {
                const updatedVehicleData: Partial<Vehicle> = data;
                await updateVehicle(editingItem.id, updatedVehicleData);
                setVehicles(prev => prev.map(v => v.id === editingItem.id ? { ...v, ...updatedVehicleData } : v));
                toast({ title: "Vehicle Updated" });
            } else {
                const newVehicleData: Omit<Vehicle, 'id'> = {
                    ...data,
                    lastService: format(new Date(), 'yyyy-MM-dd')
                };
                const newId = await addVehicle(newVehicleData);
                setVehicles(prev => [{ id: newId, ...newVehicleData }, ...prev]);
                toast({ title: "Vehicle Added" });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save vehicle." });
        } finally {
            closeDialogs();
        }
    };

    const onFuelSubmit = async (data: FuelLogFormValues) => {
        const newLogData = { ...data, date: format(data.date, 'yyyy-MM-dd') };
        try {
            if (editingItem && 'gallons' in editingItem) {
                await updateFuelLog(editingItem.id, newLogData);
                setFuelLogs(prev => prev.map(l => l.id === editingItem.id ? { ...l, ...newLogData } as FuelLog : l));
                toast({ title: "Fuel Log Updated" });
            } else {
                const newId = await addFuelLog(newLogData);
                setFuelLogs(prev => [{ id: newId, ...newLogData }, ...prev]);
                toast({ title: "Fuel Log Added" });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save fuel log." });
        } finally {
            closeDialogs();
        }
    };

    const onMaintenanceSubmit = async (data: MaintenanceFormValues) => {
        const newMaintData = { ...data, scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd')};
        try {
            if (editingItem && 'serviceType' in editingItem) {
                await updateMaintenanceSchedule(editingItem.id, newMaintData);
                setMaintenance(prev => prev.map(m => m.id === editingItem.id ? { ...m, ...newMaintData } as MaintenanceSchedule : m));
                toast({ title: "Maintenance Updated" });
            } else {
                const newId = await addMaintenanceSchedule(newMaintData);
                setMaintenance(prev => [{ id: newId, ...newMaintData }, ...prev]);
                toast({ title: "Maintenance Scheduled" });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save maintenance schedule." });
        } finally {
            closeDialogs();
        }
    };

    const openDeleteConfirmation = (id: string, type: 'vehicle' | 'fuel' | 'maintenance') => {
        setItemToDelete({ id, type });
        setAlertOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            switch(itemToDelete.type) {
                case 'vehicle': 
                    await deleteVehicle(itemToDelete.id);
                    setVehicles(v => v.filter(i => i.id !== itemToDelete.id)); 
                    break;
                case 'fuel': 
                    await deleteFuelLog(itemToDelete.id);
                    setFuelLogs(f => f.filter(i => i.id !== itemToDelete.id)); 
                    break;
                case 'maintenance': 
                    await deleteMaintenanceSchedule(itemToDelete.id);
                    setMaintenance(m => m.filter(i => i.id !== itemToDelete.id)); 
                    break;
            }
            toast({ title: "Item Deleted", description: `The selected ${itemToDelete.type} has been deleted.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the item." });
        } finally {
            setAlertOpen(false);
            setItemToDelete(null);
        }
    };

    const handleImportSubmit = () => {
        if (!importFile) {
            toast({ variant: 'destructive', title: "No file selected", description: "Please select a CSV file to import."});
            return;
        }
        toast({ title: `Importing ${importType}`, description: `Processing ${importFile.name}. This feature is a demo.` });
        setIsImportOpen(false);
        setImportFile(null);
    };

    const handleExport = (format: "csv" | "pdf" | "xlsx", dataType: "vehicles" | "fuel" | "maintenance") => {
        let data: any[] = [];
        let headers: string[] = [];
        let body: (string | number | undefined)[][] = [];
        let filename = "";

        if (dataType === "vehicles") {
            data = filteredVehicles;
            headers = ["ID", "Name", "License Plate", "Model", "Status", "Last Service"];
            body = data.map(v => [v.id, v.name, v.licensePlate, v.model, v.status, v.lastService]);
            filename = "fleet_vehicles";
        } else if (dataType === "fuel") {
            data = filteredFuelLogs;
            headers = ["ID", "Vehicle", "Date", "Gallons", "Cost", "Odometer"];
            body = data.map(f => [f.id, f.vehicleName, f.date, f.gallons, f.cost, f.odometer]);
            filename = "fleet_fuel_logs";
        } else if (dataType === "maintenance") {
            data = filteredMaintenance;
            headers = ["ID", "Vehicle", "Service Type", "Date", "Status", "Cost"];
            body = data.map(m => [m.id, m.vehicleName, m.serviceType, m.scheduledDate, m.status, m.cost]);
            filename = "fleet_maintenance";
        }
        
        toast({ title: `Exporting ${filename.replace(/_/g, ' ')}`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

        if (format === 'csv') {
            const csvContent = [
                headers.join(','),
                ...body.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(filename.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 14, 16);
            
            const pdfBody = body.map(row => row.map((cell, index) => {
                const header = headers[index].toLowerCase();
                if (header === 'cost' && typeof cell === 'number') {
                    return formatCurrency(cell);
                }
                return cell ?? '-';
            }));

            autoTable(doc, {
                head: [headers],
                body: pdfBody,
                startY: 20,
            });
            doc.save(`${filename}.pdf`);
        } else if (format === 'xlsx') {
            const worksheetData = [headers, ...body];
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, filename.replace(/_/g, ' '));
            XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
        }
    };


    const filteredVehicles = useMemo(() => vehicles.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())), [vehicles, searchQuery]);
    const filteredFuelLogs = useMemo(() => fuelLogs.filter(f => f.vehicleName.toLowerCase().includes(searchQuery.toLowerCase())), [fuelLogs, searchQuery]);
    const filteredMaintenance = useMemo(() => maintenance.filter(m => m.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) || m.serviceType.toLowerCase().includes(searchQuery.toLowerCase())), [maintenance, searchQuery]);
    
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === "Active").length;

    const maintenanceForMonth = useMemo(() => maintenance.filter(
        (m) => m.status === "Scheduled" && isSameMonth(new Date(m.scheduledDate), selectedMonth)
    ).length, [maintenance, selectedMonth]);

    const fuelCostForMonth = useMemo(() => fuelLogs
        .filter(f => isSameMonth(new Date(f.date), selectedMonth))
        .reduce((sum, log) => sum + log.cost, 0), [fuelLogs, selectedMonth]);

  return (
    <div>
      <PageHeader
        title="Fleet Management"
        description="Manage your vehicles, fuel logs, and maintenance schedules."
        actions={
             <div className="flex items-center gap-2">
                <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) setImportFile(null); setIsImportOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    </DialogTrigger>
                </Dialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('csv', 'vehicles')}>Export Vehicles (CSV)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx', 'vehicles')}>Export Vehicles (XLSX)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'vehicles')}>Export Vehicles (PDF)</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleExport('csv', 'fuel')}>Export Fuel Logs (CSV)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx', 'fuel')}>Export Fuel Logs (XLSX)</DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleExport('pdf', 'fuel')}>Export Fuel Logs (PDF)</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleExport('csv', 'maintenance')}>Export Maintenance (CSV)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx', 'maintenance')}>Export Maintenance (XLSX)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'maintenance')}>Export Maintenance (PDF)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="fuel-logs">Fuel Logs</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <div className="flex justify-between items-center mb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <TabsContent value="overview" className="m-0" />
            <TabsContent value="vehicles" className="m-0">
                <Button onClick={() => openDialog('vehicle')}><Plus className="mr-2 h-4 w-4" /> Add Vehicle</Button>
            </TabsContent>
            <TabsContent value="fuel-logs" className="m-0">
                <Button onClick={() => openDialog('fuel')}><Plus className="mr-2 h-4 w-4" /> Add Fuel Log</Button>
            </TabsContent>
            <TabsContent value="maintenance" className="m-0">
                <Button onClick={() => openDialog('maintenance')}><Plus className="mr-2 h-4 w-4" /> Schedule Maintenance</Button>
            </TabsContent>
        </div>

        <TabsContent value="overview">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Overview for {format(selectedMonth, 'MMMM yyyy')}</h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-auto justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Change Month
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            month={selectedMonth}
                            onMonthChange={setSelectedMonth}
                            initialFocus
                            className="p-0"
                            classNames={{
                                head: 'hidden',
                                tbody: 'hidden',
                                caption_label: "text-lg",
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Vehicles" value={totalVehicles} icon={Truck} isLoading={isLoading} />
                <StatCard title="Active Vehicles" value={`${activeVehicles} / ${totalVehicles}`} icon={Gauge} isLoading={isLoading} />
                <StatCard title="Maintenance This Month" value={maintenanceForMonth} icon={Wrench} isLoading={isLoading} />
                <StatCard title="Fuel Cost This Month" value={formatCurrency(fuelCostForMonth)} icon={Fuel} isLoading={isLoading} />
            </div>
        </TabsContent>

        <TabsContent value="vehicles">
            <Card>
                <CardHeader><CardTitle>All Vehicles</CardTitle><CardDescription>A complete list of your company's vehicles.</CardDescription></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead className="hidden md:table-cell">License Plate</TableHead><TableHead className="hidden md:table-cell">Last Service</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 4}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8"/></TableCell></TableRow>
                            )) :
                            filteredVehicles.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell><div className="font-medium">{item.name}</div><div className="text-sm text-muted-foreground">{item.model}</div></TableCell>
                                    <TableCell className="hidden md:table-cell">{item.licensePlate}</TableCell>
                                    <TableCell className="hidden md:table-cell">{item.lastService}</TableCell>
                                    <TableCell><Badge className={cn("border-transparent", item.status === "Active" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", item.status === "In Shop" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", item.status === "Decommissioned" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>{item.status}</Badge></TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewDetails(item)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDialog('vehicle', item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(item.id, 'vehicle')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="fuel-logs">
             <Card>
                <CardHeader><CardTitle>Fuel Logs</CardTitle><CardDescription>A record of all fuel purchases.</CardDescription></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Date</TableHead><TableHead className="hidden md:table-cell">Gallons</TableHead><TableHead className="hidden lg:table-cell">Odometer</TableHead><TableHead>Cost</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 4}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8"/></TableCell></TableRow>
                            )) :
                            filteredFuelLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.vehicleName}</TableCell>
                                    <TableCell>{log.date}</TableCell>
                                    <TableCell className="hidden md:table-cell">{log.gallons.toFixed(2)}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{log.odometer.toLocaleString()}</TableCell>
                                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDialog('fuel', log)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(log.id, 'fuel')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="maintenance">
             <Card>
                <CardHeader><CardTitle>Maintenance Schedules</CardTitle><CardDescription>Track upcoming and past maintenance for all your vehicles.</CardDescription></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Service Type</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Cost</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 4}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8"/></TableCell></TableRow>
                            )) :
                            filteredMaintenance.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.vehicleName}</TableCell>
                                    <TableCell>{item.serviceType}</TableCell>
                                    <TableCell className="hidden md:table-cell">{item.scheduledDate}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{item.cost ? formatCurrency(item.cost) : '-'}</TableCell>
                                    <TableCell><Badge className={cn("border-transparent", item.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", item.status === "In Progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", item.status === "Scheduled" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", item.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>{item.status}</Badge></TableCell>
                                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDialog('maintenance', item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(item.id, 'maintenance')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={dialogOpen.vehicle} onOpenChange={(isOpen) => { if (!isOpen) closeDialogs(); else setDialogOpen({ vehicle: isOpen, fuel: false, maintenance: false }); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle><DialogDescription>Fill in the details for the vehicle.</DialogDescription></DialogHeader>
            <Form {...vehicleForm}><form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-4">
                <FormField control={vehicleForm.control} name="name" render={({ field }) => <FormItem><FormLabel>Vehicle Name</FormLabel><FormControl><Input placeholder="e.g., Ford Transit" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={vehicleForm.control} name="licensePlate" render={({ field }) => <FormItem><FormLabel>License Plate</FormLabel><FormControl><Input placeholder="e.g., 1ABC234" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={vehicleForm.control} name="model" render={({ field }) => <FormItem><FormLabel>Model/Year</FormLabel><FormControl><Input placeholder="e.g., 2022" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={vehicleForm.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="In Shop">In Shop</SelectItem><SelectItem value="Decommissioned">Decommissioned</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <DialogFooter><Button type="button" variant="ghost" onClick={closeDialogs}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen.fuel} onOpenChange={(isOpen) => { if (!isOpen) closeDialogs(); else setDialogOpen({ vehicle: false, fuel: isOpen, maintenance: false }); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Fuel Log" : "Add Fuel Log"}</DialogTitle><DialogDescription>Enter the details for the fuel purchase.</DialogDescription></DialogHeader>
            <Form {...fuelForm}><form onSubmit={fuelForm.handleSubmit(onFuelSubmit)} className="space-y-4">
                <FormField control={fuelForm.control} name="vehicleName" render={({ field }) => <FormItem><FormLabel>Vehicle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger></FormControl><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={fuelForm.control} name="date" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                <FormField control={fuelForm.control} name="gallons" render={({ field }) => <FormItem><FormLabel>Gallons</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={fuelForm.control} name="cost" render={({ field }) => <FormItem><FormLabel>Total Cost</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={fuelForm.control} name="odometer" render={({ field }) => <FormItem><FormLabel>Odometer</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <DialogFooter><Button type="button" variant="ghost" onClick={closeDialogs}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen.maintenance} onOpenChange={(isOpen) => { if (!isOpen) closeDialogs(); else setDialogOpen({ vehicle: false, fuel: false, maintenance: isOpen }); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Maintenance" : "Schedule Maintenance"}</DialogTitle><DialogDescription>Enter the details for the maintenance task.</DialogDescription></DialogHeader>
            <Form {...maintenanceForm}><form onSubmit={maintenanceForm.handleSubmit(onMaintenanceSubmit)} className="space-y-4">
                <FormField control={maintenanceForm.control} name="vehicleName" render={({ field }) => <FormItem><FormLabel>Vehicle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger></FormControl><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={maintenanceForm.control} name="serviceType" render={({ field }) => <FormItem><FormLabel>Service Type</FormLabel><FormControl><Input placeholder="e.g., Oil Change" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={maintenanceForm.control} name="scheduledDate" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                <FormField control={maintenanceForm.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={maintenanceForm.control} name="cost" render={({ field }) => <FormItem><FormLabel>Cost (Optional)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                <DialogFooter><Button type="button" variant="ghost" onClick={closeDialogs}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete the selected item.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-xl w-full">
                {selectedVehicle && (
                    <>
                    <SheetHeader>
                        <SheetTitle className="text-2xl">{selectedVehicle.name}</SheetTitle>
                        <SheetDescription>{selectedVehicle.model} | {selectedVehicle.licensePlate}</SheetDescription>
                    </SheetHeader>
                    <Separator className="my-4" />
                    <Tabs defaultValue="fuel" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="fuel">Fuel History</TabsTrigger>
                            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fuel" className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Gallons</TableHead>
                                        <TableHead>Cost</TableHead>
                                        <TableHead>Odometer</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fuelLogs.filter(log => log.vehicleName === selectedVehicle.name).map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.date}</TableCell>
                                            <TableCell>{log.gallons.toFixed(2)}</TableCell>
                                            <TableCell>{formatCurrency(log.cost)}</TableCell>
                                            <TableCell>{log.odometer.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="maintenance" className="mt-4">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {maintenance.filter(m => m.vehicleName === selectedVehicle.name).map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell>{m.scheduledDate}</TableCell>
                                            <TableCell>{m.serviceType}</TableCell>
                                            <TableCell><Badge className={cn("border-transparent", m.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", m.status === "In Progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", m.status === "Scheduled" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", m.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>{m.status}</Badge></TableCell>
                                            <TableCell>{m.cost ? formatCurrency(m.cost) : '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                     <SheetFooter className="mt-6 pt-6 border-t">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Close</Button>
                    </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
        <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) setImportFile(null); setIsImportOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import {importType}</DialogTitle>
                    <DialogDescription>Upload a CSV file to bulk-add {importType.toLowerCase()}. This feature is a demo.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label>Select Data Type</Label>
                         <Select value={importType} onValueChange={(value) => setImportType(value as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Vehicles">Vehicles</SelectItem>
                                <SelectItem value="Fuel Logs">Fuel Logs</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="import-file">Upload your CSV file</Label>
                        <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                            <FileUp className="h-10 w-10 text-muted-foreground mb-2"/>
                            <p className="text-sm font-medium mb-1">
                                {importFile ? importFile.name : "Drag & drop your file here"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                or click to browse
                            </p>
                            <Input 
                                id="import-file" 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".csv"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                    <Button onClick={handleImportSubmit} disabled={!importFile}>
                        <Upload className="mr-2 h-4 w-4"/>
                        Import {importType}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
