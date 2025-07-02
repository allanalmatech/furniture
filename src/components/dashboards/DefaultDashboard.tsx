
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/context/role-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarClock, FileWarning, Building2, Wrench, Boxes, Coins, Receipt, ClipboardList, Download, FileText, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, isToday } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import type { StaffMember, LeaveRequest, WorkOrder, Inventory, Order, PurchaseOrder } from '@/lib/types';
import { getStaff, getLeaveRequests } from '@/services/hr-service';
import { getWorkOrders } from '@/services/manufacturing-service';
import { getInventoryItems, getPurchaseOrders } from '@/services/inventory-service';
import { getOrders } from '@/services/sales-service';
import { Skeleton } from '../ui/skeleton';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
);

const HRView = ({ onExport, staff, leaveRequests, isLoading }: { onExport: (format: 'pdf' | 'xlsx') => void, staff: StaffMember[], leaveRequests: LeaveRequest[], isLoading: boolean }) => {
    const stats = useMemo(() => ({
        totalStaff: staff.length,
        onLeave: staff.filter(s => s.status === 'On Leave').length,
        pendingLeaveRequests: leaveRequests.filter(r => r.status === 'Pending').length,
    }), [staff, leaveRequests]);

    return (
        <div>
            <PageHeader
                title="HR Manager Dashboard"
                description="Here's a summary of your key activities and metrics."
                actions={<ExportButton onExport={onExport} />}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatCard title="Total Staff" value={stats.totalStaff} icon={Users} isLoading={isLoading} />
                <StatCard title="On Leave" value={stats.onLeave} icon={CalendarClock} isLoading={isLoading} />
                <StatCard title="Pending Leave Requests" value={stats.pendingLeaveRequests} icon={FileWarning} isLoading={isLoading} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>Leave requests that require your attention.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8"/></TableCell></TableRow>) :
                            leaveRequests.filter(r => r.status === 'Pending').map(req => (
                                <TableRow key={req.id}><TableCell>{req.staffName}</TableCell><TableCell>{req.type}</TableCell><TableCell>{format(req.startDate, 'MMM d')} - {format(req.endDate, 'MMM d, yyyy')}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

const FactoryView = ({ onExport, workOrders, inventory, isLoading }: { onExport: (format: 'pdf' | 'xlsx') => void, workOrders: WorkOrder[], inventory: Inventory[], isLoading: boolean }) => {
    const stats = useMemo(() => ({
        activeWorkOrders: workOrders.filter(w => w.status === 'In Progress').length,
        rawMaterialsLow: inventory.filter(i => !['Tables', 'Storage', 'Kitchen'].includes(i.category) && i.stock > 0 && i.stock < 10).length,
        finishedGoodsInStock: inventory.filter(i => ['Tables', 'Storage', 'Kitchen'].includes(i.category)).reduce((sum, item) => sum + item.stock, 0),
    }), [workOrders, inventory]);
    
    return (
        <div>
            <PageHeader
                title="Factory Manager Dashboard"
                description="Here's a summary of your key activities and metrics."
                actions={<ExportButton onExport={onExport} />}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatCard title="Active Work Orders" value={stats.activeWorkOrders} icon={Wrench} isLoading={isLoading} />
                <StatCard title="Raw Materials Low" value={stats.rawMaterialsLow} icon={Boxes} isLoading={isLoading} />
                <StatCard title="Finished Goods in Stock" value={stats.finishedGoodsInStock} icon={Building2} isLoading={isLoading} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Active Work Orders</CardTitle>
                    <CardDescription>Manufacturing jobs currently in progress.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                             {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8"/></TableCell></TableRow>) :
                                workOrders.filter(w => w.status === 'In Progress').map(order => (
                                    <TableRow key={order.id}><TableCell>{order.id}</TableCell><TableCell>{order.productName}</TableCell><TableCell>{order.quantity}</TableCell><TableCell>{order.dueDate}</TableCell></TableRow>
                                ))
                             }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

const CashierView = ({ orders, isLoading }: { orders: Order[], isLoading: boolean }) => {
    const stats = useMemo(() => ({
        todaysSales: orders.filter(o => isToday(new Date(o.date))).reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        todaysTransactions: orders.filter(o => isToday(new Date(o.date))).length
    }), [orders]);
    
    return (
        <div>
            <PageHeader
                title="Cashier Dashboard"
                description="Here's a summary of your key activities and metrics."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
                <StatCard title="Today's Sales" value={formatCurrency(stats.todaysSales)} icon={Coins} isLoading={isLoading} />
                <StatCard title="Today's Transactions" value={stats.todaysTransactions} icon={Receipt} isLoading={isLoading} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Start New Sale</CardTitle>
                    <CardDescription>Click the button below to open the Point of Sale interface.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild size="lg" className="w-full">
                        <Link href="/pos">Go to Point of Sale</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};


const StoreManagerView = ({ onExport, inventory, purchaseOrders, isLoading }: { onExport: (format: 'pdf' | 'xlsx') => void, inventory: Inventory[], purchaseOrders: PurchaseOrder[], isLoading: boolean }) => {
    const lowStockItems = useMemo(() => inventory.filter(i => i.stock > 0 && i.stock < 10), [inventory]);
    
    const stats = useMemo(() => ({
        itemsInStock: inventory.reduce((sum, item) => sum + item.stock, 0),
        lowStockItemsCount: lowStockItems.length,
        pendingPurchaseOrders: purchaseOrders.filter(p => p.status === 'Ordered').length,
    }), [inventory, lowStockItems, purchaseOrders]);

    return (
        <div>
            <PageHeader
                title="Store Manager Dashboard"
                description="Here's a summary of your key activities and metrics."
                actions={<ExportButton onExport={onExport} />}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatCard title="Items in Stock" value={stats.itemsInStock} icon={Boxes} isLoading={isLoading} />
                <StatCard title="Low Stock Items" value={stats.lowStockItemsCount} icon={FileWarning} isLoading={isLoading} />
                <StatCard title="Pending Purchase Orders" value={stats.pendingPurchaseOrders} icon={ClipboardList} isLoading={isLoading} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>These items are running low and may need reordering.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>SKU</TableHead><TableHead>Stock</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8"/></TableCell></TableRow>) :
                                lowStockItems.map(item => (
                                    <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.sku}</TableCell><TableCell><Badge variant="destructive">{item.stock}</Badge></TableCell></TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

const UserView = ({ onExport, workOrders }: { onExport: (format: 'pdf' | 'xlsx') => void, workOrders: WorkOrder[] }) => (
    <div>
        <PageHeader
            title="My Work Queue"
            description="A list of manufacturing tasks assigned to you."
            actions={<ExportButton onExport={onExport} />}
        />
        <Card>
            <CardHeader>
                <CardTitle>Assigned Work Orders</CardTitle>
                <CardDescription>This is a placeholder. Data is not yet assigned to individual users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {workOrders && workOrders.length > 0 ? (
                            workOrders.filter(w => w.status === 'In Progress').map(order => (
                               <TableRow key={order.id}><TableCell>{order.id}</TableCell><TableCell>{order.productName}</TableCell><TableCell>{order.quantity}</TableCell><TableCell>{order.dueDate}</TableCell></TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No active work orders.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
);

const GenericDashboard = ({ roleName }: { roleName: string }) => (
     <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-card">
        <h3 className="text-xl font-semibold mb-2">Your Dashboard</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
            This is your personal dashboard. It will soon be customized with widgets and stats relevant to your role as {roleName.toLowerCase()}.
        </p>
    </div>
);

const ExportButton = ({ onExport }: { onExport: (format: 'pdf' | 'xlsx') => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);


export default function DefaultDashboard() {
    const { role, roleName } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

    useEffect(() => {
        const fetchRoleData = async () => {
            setIsLoading(true);
            try {
                switch (role) {
                    case 'HRManager': {
                        const [staffData, leaveData] = await Promise.all([getStaff(), getLeaveRequests()]);
                        setStaff(staffData);
                        setLeaveRequests(leaveData.map(l => ({ ...l, startDate: new Date(l.startDate), endDate: new Date(l.endDate) })));
                        break;
                    }
                    case 'FactoryManager': {
                        const [woData, invData] = await Promise.all([getWorkOrders(), getInventoryItems()]);
                        setWorkOrders(woData);
                        setInventory(invData);
                        break;
                    }
                    case 'Cashier': {
                        const ordersData = await getOrders();
                        setOrders(ordersData);
                        break;
                    }
                    case 'StoreManager': {
                        const [invData, poData] = await Promise.all([getInventoryItems(), getPurchaseOrders()]);
                        setInventory(invData);
                        setPurchaseOrders(poData);
                        break;
                    }
                    case 'User': {
                        const woData = await getWorkOrders();
                        setWorkOrders(woData);
                        break;
                    }
                    default:
                        // No specific data needed for generic dashboard
                        break;
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
            } finally {
                setIsLoading(false);
            }
        };

        if (role) {
            fetchRoleData();
        }
    }, [role, toast]);


    const handleExport = (format: 'pdf' | 'xlsx') => {
        let headers: string[] = [];
        let body: any[][] = [];
        let title = `${roleName} Report`;
        let filename = `${role}_report_${new Date().toISOString().split('T')[0]}`;
        
        switch (role) {
            case 'HRManager':
                title = "Pending Leave Requests";
                headers = ["Staff Member", "Type", "Dates"];
                body = leaveRequests.filter(r => r.status === 'Pending').map(req => [req.staffName, req.type, `${format(req.startDate, 'MMM d')} - ${format(req.endDate, 'MMM d, yyyy')}`]);
                break;
            case 'FactoryManager':
                title = "Active Work Orders";
                headers = ["WO #", "Product", "Quantity", "Due Date"];
                body = workOrders.filter(w => w.status === 'In Progress').map(order => [order.id, order.productName, order.quantity, order.dueDate]);
                break;
            case 'StoreManager':
                title = "Low Stock Items";
                headers = ["Item", "SKU", "Stock"];
                body = inventory.filter(i => i.stock > 0 && i.stock < 10).map(item => [item.name, item.sku, item.stock]);
                break;
             case 'User':
                title = "My Assigned Work Orders";
                headers = ["WO #", "Product", "Quantity", "Due Date"];
                body = workOrders.filter(w => w.status === 'In Progress').map(order => [order.id, order.productName, order.quantity, order.dueDate]);
                break;
            default:
                toast({ variant: 'destructive', title: 'Export Not Available', description: 'Export is not configured for this role yet.' });
                return;
        }

        toast({ title: "Exporting Report", description: `Your report is being downloaded as a ${format.toUpperCase()} file.` });

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 16);
            autoTable(doc, { head: [headers], body, startY: 20 });
            doc.save(`${filename}.pdf`);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, title);
            XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
        }
    };


    const renderRoleDashboard = () => {
        switch (role) {
            case 'HRManager': return <HRView onExport={handleExport} staff={staff} leaveRequests={leaveRequests} isLoading={isLoading} />;
            case 'FactoryManager': return <FactoryView onExport={handleExport} workOrders={workOrders} inventory={inventory} isLoading={isLoading} />;
            case 'Cashier': return <CashierView orders={orders} isLoading={isLoading} />;
            case 'StoreManager': return <StoreManagerView onExport={handleExport} inventory={inventory} purchaseOrders={purchaseOrders} isLoading={isLoading} />;
            case 'User': return <UserView onExport={handleExport} workOrders={workOrders} />;
            default: return <GenericDashboard roleName={roleName} />;
        }
    };

    return (
        <div className="space-y-6">
            {renderRoleDashboard()}
        </div>
    );
}
