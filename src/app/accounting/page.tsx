
"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign, Landmark, Receipt, Wallet, ArrowRight } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateTotal } from "@/lib/utils";
import { AccountingChart } from '@/components/accounting-chart';
import type { Invoice, Expense } from '@/lib/types';
import { isWithinInterval, parseISO, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getInvoices } from '@/services/sales-service';
import { getExpenses } from '@/services/accounting-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading?: boolean }) => (
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

const accountingModules = [
  {
    title: 'Invoicing',
    description: 'Create, send, and track invoices.',
    icon: Receipt,
    href: '/invoicing',
  },
  {
    title: 'Expenses',
    description: 'Record and categorize business expenses.',
    icon: Wallet,
    href: '/expenses',
  },
  {
    title: 'Budget Planning',
    description: 'Create and manage budgets for spending.',
    icon: Landmark,
    href: '/budget-planning',
  },
  {
    title: 'Tax Center',
    description: 'Manage tax settings and reports.',
    icon: Landmark,
    href: '/tax',
  },
];

export default function AccountingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invoicesData, expensesData] = await Promise.all([getInvoices(), getExpenses()]);
                setInvoices(invoicesData);
                setExpenses(expensesData);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not load accounting data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const { totalRevenue, totalExpenses, netIncome, overdueInvoices, monthlyData } = useMemo(() => {
        if (isLoading) return { totalRevenue: 0, totalExpenses: 0, netIncome: 0, overdueInvoices: 0, monthlyData: [] };

        const now = new Date();
        const currentMonthStart = startOfMonth(now);

        const totalRevenueThisMonth = invoices
            .filter(inv => inv.status === 'Paid' && isWithinInterval(parseISO(inv.date), { start: currentMonthStart, end: now }))
            .reduce((sum, inv) => sum + calculateTotal(inv.items), 0);

        const totalExpensesThisMonth = expenses
            .filter(exp => isWithinInterval(parseISO(exp.date), { start: currentMonthStart, end: now }))
            .reduce((sum, exp) => sum + exp.amount, 0);

        const netIncomeThisMonth = totalRevenueThisMonth - totalExpensesThisMonth;

        const overdueInvoicesCount = invoices.filter(inv => inv.status === 'Overdue').length;

        const months = Array.from({ length: 6 }, (_, i) => subMonths(now, i)).reverse();
        const chartData = months.map(monthDate => {
            const start = startOfMonth(monthDate);
            const end = endOfMonth(monthDate);

            const revenue = invoices
                .filter(inv => inv.status === 'Paid' && isWithinInterval(parseISO(inv.date), { start, end }))
                .reduce((sum, inv) => sum + calculateTotal(inv.items), 0);
            
            const expensesValue = expenses
                .filter(exp => isWithinInterval(parseISO(exp.date), { start, end }))
                .reduce((sum, exp) => sum + exp.amount, 0);

            return {
                month: format(monthDate, 'MMM'),
                revenue,
                expenses: expensesValue,
            };
        });

        return {
            totalRevenue: totalRevenueThisMonth,
            totalExpenses: totalExpensesThisMonth,
            netIncome: netIncomeThisMonth,
            overdueInvoices: overdueInvoicesCount,
            monthlyData: chartData,
        };
    }, [invoices, expenses, isLoading]);


  return (
    <div>
      <PageHeader
        title="Accounting Hub"
        description="Your central place for managing all financial activities."
        breadcrumbs={[{ href: "/dashboard", label: "Dashboard" }, { label: "Accounting" }]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Revenue (This Month)" value={formatCurrency(totalRevenue)} icon={CircleDollarSign} isLoading={isLoading} />
        <StatCard title="Total Expenses (This Month)" value={formatCurrency(totalExpenses)} icon={Wallet} isLoading={isLoading} />
        <StatCard title="Net Income (This Month)" value={formatCurrency(netIncome)} icon={Landmark} isLoading={isLoading} />
        <StatCard title="Overdue Invoices" value={overdueInvoices.toString()} icon={Receipt} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>A summary of your revenue vs. expenses for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : <AccountingChart data={monthlyData} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Accounting Modules</CardTitle>
                <CardDescription>Quick access to all accounting features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {accountingModules.map((mod) => (
                  <div key={mod.href} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-background rounded-md border">
                        <mod.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{mod.title}</p>
                        <p className="text-sm text-muted-foreground">{mod.description}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={mod.href}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
