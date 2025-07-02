
"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Users, FileText, ClipboardList, Save, Plus, BarChart3 } from "lucide-react";
import { calculateTotal, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getInvoices, getOrders } from "@/services/sales-service";
import { getContacts } from "@/services/crm-service";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataSource, CustomReport } from "@/lib/types";
import { addCustomReport } from "@/services/report-builder-service";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";


const dataSources: DataSource[] = [
  {
    id: "invoices",
    name: "Invoices",
    icon: FileText,
    fields: ["id", "customer", "date", "status", "amount"],
    chartConfig: {
      category: 'customer',
      value: 'amount',
      valueLabel: 'Total Amount',
      isCurrency: true,
      aggregation: 'sum'
    },
    fetcher: getInvoices,
  },
  {
    id: "contacts",
    name: "Contacts",
    icon: Users,
    fields: ["name", "company", "stage", "lastInteraction"],
    chartConfig: {
      category: 'stage',
      value: 'count',
      valueLabel: 'Number of Contacts',
      isCurrency: false,
      aggregation: 'count'
    },
    fetcher: getContacts,
  },
  {
    id: "orders",
    name: "Orders",
    icon: ClipboardList,
    fields: ['id', 'customer', 'date', 'status', 'amount'],
    chartConfig: {
      category: 'customer',
      value: 'amount',
      valueLabel: 'Total Amount',
      isCurrency: true,
      aggregation: 'sum'
    },
    fetcher: getOrders,
  },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ReportBuilderPage() {
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<DataSource['id']>('invoices');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const { toast } = useToast();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  
  const selectedDataSource = useMemo(() => 
    dataSources.find(ds => ds.id === selectedDataSourceId)!, 
    [selectedDataSourceId]
  );
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await selectedDataSource.fetcher();
            setRawData(data);
            setSelectedFields(selectedDataSource.fields);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: `Could not fetch data for ${selectedDataSource.name}.` });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [selectedDataSource, toast]);

  const handleFieldChange = (field: string, checked: boolean) => {
    setSelectedFields(prev => 
      checked ? [...prev, field] : prev.filter(f => f !== field)
    );
  };
  
  const { chartData, tableData, reportTitle } = useMemo(() => {
    const processedData = rawData.map(item => {
        if (selectedDataSource.id === 'invoices' || selectedDataSource.id === 'orders') {
            return { ...item, amount: calculateTotal(item.items) };
        }
        return item;
    });

    const config = selectedDataSource.chartConfig;
    let aggregatedData: Record<string, number> = {};

    if (config.aggregation === 'sum') {
        aggregatedData = processedData.reduce((acc, item) => {
            const key = item[config.category] || "N/A";
            acc[key] = (acc[key] || 0) + (item[config.value] || 0);
            return acc;
        }, {} as Record<string, number>);
    } else { // count
        aggregatedData = processedData.reduce((acc, item) => {
            const key = item[config.category] || "N/A";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    const newChartData = Object.entries(aggregatedData).map(([name, value]) => ({ name, value }));
    const newReportTitle = `${config.valueLabel} by ${capitalize(config.category)}`;

    return { chartData: newChartData, tableData: processedData, reportTitle: newReportTitle };
  }, [selectedDataSource, rawData]);

  const handleSaveReport = async () => {
    if (!reportName) {
        toast({ variant: 'destructive', title: "Report name is required." });
        return;
    }
    try {
        const newReport: Omit<CustomReport, 'id'> = {
            name: reportName,
            dataSourceId: selectedDataSource.id,
            selectedFields,
            createdAt: format(new Date(), 'yyyy-MM-dd'),
        };
        await addCustomReport(newReport);
        toast({ title: "Report Saved", description: `"${reportName}" has been saved.` });
        setIsSaveDialogOpen(false);
        setReportName("");
    } catch (error) {
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the report." });
    }
  };


  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Custom Report Builder"
        description="Build and save your own reports and charts from your business data."
        actions={
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogTrigger asChild>
                    <Button><Save className="mr-2 h-4 w-4" /> Save Report</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Save Custom Report</DialogTitle>
                        <DialogDescription>Give your report a name to save it for later use.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="report-name">Report Name</Label>
                        <Input id="report-name" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="e.g., Monthly Invoice Summary" />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveReport}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Data Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dataSources.map(source => (
                <Button 
                    key={source.id} 
                    variant={selectedDataSourceId === source.id ? "secondary" : "outline"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedDataSourceId(source.id)}
                >
                  <source.icon className="mr-2 h-4 w-4" />
                  {source.name}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Choose Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedDataSource.fields.map(field => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox 
                    id={field} 
                    checked={selectedFields.includes(field)} 
                    onCheckedChange={(checked) => handleFieldChange(field, !!checked)}
                  />
                  <Label htmlFor={field} className="font-normal capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Add Filters</CardTitle>
              <CardDescription>Refine your data.</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <UiTooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full">
                                <Button variant="outline" className="w-full" disabled>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Filter
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Filtering functionality coming soon!</p>
                        </TooltipContent>
                    </UiTooltip>
                </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{isLoading ? <Skeleton className="h-6 w-3/4" /> : reportTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> :
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => selectedDataSource.chartConfig.isCurrency ? formatCurrency(value) : value}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                    formatter={(value: number) => selectedDataSource.chartConfig.isCurrency ? formatCurrency(value) : value.toString()}
                  />
                  <Bar dataKey="value" name={selectedDataSource.chartConfig.valueLabel} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Data Table</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {selectedFields.map(field => (
                                    <TableHead key={field} className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={selectedFields.length}><Skeleton className="h-8" /></TableCell></TableRow>
                            )) :
                            tableData.slice(0, 10).map((row, index) => (
                                <TableRow key={index}>
                                    {selectedFields.map(field => (
                                        <TableCell key={field}>
                                            {field === 'amount' && typeof row[field] === 'number' ? formatCurrency(row[field]) : row[field]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
