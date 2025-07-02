
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, MoreHorizontal, Trash2, X, Search, Edit } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BillOfMaterial, WorkOrder, ProductionPlan, Inventory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getInventoryItems } from "@/services/inventory-service";
import { getBoms, addBom, updateBom, deleteBom, getWorkOrders, addWorkOrder, updateWorkOrder, deleteWorkOrder, getProductionPlans, addProductionPlan, updateProductionPlan, deleteProductionPlan } from "@/services/manufacturing-service";
import { Skeleton } from "@/components/ui/skeleton";


const bomSchema = z.object({
  productName: z.string().min(1, "Product is required"),
  components: z.array(z.object({
    componentId: z.string().min(1, "Component is required"),
    componentName: z.string(),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one component is required"),
});
type BomFormValues = z.infer<typeof bomSchema>;

const workOrderSchema = z.object({
  productName: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  dueDate: z.date({ required_error: "A due date is required" }),
});
type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

const productionPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  startDate: z.date({ required_error: "A start date is required" }),
  endDate: z.date({ required_error: "An end date is required" }),
});
type ProductionPlanFormValues = z.infer<typeof productionPlanSchema>;

const workOrderStatuses: WorkOrder['status'][] = ["Pending", "In Progress", "Completed", "Cancelled"];

export default function ManufacturingPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isBomDialogOpen, setIsBomDialogOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BillOfMaterial | null>(null);
  const [isWoDialogOpen, setIsWoDialogOpen] = useState(false);
  const [editingWo, setEditingWo] = useState<WorkOrder | null>(null);
  const [isPpDialogOpen, setIsPpDialogOpen] = useState(false);
  const [editingPp, setEditingPp] = useState<ProductionPlan | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'bom' | 'wo' | 'pp' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, bomsData, woData, ppData] = await Promise.all([
          getInventoryItems(),
          getBoms(),
          getWorkOrders(),
          getProductionPlans()
        ]);
        setInventory(inventoryData);
        setBoms(bomsData);
        setWorkOrders(woData);
        setProductionPlans(ppData);
      } catch (error) {
        console.error("Failed to load manufacturing data:", error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to load manufacturing data." });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const rawMaterials = useMemo(() => inventory.filter(i => i.category !== 'Tables' && i.category !== 'Storage' && i.category !== 'Kitchen'), [inventory]);
  const finishedGoods = useMemo(() => inventory.filter(i => i.category === 'Tables' || i.category === 'Storage' || i.category === 'Kitchen'), [inventory]);

  const bomForm = useForm<BomFormValues>({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      productName: "",
      components: [{ componentId: "", componentName: "", quantity: 1 }],
    }
  });
  const { fields, append, remove } = useFieldArray({
    control: bomForm.control,
    name: "components",
  });

  const woForm = useForm<WorkOrderFormValues>({ resolver: zodResolver(workOrderSchema) });
  const ppForm = useForm<ProductionPlanFormValues>({ resolver: zodResolver(productionPlanSchema) });
  
  const filteredBoms = useMemo(() => boms.filter(b => b.productName.toLowerCase().includes(searchQuery.toLowerCase())), [boms, searchQuery]);
  const filteredWorkOrders = useMemo(() => workOrders.filter(w => w.productName.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase())), [workOrders, searchQuery]);
  const filteredProductionPlans = useMemo(() => productionPlans.filter(p => p.planName.toLowerCase().includes(searchQuery.toLowerCase())), [productionPlans, searchQuery]);

  const openBomDialog = (bom: BillOfMaterial | null = null) => {
    setEditingBom(bom);
    if (bom) {
        bomForm.reset(bom);
    } else {
        bomForm.reset({ productName: "", components: [{ componentId: "", componentName: "", quantity: 1 }]});
    }
    setIsBomDialogOpen(true);
  };

  const onBomSubmit = async (values: BomFormValues) => {
    try {
        if (editingBom) {
            await updateBom(editingBom.id, values);
            setBoms(prev => prev.map(b => b.id === editingBom.id ? { ...editingBom, ...values } : b));
            toast({ title: "Bill of Materials Updated" });
        } else {
            const newId = await addBom(values);
            setBoms(prev => [{ id: newId, ...values }, ...prev]);
            toast({ title: "Bill of Materials Created", description: `BoM for ${values.productName} has been saved.` });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save Bill of Materials." });
    } finally {
        setIsBomDialogOpen(false);
    }
  };
  
  const openWoDialog = (wo: WorkOrder | null = null) => {
    setEditingWo(wo);
    if (wo) {
        woForm.reset({
            ...wo,
            dueDate: new Date(wo.dueDate),
        });
    } else {
        woForm.reset({ productName: "", quantity: 1 });
    }
    setIsWoDialogOpen(true);
  };

  const onWoSubmit = async (values: WorkOrderFormValues) => {
    const newWoData = { ...values, dueDate: format(values.dueDate, 'yyyy-MM-dd') };
    try {
        if (editingWo) {
            await updateWorkOrder(editingWo.id, newWoData);
            setWorkOrders(prev => prev.map(w => w.id === editingWo.id ? { ...editingWo, ...newWoData } : w));
            toast({ title: "Work Order Updated" });
        } else {
            const newWo: Omit<WorkOrder, 'id'> = {
                ...newWoData,
                status: 'Pending',
            };
            const newId = await addWorkOrder(newWo);
            setWorkOrders(prev => [{ id: newId, ...newWo }, ...prev]);
            toast({ title: "Work Order Created", description: `Work order for ${newWo.quantity}x ${newWo.productName} has been created.` });
        }
    } catch (error) {
         toast({ variant: "destructive", title: "Save Failed", description: "Could not save Work Order." });
    } finally {
        setIsWoDialogOpen(false);
    }
  };
  
  const openPpDialog = (pp: ProductionPlan | null = null) => {
    setEditingPp(pp);
    if (pp) {
        ppForm.reset({
            ...pp,
            startDate: new Date(pp.startDate),
            endDate: new Date(pp.endDate),
        });
    } else {
        ppForm.reset({ planName: "" });
    }
    setIsPpDialogOpen(true);
  };

  const onPpSubmit = async (values: ProductionPlanFormValues) => {
    const newPpData = { ...values, startDate: format(values.startDate, 'yyyy-MM-dd'), endDate: format(values.endDate, 'yyyy-MM-dd')};
    try {
        if (editingPp) {
            await updateProductionPlan(editingPp.id, newPpData);
            setProductionPlans(prev => prev.map(p => p.id === editingPp.id ? { ...editingPp, ...newPpData } : p));
            toast({ title: "Production Plan Updated" });
        } else {
            const newPp: Omit<ProductionPlan, 'id'> = {
              ...newPpData,
              status: 'Draft',
            };
            const newId = await addProductionPlan(newPp);
            setProductionPlans(prev => [{ id: newId, ...newPp }, ...prev]);
            toast({ title: "Production Plan Created", description: `Plan "${newPp.planName}" has been saved as a draft.` });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save Production Plan." });
    } finally {
        setIsPpDialogOpen(false);
    }
  };

  const handleUpdateWoStatus = async (id: string, status: WorkOrder['status']) => {
    try {
        await updateWorkOrder(id, { status });
        setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status } : wo));
        toast({ title: "Work Order Updated", description: `Status for ${id} updated to ${status}.`});
    } catch (error) {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update Work Order status." });
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    let itemName = '';
    
    try {
        if (type === 'bom') {
            const item = boms.find(i => i.id === id);
            itemName = item?.productName || '';
            await deleteBom(id);
            setBoms(b => b.filter(i => i.id !== id));
        } else if (type === 'wo') {
            const item = workOrders.find(i => i.id === id);
            itemName = item?.id || '';
            await deleteWorkOrder(id);
            setWorkOrders(w => w.filter(i => i.id !== id));
        } else if (type === 'pp') {
            const item = productionPlans.find(i => i.id === id);
            itemName = item?.planName || '';
            await deleteProductionPlan(id);
            setProductionPlans(p => p.filter(i => i.id !== id));
        }
        toast({ variant: 'destructive', title: "Item Deleted", description: `${type.toUpperCase()} '${itemName}' has been removed.` });
    } catch (error) {
         toast({ variant: "destructive", title: "Delete Failed", description: `Could not delete ${type}.` });
    } finally {
        setIsAlertOpen(false);
        setItemToDelete(null);
    }
  };
  
  const openDeleteConfirmation = (id: string, type: 'bom' | 'wo' | 'pp') => {
      setItemToDelete({ id, type });
      setIsAlertOpen(true);
  };


  return (
    <div>
      <PageHeader
        title="Manufacturing"
        description="Manage bills of materials, work orders, and production planning."
      />
        <Tabs defaultValue="bom">
            <TabsList className="mb-4 grid w-full grid-cols-3">
                <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
                <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
                <TabsTrigger value="planning">Production Planning</TabsTrigger>
            </TabsList>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search current tab..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <TabsContent value="bom" className="m-0">
                    <Button onClick={() => openBomDialog(null)}><Plus className="mr-2 h-4 w-4" /> Create New BoM</Button>
                </TabsContent>
                <TabsContent value="work-orders" className="m-0">
                    <Button onClick={() => openWoDialog(null)}><Plus className="mr-2 h-4 w-4" /> New Work Order</Button>
                </TabsContent>
                <TabsContent value="planning" className="m-0">
                    <Button onClick={() => openPpDialog(null)}><Plus className="mr-2 h-4 w-4" /> Create Production Plan</Button>
                </TabsContent>
            </div>
            
            <TabsContent value="bom">
              <Card>
                <CardHeader><CardTitle>Bill of Materials (BoM)</CardTitle><CardDescription>Define the components and quantities required to build a product.</CardDescription></CardHeader>
                <CardContent className="p-0"><Table><TableHeader><TableRow>
                    <TableHead>BoM ID</TableHead><TableHead>Product Name</TableHead><TableHead className="hidden md:table-cell text-center">Component Count</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow></TableHeader><TableBody>
                    {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8"/></TableCell></TableRow>) :
                    filteredBoms.map((bom) => (<TableRow key={bom.id}><TableCell className="font-medium">{bom.id}</TableCell><TableCell>{bom.productName}</TableCell><TableCell className="hidden md:table-cell text-center">{bom.components.length}</TableCell><TableCell className="text-right">
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openBomDialog(bom)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(bom.id, 'bom')}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                    </TableCell></TableRow>))}
                </TableBody></Table></CardContent>
              </Card>
              <Dialog open={isBomDialogOpen} onOpenChange={setIsBomDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editingBom ? "Edit Bill of Materials" : "Create New Bill of Materials"}</DialogTitle><DialogDescription>Define the recipe for a manufactured product.</DialogDescription></DialogHeader>
                    <Form {...bomForm}><form onSubmit={bomForm.handleSubmit(onBomSubmit)} className="space-y-6 pt-4">
                        <FormField control={bomForm.control} name="productName" render={({ field }) => (
                            <FormItem><FormLabel>Product to Manufacture</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a finished good" /></SelectTrigger></FormControl>
                                    <SelectContent>{finishedGoods.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>)} />
                        <div><h3 className="text-lg font-medium mb-2">Components</h3><div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2 p-3 bg-muted rounded-md">
                                    <FormField control={bomForm.control} name={`components.${index}.componentId`} render={({ field }) => (
                                        <FormItem className="flex-grow"><FormLabel>Component</FormLabel>
                                            <Select onValueChange={(value) => {
                                                field.onChange(value);
                                                const material = rawMaterials.find(m => m.id === value);
                                                if (material) bomForm.setValue(`components.${index}.componentName`, material.name);
                                            }} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a material" /></SelectTrigger></FormControl>
                                                <SelectContent>{rawMaterials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={bomForm.control} name={`components.${index}.quantity`} render={({ field }) => (
                                        <FormItem className="w-24"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => append({ componentId: "", componentName: "", quantity: 1 })}><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
                        </div></div>
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsBomDialogOpen(false)}>Cancel</Button><Button type="submit">Save BoM</Button></DialogFooter>
                    </form></Form>
                </DialogContent>
              </Dialog>
            </TabsContent>
            <TabsContent value="work-orders">
              <Card>
                <CardHeader><CardTitle>Work Orders</CardTitle><CardDescription>Create and track manufacturing jobs for specific products and quantities.</CardDescription></CardHeader>
                <CardContent className="p-0"><Table><TableHeader><TableRow>
                    <TableHead>WO #</TableHead><TableHead>Product</TableHead><TableHead className="hidden md:table-cell">Quantity</TableHead><TableHead className="hidden md:table-cell">Due Date</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow></TableHeader><TableBody>
                    {isLoading ? Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8"/></TableCell></TableRow>) :
                    filteredWorkOrders.map((order) => (<TableRow key={order.id}><TableCell className="font-medium">{order.id}</TableCell><TableCell>{order.productName}</TableCell><TableCell className="hidden md:table-cell">{order.quantity}</TableCell><TableCell className="hidden md:table-cell">{order.dueDate}</TableCell>
                        <TableCell><Badge className={cn(
                            order.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                            order.status === "In Progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                            order.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                            order.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                        )}>{order.status}</Badge></TableCell>
                        <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openWoDialog(order)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSub><DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent>
                                {workOrderStatuses.map(status => <DropdownMenuItem key={status} onClick={() => handleUpdateWoStatus(order.id, status)}>{status}</DropdownMenuItem>)}
                            </DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(order.id, 'wo')}><Trash2 className="mr-2 h-4 w-4" />Cancel Order</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>))}
                </TableBody></Table></CardContent>
              </Card>
              <Dialog open={isWoDialogOpen} onOpenChange={setIsWoDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editingWo ? "Edit Work Order" : "Create New Work Order"}</DialogTitle><DialogDescription>Schedule a new manufacturing job.</DialogDescription></DialogHeader>
                    <Form {...woForm}><form onSubmit={woForm.handleSubmit(onWoSubmit)} className="space-y-4 pt-4">
                        <FormField control={woForm.control} name="productName" render={({ field }) => (<FormItem><FormLabel>Product</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a product with a BoM" /></SelectTrigger></FormControl>
                                <SelectContent>{boms.map(b => <SelectItem key={b.id} value={b.productName}>{b.productName}</SelectItem>)}</SelectContent>
                            </Select><FormMessage /></FormItem>)} />
                        <FormField control={woForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity to Produce</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={woForm.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsWoDialogOpen(false)}>Cancel</Button><Button type="submit">Save Work Order</Button></DialogFooter>
                    </form></Form>
                </DialogContent>
              </Dialog>
            </TabsContent>
            <TabsContent value="planning">
                <Card>
                    <CardHeader><CardTitle>Production Planning</CardTitle><CardDescription>Schedule and manage your manufacturing runs to meet demand.</CardDescription></CardHeader>
                    <CardContent className="p-0"><Table><TableHeader><TableRow>
                        <TableHead>Plan ID</TableHead><TableHead>Plan Name</TableHead><TableHead className="hidden md:table-cell">Date Range</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow></TableHeader><TableBody>
                        {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8"/></TableCell></TableRow>) :
                        filteredProductionPlans.map((plan) => (<TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.id}</TableCell>
                            <TableCell>{plan.planName}</TableCell>
                            <TableCell className="hidden md:table-cell">{plan.startDate} to {plan.endDate}</TableCell>
                            <TableCell><Badge className={cn(
                                plan.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                plan.status === "Active" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                                plan.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
                            )}>{plan.status}</Badge></TableCell>
                            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openPpDialog(plan)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                <DropdownMenuItem disabled>View Plan</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirmation(plan.id, 'pp')}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu></TableCell>
                        </TableRow>))}
                    </TableBody></Table></CardContent>
                </Card>
                 <Dialog open={isPpDialogOpen} onOpenChange={setIsPpDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{editingPp ? "Edit Production Plan" : "Create New Production Plan"}</DialogTitle><DialogDescription>Define a new production plan for a specific period.</DialogDescription></DialogHeader>
                        <Form {...ppForm}><form onSubmit={ppForm.handleSubmit(onPpSubmit)} className="space-y-4 pt-4">
                            <FormField control={ppForm.control} name="planName" render={({ field }) => (<FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input placeholder="e.g., August Widget Production" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={ppForm.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={ppForm.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>End Date</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsPpDialogOpen(false)}>Cancel</Button><Button type="submit">Save Plan</Button></DialogFooter>
                        </form></Form>
                    </DialogContent>
                </Dialog>
            </TabsContent>
        </Tabs>
        
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected item.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
