
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart";
import { CustomerGrowthChart } from "@/components/charts/customer-growth-chart";
import { getInvoices } from "@/services/sales-service";
import { getContacts } from "@/services/crm-service";
import { getExpenses } from "@/services/accounting-service";
import { useToast } from "@/hooks/use-toast";
import { calculateTotal } from "@/lib/utils";
import { startOfMonth, subMonths, format, isWithinInterval } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [invoicesData, contactsData, expensesData] = await Promise.all([
          getInvoices(),
          getContacts(),
          getExpenses(),
        ]);

        const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
        
        const revData = months.map(monthDate => {
          const start = startOfMonth(monthDate);
          const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          
          const monthlyRevenue = invoicesData
            .filter(inv => inv.status === 'Paid' && isWithinInterval(new Date(inv.date), { start, end }))
            .reduce((sum, inv) => sum + calculateTotal(inv.items), 0);
            
          const monthlyExpenses = expensesData
            .filter(exp => isWithinInterval(new Date(exp.date), { start, end }))
            .reduce((sum, exp) => sum + exp.amount, 0);

          return {
            month: format(monthDate, 'MMM'),
            revenue: monthlyRevenue,
            expenses: monthlyExpenses,
          };
        });
        setRevenueData(revData);

        const custData = months.map(monthDate => {
          const start = startOfMonth(monthDate);
          const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          const count = contactsData.filter(c => isWithinInterval(new Date(c.creationDate), { start, end })).length;
          return {
            month: format(monthDate, 'MMM'),
            count,
          };
        });
        setCustomerData(custData);
        
      } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch insights data." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  return (
    <div>
      <PageHeader
        title="Insights Dashboard"
        description="Visualize your business performance."
        actions={
          <Button asChild>
            <Link href="/report-builder">
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Report
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs. Expenses</CardTitle>
            <CardDescription>Monthly financial overview.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px]" /> : <RevenueExpensesChart data={revenueData} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>New customers acquired per month.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-[300px]" /> : <CustomerGrowthChart data={customerData} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
