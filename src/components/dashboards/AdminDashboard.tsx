
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, Users, CreditCard, ShoppingCart, ArrowRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, calculateTotal } from '@/lib/utils';
import { startOfMonth, subMonths, format, isWithinInterval, endOfMonth, isSameMonth } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getOrders, getQuotations } from '@/services/sales-service';
import { getContacts } from '@/services/crm-service';
import { getExpenses } from '@/services/accounting-service';
import type { Order, Contact, Expense, Quotation } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, change, isLoading }: { title: string; value: string; icon: React.ElementType, change?: string, isLoading?: boolean }) => (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold">{value}</div>
            {change && <p className="text-xs text-muted-foreground pt-1">{change}</p>}
          </>
        )}
      </CardContent>
    </Card>
);

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};


export default function AdminDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, contactsData, expensesData, quotationsData] = await Promise.all([
                getOrders(),
                getContacts(),
                getExpenses(),
                getQuotations(),
            ]);
            setOrders(ordersData);
            setContacts(contactsData);
            setExpenses(expensesData);
            setQuotations(quotationsData);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch dashboard data." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [toast]);

  const { totalRevenueThisMonth, newCustomersThisMonth, salesThisMonth, pendingOrders } = useMemo(() => {
    if (isLoading) return { totalRevenueThisMonth: 0, newCustomersThisMonth: 0, salesThisMonth: 0, pendingOrders: 0 };
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    const totalRevenueThisMonth = orders
        .filter(order => new Date(order.date) >= startOfCurrentMonth && (order.status === 'Delivered' || order.status === 'Shipped' || order.status === 'Processing'))
        .reduce((sum, order) => sum + calculateTotal(order.items), 0);

    const newCustomersThisMonth = contacts.filter(contact => new Date(contact.creationDate) >= startOfCurrentMonth).length;

    const salesThisMonth = quotations.filter(quote => quote.status === 'Accepted' && isSameMonth(new Date(quote.date), now)).length;

    const pendingOrdersCount = orders.filter(order => order.status === 'Processing' || order.status === 'Awaiting Payment').length;
    
    return {
        totalRevenueThisMonth,
        newCustomersThisMonth,
        salesThisMonth,
        pendingOrders: pendingOrdersCount
    };
  }, [isLoading, orders, contacts, quotations]);

  const overviewData = useMemo(() => {
    if (isLoading) return Array(6).fill({}).map((_, i) => ({ name: format(subMonths(new Date(), 5 - i), 'MMM'), revenue: 0, expenses: 0 }));
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    return months.map(month_date => {
        const start = startOfMonth(month_date);
        const end = endOfMonth(month_date);
        
        const monthlyRevenue = orders
            .filter(order => isWithinInterval(new Date(order.date), { start, end }) && (order.status === 'Delivered' || order.status === 'Shipped'))
            .reduce((sum, order) => sum + calculateTotal(order.items), 0);

        const monthlyExpenses = expenses
            .filter(expense => isWithinInterval(new Date(expense.date), { start, end }))
            .reduce((sum, expense) => sum + expense.amount, 0);

        return {
            name: format(month_date, 'MMM'),
            revenue: monthlyRevenue,
            expenses: monthlyExpenses,
        }
    });
  }, [isLoading, orders, expenses]);

  const handleExport = (format: 'pdf' | 'xlsx') => {
    const statsHeaders = ["Metric", "Value"];
    const statsBody = [
        ["Total Revenue (This Month)", formatCurrency(totalRevenueThisMonth)],
        ["New Customers (This Month)", `+${newCustomersThisMonth}`],
        ["Sales (This Month)", `+${salesThisMonth}`],
        ["Pending Orders", pendingOrders.toString()],
    ];
    
    const title = "Admin Dashboard Summary";
    const filename = `admin_summary_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(title, 14, 16);
        
        doc.text("Summary Metrics", 14, 26);
        autoTable(doc, { head: [statsHeaders], body: statsBody, startY: 30 });
        
        doc.save(`${filename}.pdf`);

    } else if (format === 'xlsx') {
        const statsSheet = XLSX.utils.aoa_to_sheet([statsHeaders, ...statsBody]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Summary Metrics");
        XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }

    toast({ title: "Exporting Report", description: `Your report is being downloaded as a ${format.toUpperCase()} file.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Admin!"
        description="Here's what's happening with your business today."
        actions={
            <div className="flex items-center gap-2">
                 <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-9 bg-card md:w-64 lg:w-80" />
                </div>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      <span>Export as XLSX</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        }
       />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue (This Month)" value={formatCurrency(totalRevenueThisMonth)} icon={DollarSign} change="+20.1% from last month" isLoading={isLoading} />
        <StatCard title="New Customers (This Month)" value={`+${newCustomersThisMonth}`} icon={Users} change="+180.1% from last month" isLoading={isLoading} />
        <StatCard title="Sales (This Month)" value={`+${salesThisMonth}`} icon={CreditCard} change="+19% from last month" isLoading={isLoading} />
        <StatCard title="Pending Orders" value={pendingOrders.toString()} icon={ShoppingCart} change="+2.5% from last month" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>A summary of your revenue vs. expenses for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={overviewData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value/1000)}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend iconType="circle" iconSize={8} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" strokeWidth={2} stroke="hsl(var(--accent))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
