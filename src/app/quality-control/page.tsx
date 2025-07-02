
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, MoreHorizontal, Trash2, X, Search, Edit, CheckSquare, ClipboardCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { QCChecklist, QCInspection, WorkOrder, Inventory, QCChecklistItem, QCInspectionItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getWorkOrders } from "@/services/manufacturing-service";
import { getInventoryItems } from "@/services/inventory-service";
import { getChecklists, addChecklist, updateChecklist, deleteChecklist, getInspections, addInspection, updateInspection } from "@/services/quality-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/role-context";
import { format } from "date-fns";

const checklistSchema = z.object({
  productName: z.string().min(1, "Product is required"),
  items: z.array(z.object({
    id: z.string().optional(),
    check: z.string().min(1, "Check description is required"),
    expected: z.string().min(1, "Expected result is required"),
  })).min(1, "At least one check item is required"),
});
type ChecklistFormValues = z.infer<typeof checklistSchema>;

const inspectionItemSchema = z.object({
  result: z.enum(['Pass', 'Fail', 'N/A']),
  notes: z.string().optional(),
});
type InspectionItemFormValues = z.infer<typeof inspectionItemSchema>;


export default function QualityControlPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [checklists, setChecklists] = useState<QCChecklist[]>([]);
    const [inspections, setInspections] = useState<QCInspection[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [products, setProducts] = useState<Inventory[]>([]);

    const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<QCChecklist | null>(null);

    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
    const [isPerformInspectionOpen, setIsPerformInspectionOpen] = useState(false);
    const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');
    
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'checklist' | 'inspection' } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const finishedGoods = useMemo(() => products.filter(p => ['Tables', 'Storage', 'Kitchen', 'Chairs'].includes(p.category)), [products]);

    const checklistForm = useForm<ChecklistFormValues>({
        resolver: zodResolver(checklistSchema),
        defaultValues: { productName: "", items: [{ check: "", expected: "" }] },
    });
    const { fields, append, remove } = useFieldArray({ control: checklistForm.control, name: "items" });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [checklistsData, inspectionsData, workOrdersData, productsData] = await Promise.all([
                    getChecklists(),
                    getInspections(),
                    getWorkOrders(),
                    getInventoryItems(),
                ]);
                setChecklists(checklistsData);
                setInspections(inspectionsData);
                setWorkOrders(workOrdersData);
                setProducts(productsData);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Failed to load Quality Control data." });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [toast]);
    
    const openChecklistDialog = (checklist: QCChecklist | null = null) => {
        setEditingChecklist(checklist);
        checklistForm.reset(checklist || { productName: "", items: [{ check: "", expected: "" }] });
        setIsChecklistDialogOpen(true);
    };

    const onChecklistSubmit = async (values: ChecklistFormValues) => {
        const newChecklistData = { ...values, items: values.items.map(item => ({...item, id: item.id || crypto.randomUUID()})) };
        try {
            if (editingChecklist) {
                await updateChecklist(editingChecklist.id, newChecklistData);
                setChecklists(prev => prev.map(c => c.id === editingChecklist.id ? { ...editingChecklist, ...newChecklistData } : c));
                toast({ title: "Checklist Updated" });
            } else {
                const newId = await addChecklist(newChecklistData);
                setChecklists(prev => [{ ...newChecklistData, id: newId }, ...prev]);
                toast({ title: "Checklist Created", description: `QC Checklist for ${values.productName} has been saved.` });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save the checklist." });
        } finally {
            setIsChecklistDialogOpen(false);
        }
    };
    
    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'checklist') {
                await deleteChecklist(itemToDelete.id);
                setChecklists(prev => prev.filter(c => c.id !== itemToDelete.id));
            }
            toast({ variant: 'destructive', title: "Item Deleted", description: "The selected item has been removed." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        } finally {
            setItemToDelete(null);
        }
    };
    
    const handleStartInspection = async () => {
        if (!selectedWorkOrderId) {
            toast({ variant: 'destructive', title: "No Work Order Selected" });
            return;
        }
        const workOrder = workOrders.find(wo => wo.id === selectedWorkOrderId);
        if (!workOrder) {
            toast({ variant: 'destructive', title: "Work Order Not Found" });
            return;
        }
        const checklist = checklists.find(c => c.productName === workOrder.productName);
        if (!checklist) {
            toast({ variant: 'destructive', title: "No Checklist Found", description: `Please create a QC Checklist for ${workOrder.productName} first.` });
            return;
        }

        const newInspectionData: Omit<QCInspection, 'id'> = {
            workOrderId: workOrder.id,
            productName: workOrder.productName,
            inspectionDate: format(new Date(), 'yyyy-MM-dd'),
            inspector: user?.name || "Unknown",
            status: 'Pending',
            items: checklist.items.map(item => ({ checkId: item.id, check: item.check, expected: item.expected, result: 'N/A' }))
        };

        try {
            const newId = await addInspection(newInspectionData);
            setInspections(prev => [{ ...newInspectionData, id: newId }, ...prev]);
            toast({ title: "Inspection Started", description: `Inspection for WO #${workOrder.id} is ready.` });
            setIsInspectionDialogOpen(false);
            setSelectedWorkOrderId('');
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to Start Inspection" });
        }
    };

    const handlePerformInspection = (inspection: QCInspection) => {
        setSelectedInspection(inspection);
        setIsPerformInspectionOpen(true);
    };

    const handleSaveInspectionResults = async (newItems: QCInspectionItem[]) => {
        if (!selectedInspection) return;

        const allPass = newItems.every(item => item.result === 'Pass' || item.result === 'N/A');
        const newStatus = allPass ? 'Pass' : 'Fail';

        const updateData: Partial<QCInspection> = { items: newItems, status: newStatus };

        try {
            await updateInspection(selectedInspection.id, updateData);
            setInspections(prev => prev.map(insp => insp.id === selectedInspection.id ? { ...insp, ...updateData } : insp));
            toast({ title: "Inspection Saved", description: `The inspection result is: ${newStatus}` });
            setIsPerformInspectionOpen(false);
            setSelectedInspection(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed" });
        }
    };

    return (
        <div>
            <PageHeader title="Quality Control" description="Manage QC checklists and product inspections." />
             <Tabs defaultValue="inspections">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="inspections">Inspections</TabsTrigger>
                    <TabsTrigger value="checklists">Checklists</TabsTrigger>
                </TabsList>
                 <div className="flex justify-between items-center mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <TabsContent value="inspections" className="m-0">
                        <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
                           <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Inspection</Button></DialogTrigger>
                           <DialogContent>
                                <DialogHeader><DialogTitle>Start New Inspection</DialogTitle><DialogDescription>Select a work order to begin a quality inspection.</DialogDescription></DialogHeader>
                                <div className="py-4 space-y-2">
                                    <Label>Work Order</Label>
                                    <Select onValueChange={setSelectedWorkOrderId}>
                                        <SelectTrigger><SelectValue placeholder="Select an active work order..."/></SelectTrigger>
                                        <SelectContent>
                                            {workOrders.filter(wo => wo.status === 'In Progress').map(wo => (
                                                <SelectItem key={wo.id} value={wo.id}>#{wo.id} - {wo.productName} (Qty: {wo.quantity})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsInspectionDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleStartInspection}>Start Inspection</Button>
                                </DialogFooter>
                           </DialogContent>
                        </Dialog>
                    </TabsContent>
                    <TabsContent value="checklists" className="m-0">
                        <Button onClick={() => openChecklistDialog(null)}><Plus className="mr-2 h-4 w-4" /> New Checklist</Button>
                    </TabsContent>
                 </div>
                <TabsContent value="inspections">
                    <Card><CardHeader><CardTitle>Inspection History</CardTitle><CardDescription>A log of all quality control inspections performed.</CardDescription></CardHeader>
                    <CardContent className="p-0"><Table><TableHeader><TableRow>
                        <TableHead>Inspection ID</TableHead><TableHead>Product</TableHead><TableHead>Work Order</TableHead><TableHead>Inspector</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow></TableHeader><TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8"/></TableCell></TableRow>) :
                        inspections.map(insp => (
                            <TableRow key={insp.id}>
                                <TableCell className="font-mono text-xs">{insp.id}</TableCell><TableCell>{insp.productName}</TableCell><TableCell>#{insp.workOrderId}</TableCell>
                                <TableCell>{insp.inspector}</TableCell><TableCell>{insp.inspectionDate}</TableCell>
                                <TableCell><Badge className={cn(insp.status === 'Pass' && 'bg-green-100 text-green-800', insp.status === 'Fail' && 'bg-red-100 text-red-800', insp.status === 'Pending' && 'bg-yellow-100 text-yellow-800')}>{insp.status}</Badge></TableCell>
                                <TableCell>
                                    {insp.status === 'Pending' && <Button variant="outline" size="sm" onClick={() => handlePerformInspection(insp)}>Perform Inspection</Button>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody></Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="checklists">
                    <Card><CardHeader><CardTitle>QC Checklists</CardTitle><CardDescription>Templates for quality inspections for each product.</CardDescription></CardHeader>
                    <CardContent className="p-0"><Table><TableHeader><TableRow>
                        <TableHead>Checklist ID</TableHead><TableHead>Product Name</TableHead><TableHead>No. of Checks</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow></TableHeader><TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8"/></TableCell></TableRow>) :
                        checklists.map(list => (
                            <TableRow key={list.id}>
                                <TableCell className="font-mono text-xs">{list.id}</TableCell><TableCell>{list.productName}</TableCell><TableCell>{list.items.length}</TableCell>
                                <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => openChecklistDialog(list)}>Edit</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete({id: list.id, type: 'checklist'})}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu></TableCell>
                            </TableRow>
                        ))}
                    </TableBody></Table></CardContent></Card>
                </TabsContent>
             </Tabs>

            <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editingChecklist ? "Edit Checklist" : "Create New Checklist"}</DialogTitle></DialogHeader>
                <Form {...checklistForm}><form onSubmit={checklistForm.handleSubmit(onChecklistSubmit)} className="space-y-6">
                    <FormField control={checklistForm.control} name="productName" render={({field}) => (
                        <FormItem><FormLabel>Product</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a product"/></SelectTrigger></FormControl>
                        <SelectContent>{finishedGoods.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                    <div><h3 className="font-medium mb-2">Check Items</h3><div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-3 bg-muted rounded-md">
                                <FormField control={checklistForm.control} name={`items.${index}.check`} render={({field}) => <FormItem className="flex-grow"><FormLabel>Check</FormLabel><FormControl><Input placeholder="e.g., Check for scratches" {...field}/></FormControl><FormMessage/></FormItem>}/>
                                <FormField control={checklistForm.control} name={`items.${index}.expected`} render={({field}) => <FormItem className="flex-grow"><FormLabel>Expected Result</FormLabel><FormControl><Input placeholder="e.g., No visible defects" {...field}/></FormControl><FormMessage/></FormItem>}/>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({check: "", expected: ""})}>Add Check</Button>
                    </div></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsChecklistDialogOpen(false)}>Cancel</Button><Button type="submit">Save Checklist</Button></DialogFooter>
                </form></Form>
                </DialogContent>
            </Dialog>

            {selectedInspection && <PerformInspectionDialog inspection={selectedInspection} isOpen={isPerformInspectionOpen} onOpenChange={setIsPerformInspectionOpen} onSave={handleSaveInspectionResults} />}
            
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected item.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

const PerformInspectionDialog = ({ inspection, isOpen, onOpenChange, onSave }: { inspection: QCInspection, isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (items: QCInspectionItem[]) => void }) => {
    const [results, setResults] = useState<Record<string, { result: 'Pass' | 'Fail' | 'N/A', notes?: string }>>({});

    useEffect(() => {
        if (isOpen) {
            const initialResults = inspection.items.reduce((acc, item) => {
                acc[item.checkId] = { result: item.result, notes: item.notes };
                return acc;
            }, {} as typeof results);
            setResults(initialResults);
        }
    }, [isOpen, inspection]);

    const handleResultChange = (checkId: string, result: 'Pass' | 'Fail' | 'N/A') => {
        setResults(prev => ({...prev, [checkId]: {...prev[checkId], result}}));
    }
    const handleNotesChange = (checkId: string, notes: string) => {
        setResults(prev => ({...prev, [checkId]: {...prev[checkId], notes}}));
    }

    const handleSubmit = () => {
        const updatedItems = inspection.items.map(item => ({
            ...item,
            result: results[item.checkId]?.result || 'N/A',
            notes: results[item.checkId]?.notes || '',
        }));
        onSave(updatedItems);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Perform Inspection for #{inspection.workOrderId}</DialogTitle>
                    <DialogDescription>{inspection.productName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {inspection.items.map(item => (
                        <Card key={item.checkId}>
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                <div className="md:col-span-1">
                                    <p className="font-medium">{item.check}</p>
                                    <p className="text-sm text-muted-foreground">Expected: {item.expected}</p>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="flex gap-2">
                                        <Button size="sm" variant={results[item.checkId]?.result === 'Pass' ? 'default' : 'outline'} className="bg-green-500/10 border-green-500 text-green-600 hover:bg-green-500/20" onClick={() => handleResultChange(item.checkId, 'Pass')}><ThumbsUp className="h-4 w-4"/></Button>
                                        <Button size="sm" variant={results[item.checkId]?.result === 'Fail' ? 'destructive' : 'outline'} className="bg-red-500/10 border-red-500 text-red-600 hover:bg-red-500/20" onClick={() => handleResultChange(item.checkId, 'Fail')}><ThumbsDown className="h-4 w-4"/></Button>
                                    </div>
                                    <Input placeholder="Optional notes..." value={results[item.checkId]?.notes || ''} onChange={(e) => handleNotesChange(item.checkId, e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Inspection Results</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
