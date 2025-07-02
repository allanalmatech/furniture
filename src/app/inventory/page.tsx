
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, Barcode, MoreHorizontal, Edit, Trash2, Loader2, ScanLine, X as XIcon, Upload, Download, FileSpreadsheet, FileText, FileUp } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Inventory, Supplier, PurchaseOrder, LineItem } from "@/lib/types";
import { cn, formatCurrency, calculateTotal } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractProductData } from "@/ai/flows/extract-product-data-flow";
import { Html5Qrcode } from "html5-qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, getSuppliers, addSupplier, updateSupplier, deleteSupplier, getPurchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from "@/services/inventory-service";
import { Skeleton } from "@/components/ui/skeleton";


const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  price: z.coerce.number().positive("Price must be a positive number"),
  location: z.string().optional(),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

const supplierFormSchema = z.object({
    name: z.string().min(1, "Supplier name is required"),
    contactPerson: z.string().min(1, "Contact person is required"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(1, "Phone number is required"),
});
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const purchaseOrderSchema = z.object({
    supplierName: z.string().min(1, "Supplier is required"),
    orderDate: z.date({ required_error: "An order date is required." }),
    expectedDelivery: z.date({ required_error: "An expected delivery date is required." }),
    items: z.array(z.object({
      productId: z.string().min(1, "Product is required"),
      description: z.string().min(1, "Description is required"),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.coerce.number().min(0, "Price must be positive"),
    })).min(1, "At least one item is required"),
});
type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

const WarehouseLocation = ({ id, status, itemName }: { id: string; status: 'occupied' | 'empty' | 'aisle'; itemName?: string }) => (
    <TooltipProvider delayDuration={0}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn(
                        "aspect-square border flex items-center justify-center text-xs rounded-sm",
                        status === 'occupied' && 'bg-primary/20 text-primary-foreground font-semibold',
                        status === 'empty' && 'bg-muted/50 hover:bg-muted',
                        status === 'aisle' && 'bg-transparent border-transparent'
                    )}
                >
                    {status !== 'aisle' ? id : ''}
                </div>
            </TooltipTrigger>
            {itemName && (
                <TooltipContent>
                    <p className="font-medium">{id}: {itemName}</p>
                </TooltipContent>
            )}
        </Tooltip>
    </TooltipProvider>
);

const WarehouseMapView = ({ items, isLoading }: { items: Inventory[], isLoading: boolean }) => {
    const layout = Array.from({ length: 8 }, (_, rowIndex) => 
        Array.from({ length: 12 }, (_, colIndex) => {
            if (colIndex === 3 || colIndex === 8) return 'aisle';
            const rack = colIndex < 5 ? 'A' : 'B';
            const col = colIndex < 5 ? colIndex + 1 : colIndex - 3;
            return `${rack}${rowIndex + 1}-${col}`;
        })
    );
    
    const inventoryPlacement = useMemo(() => items.reduce((acc, item) => {
        if (item.location) {
            acc[item.location] = item.name;
        }
        return acc;
    }, {} as { [key: string]: string }), [items]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Warehouse Map View</CardTitle>
                <CardDescription>Visualize inventory placement across your warehouse. Hover over a cell for details.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <>
                <div className="grid grid-cols-12 gap-1 p-4 bg-background rounded-lg border">
                    {layout.flat().map((cellId, index) => {
                        const isAisle = cellId === 'aisle';
                        const itemName = inventoryPlacement[cellId];
                        const status = isAisle ? 'aisle' : (itemName ? 'occupied' : 'empty');
                        
                        return <WarehouseLocation key={index} id={cellId} status={status} itemName={itemName} />;
                    })}
                </div>
                <div className="mt-4 flex items-center gap-x-6 gap-y-2 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-sm bg-primary/20 border"></div>
                        <span>Occupied Shelf</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-sm bg-muted/50 border"></div>
                        <span>Empty Shelf</span>
                    </div>
                </div>
                </>
                )}
            </CardContent>
        </Card>
    );
};

export default function InventoryPage() {
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"Products" | "Suppliers" | "Purchase Orders">("Products");

  const [editingProduct, setEditingProduct] = useState<Inventory | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'product' | 'supplier' | 'po' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [itemsData, suppliersData, poData] = await Promise.all([
                getInventoryItems(),
                getSuppliers(),
                getPurchaseOrders(),
            ]);
            setInventoryItems(itemsData);
            setSuppliers(suppliersData);
            setPurchaseOrders(poData);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load inventory data." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [toast]);


  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });
  
  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
  });

  const poForm = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
        items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: poForm.control,
    name: "items",
  });

  useEffect(() => {
    if (!isBarcodeScannerOpen) return;

    const scanner = new Html5Qrcode("reader");

    const onScanSuccess = (decodedText: string) => {
        setSearchQuery(decodedText);
        setIsBarcodeScannerOpen(false);
        toast({
            title: "Barcode Scanned",
            description: `Searching for product SKU: ${decodedText}`,
        });
    };

    const onScanError = (errorMessage: string) => {
      // ignore
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
        .catch(err => {
            console.error("Unable to start scanning.", err);
            toast({
                variant: "destructive",
                title: "Scanner Error",
                description: "Could not start camera. Please check permissions."
            });
        });

    return () => {
        if (scanner && scanner.isScanning) {
            scanner.stop().catch(err => {
                console.error("Failed to stop scanner.", err);
            });
        }
    };
}, [isBarcodeScannerOpen, toast]);


  const onProductSubmit = async (values: ProductFormValues) => {
    try {
        if (editingProduct) {
            await updateInventoryItem(editingProduct.id, values);
            setInventoryItems(prev => prev.map(p => p.id === editingProduct.id ? { ...editingProduct, ...values } : p));
            toast({ title: "Product Updated" });
        } else {
            const newId = await addInventoryItem(values);
            setInventoryItems(prev => [{ id: newId, ...values }, ...prev]);
            toast({ title: "Product Added" });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the product." });
    } finally {
        setIsProductDialogOpen(false);
        setEditingProduct(null);
    }
  };
  
  const onSupplierSubmit = async (values: SupplierFormValues) => {
    try {
      if (editingSupplier) {
          await updateSupplier(editingSupplier.id, values);
          setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...editingSupplier, ...values } : s));
          toast({ title: "Supplier Updated" });
      } else {
          const newId = await addSupplier(values);
          setSuppliers(prev => [{ id: newId, ...values }, ...prev]);
          toast({ title: "Supplier Added" });
      }
    } catch (error) {
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the supplier." });
    } finally {
      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
    }
  };

  const onPoSubmit = async (values: PurchaseOrderFormValues) => {
      try {
        const newPOData: Omit<PurchaseOrder, 'id'> = {
            supplierName: values.supplierName,
            orderDate: format(values.orderDate, 'yyyy-MM-dd'),
            expectedDelivery: format(values.expectedDelivery, 'yyyy-MM-dd'),
            items: values.items.map(item => ({...item, id: Math.random().toString()})),
            status: 'Draft',
        };
        const newId = await addPurchaseOrder(newPOData);
        setPurchaseOrders(prev => [{id: newId, ...newPOData }, ...prev]);
        toast({ title: "Purchase Order Created", description: `PO for ${values.supplierName} has been saved as a draft.` });
      } catch (error) {
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not create purchase order." });
      } finally {
        setIsPoDialogOpen(false);
        poForm.reset();
      }
  };

  const openProductDialog = (product: Inventory | null = null) => {
    setEditingProduct(product);
    if (product) {
      productForm.reset(product);
    } else if (!productForm.formState.isDirty) {
      productForm.reset({ name: "", sku: "", category: "", stock: 0, price: 0, location: "" });
    }
    setIsProductDialogOpen(true);
  };

  const openSupplierDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    supplierForm.reset(supplier ? supplier : { name: "", contactPerson: "", email: "", phone: "" });
    setIsSupplierDialogOpen(true);
  };

  const openDeleteDialog = (id: string, type: 'product' | 'supplier' | 'po') => {
      setItemToDelete({ id, type });
      setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
        if (itemToDelete.type === 'product') {
            await deleteInventoryItem(itemToDelete.id);
            setInventoryItems(p => p.filter(i => i.id !== itemToDelete.id));
        }
        if (itemToDelete.type === 'supplier') {
            await deleteSupplier(itemToDelete.id);
            setSuppliers(s => s.filter(i => i.id !== itemToDelete.id));
        }
        if (itemToDelete.type === 'po') {
            await deletePurchaseOrder(itemToDelete.id);
            setPurchaseOrders(po => po.filter(i => i.id !== itemToDelete.id));
        }
        toast({ title: "Item Deleted", description: "The selected item has been successfully deleted." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the item." });
    } finally {
        setIsAlertOpen(false);
        setItemToDelete(null);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanProduct = async () => {
    if (!selectedFile) {
        toast({ title: "No file selected", description: "Please upload an image of the product label.", variant: "destructive" });
        return;
    }

    setIsScanning(true);
    toast({ title: "Scanning Product...", description: "The AI is analyzing the product image." });

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
        const base64Image = reader.result as string;
        try {
            const extractedData = await extractProductData({ productImageUri: base64Image });
            
            productForm.reset({
                name: extractedData.name,
                sku: extractedData.sku,
                category: extractedData.category,
                stock: 1,
                price: 0,
            });

            toast({ title: "Scan Complete!", description: "Product details have been pre-filled. Please review and save." });
            
            setIsScanDialogOpen(false);
            openProductDialog(null);

        } catch (error) {
            console.error("Error scanning product:", error);
            toast({
                variant: "destructive",
                title: "Scan Failed",
                description: "Could not extract data from the image. Please enter it manually.",
            });
        } finally {
            setIsScanning(false);
            setSelectedFile(null);
            setImagePreview(null);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({
            variant: "destructive",
            title: "File Error",
            description: "Could not read the selected file.",
        });
        setIsScanning(false);
    };
  };
  
  const handleUpdatePoStatus = async (id: string, status: PurchaseOrder['status']) => {
      try {
        await updatePurchaseOrder(id, { status });
        setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status } : po));
        toast({ title: "Status Updated", description: `Purchase Order ${id} status updated to ${status}.`});
      } catch (error) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not update purchase order status." });
      }
  };

  const handleScanButtonClick = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setIsScanDialogOpen(true);
  }

  const handleImportButtonClick = (type: "Products" | "Suppliers" | "Purchase Orders") => {
    setImportType(type);
    setIsImportOpen(true);
  };

  const handleImportSubmit = () => {
    if (!importFile) {
        toast({ variant: 'destructive', title: "No file selected", description: "Please select a CSV file to import."});
        return;
    }
    toast({ title: `Importing ${importType}`, description: `Processing ${importFile.name}. This feature is a demo.` });
    setIsImportOpen(false);
    setImportFile(null);
  }

  const filteredInventory = useMemo(() => inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  ), [inventoryItems, searchQuery]);
  
  const filteredSuppliers = useMemo(() => suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  ), [suppliers, searchQuery]);

  const filteredPOs = useMemo(() => purchaseOrders.filter(po =>
    po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  ), [purchaseOrders, searchQuery]);
  
  const handleExport = (format: "csv" | "pdf" | "xlsx", dataType: "products" | "suppliers" | "pos") => {
    let data: any[] = [];
    let headers: string[] = [];
    let body: (string | number | undefined)[][] = [];
    let filename = "";

    if (dataType === "products") {
        data = filteredInventory;
        headers = ["ID", "Name", "SKU", "Category", "Stock", "Price", "Location"];
        body = data.map(p => [p.id, p.name, p.sku, p.category, p.stock, p.price, p.location]);
        filename = "inventory";
    } else if (dataType === "suppliers") {
        data = filteredSuppliers;
        headers = ["ID", "Name", "Contact Person", "Email", "Phone"];
        body = data.map(s => [s.id, s.name, s.contactPerson, s.email, s.phone]);
        filename = "suppliers";
    } else if (dataType === "pos") {
        data = filteredPOs;
        headers = ["ID", "Supplier", "Order Date", "Expected Delivery", "Total", "Status"];
        body = data.map(p => [p.id, p.supplierName, p.orderDate, p.expectedDelivery, calculateTotal(p.items), p.status]);
        filename = "purchase_orders";
    }
    
    toast({ title: `Exporting ${filename.replace(/_/g, ' ')}`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

    if (format === 'csv') {
        const csvContent = [headers.join(','), ...body.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
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
            if ((header === 'price' || header === 'total') && typeof cell === 'number') {
                return formatCurrency(cell);
            }
            return cell ?? '-';
        }));

        autoTable(doc, {
            head: [headers],
            body: pdfBody as any,
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

  return (
    <div>
      <PageHeader
        title="Inventory & Procurement"
        description="Manage products, stock, suppliers, and purchase orders."
      />

      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="warehouse-view">Warehouse View</TabsTrigger>
        </TabsList>
        <div className="flex justify-between items-center mb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search current tab..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <TabsContent value="products" className="m-0">
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleImportButtonClick('Products')}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('csv', 'products')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('xlsx', 'products')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf', 'products')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Dialog open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Barcode className="mr-2 h-4 w-4" /> Scan Barcode</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Scan Product Barcode</DialogTitle>
                                <DialogDescription>Point your camera at a barcode or QR code to search.</DialogDescription>
                            </DialogHeader>
                            <div id="reader" className="w-full"></div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleScanButtonClick}>
                        <ScanLine className="mr-2 h-4 w-4" />
                        Scan Label (AI)
                    </Button>
                    <Button onClick={() => openProductDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </div>
            </TabsContent>
            <TabsContent value="suppliers" className="m-0">
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleImportButtonClick('Suppliers')}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('csv', 'suppliers')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('xlsx', 'suppliers')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf', 'suppliers')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => openSupplierDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Supplier
                    </Button>
                </div>
            </TabsContent>
            <TabsContent value="purchase-orders" className="m-0">
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleImportButtonClick('Purchase Orders')}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('csv', 'pos')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('xlsx', 'pos')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf', 'pos')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => setIsPoDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Purchase Order
                    </Button>
                </div>
            </TabsContent>
        </div>
        <TabsContent value="products">
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>
                  )) : filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.sku}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                      <TableCell>
                        <Badge variant={item.stock > 100 ? "secondary" : "destructive"}>
                          {item.stock} in stock
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openProductDialog(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(item.id, 'product')}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
        </TabsContent>

        <TabsContent value="suppliers">
            <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier Name</TableHead>
                            <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                            <TableHead className="hidden lg:table-cell">Email</TableHead>
                            <TableHead>Phone</TableHead>
                             <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
                        )) : filteredSuppliers.map((supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell className="hidden md:table-cell">{supplier.contactPerson}</TableCell>
                                <TableCell className="hidden lg:table-cell">{supplier.email}</TableCell>
                                <TableCell>{supplier.phone}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openSupplierDialog(supplier)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                            <DropdownMenuSeparator/>
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(supplier.id, 'supplier')}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>
        
        <TabsContent value="purchase-orders">
            <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO #</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="hidden md:table-cell">Order Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                             <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 4}).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>
                        )) : filteredPOs.map((po) => (
                            <TableRow key={po.id}>
                                <TableCell className="font-medium">{po.id}</TableCell>
                                <TableCell>{po.supplierName}</TableCell>
                                <TableCell className="hidden md:table-cell">{po.orderDate}</TableCell>
                                <TableCell>{formatCurrency(calculateTotal(po.items))}</TableCell>
                                <TableCell>
                                    <Badge
                                        className={cn(
                                          po.status === "Received" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                          po.status === "Ordered" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                                          po.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
                                          po.status === "Cancelled" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                        )}
                                    >
                                        {po.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            <DropdownMenuSeparator/>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => handleUpdatePoStatus(po.id, 'Ordered')}>Mark as Ordered</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdatePoStatus(po.id, 'Received')}>Mark as Received</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdatePoStatus(po.id, 'Cancelled')}>Mark as Cancelled</DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator/>
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(po.id, 'po')}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>
        <TabsContent value="warehouse-view">
            <WarehouseMapView items={inventoryItems} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
      
      {/* Product Dialog */}
       <Dialog open={isProductDialogOpen} onOpenChange={(open) => { if (!open) setEditingProduct(null); setIsProductDialogOpen(open); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>{editingProduct ? 'Update the details for this product.' : 'Fill in the details for the new inventory item.'}</DialogDescription>
                </DialogHeader>
                <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-6">
                        <FormField control={productForm.control} name="name" render={({ field }) => (<FormItem><Label>Product Name</Label><FormControl><Input placeholder="e.g., Premium Widget" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={productForm.control} name="sku" render={({ field }) => (<FormItem><Label>SKU</Label><FormControl><Input placeholder="e.g., PW-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={productForm.control} name="category" render={({ field }) => (<FormItem><Label>Category</Label><FormControl><Input placeholder="e.g., Widgets" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={productForm.control} name="location" render={({ field }) => (<FormItem><Label>Location</Label><FormControl><Input placeholder="e.g., A1-1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={productForm.control} name="stock" render={({ field }) => (<FormItem><Label>Stock</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={productForm.control} name="price" render={({ field }) => (<FormItem><Label>Price</Label><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingProduct ? 'Save Changes' : 'Add Product'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Supplier Dialog */}
        <Dialog open={isSupplierDialogOpen} onOpenChange={(open) => { if (!open) setEditingSupplier(null); setIsSupplierDialogOpen(open); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogDescription>{editingSupplier ? 'Update the details for this supplier.' : 'Fill in the contact details for the new supplier.'}</DialogDescription>
                </DialogHeader>
                <Form {...supplierForm}>
                    <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="space-y-6">
                        <FormField control={supplierForm.control} name="name" render={({ field }) => (<FormItem><Label>Supplier Name</Label><FormControl><Input placeholder="e.g., Global Electronics" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={supplierForm.control} name="contactPerson" render={({ field }) => (<FormItem><Label>Contact Person</Label><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={supplierForm.control} name="email" render={({ field }) => (<FormItem><Label>Email</Label><FormControl><Input type="email" placeholder="e.g., john@globalelec.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={supplierForm.control} name="phone" render={({ field }) => (<FormItem><Label>Phone Number</Label><FormControl><Input placeholder="e.g., 555-111-1111" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsSupplierDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingSupplier ? 'Save Changes' : 'Add Supplier'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Purchase Order Dialog */}
         <Dialog open={isPoDialogOpen} onOpenChange={setIsPoDialogOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>New Purchase Order</DialogTitle>
                    <DialogDescription>Create a new purchase order for a supplier.</DialogDescription>
                </DialogHeader>
                 <Form {...poForm}>
                    <form onSubmit={poForm.handleSubmit(onPoSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={poForm.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel>Supplier</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger></FormControl><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={poForm.control} name="orderDate" render={({ field }) => (<FormItem className="flex flex-col pt-2"><FormLabel>Order Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={poForm.control} name="expectedDelivery" render={({ field }) => (<FormItem className="flex flex-col pt-2"><FormLabel>Expected Delivery</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Line Items</h3>
                             <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_1fr_100px_100px_auto] items-end gap-2 p-3 bg-muted rounded-md">
                                        <FormField control={poForm.control} name={`items.${index}.productId`} render={({ field }) => (
                                            <FormItem><FormLabel>Product</FormLabel>
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value);
                                                    const product = inventoryItems.find(p => p.id === value);
                                                    if(product) {
                                                        poForm.setValue(`items.${index}.description`, product.name);
                                                        poForm.setValue(`items.${index}.unitPrice`, product.price);
                                                    }
                                                }} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl>
                                                    <SelectContent>{inventoryItems.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>)} />
                                        <FormField control={poForm.control} name={`items.${index}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Item description" {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField control={poForm.control} name={`items.${index}.quantity`} render={({ field }) => <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField control={poForm.control} name={`items.${index}.unitPrice`} render={({ field }) => <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><XIcon className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0 })}>
                                    <Plus className="mr-2 h-4 w-4"/> Add Item
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsPoDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Create PO</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        {/* Scan Product Dialog */}
        <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Product with AI</DialogTitle>
                    <DialogDescription>
                        Upload an image of a product label or barcode. The AI will attempt to extract the details.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="product-image-file" className="sr-only">Upload Product Image</Label>
                        <Input id="product-image-file" type="file" accept="image/*" onChange={handleFileChange} disabled={isScanning} />
                    </div>
                    {imagePreview && (
                        <div className="relative aspect-video w-full mt-4 border rounded-md overflow-hidden">
                            <Image src={imagePreview} alt="Product preview" fill style={{ objectFit: 'contain' }} />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isScanning}>Cancel</Button>
                    <Button onClick={handleScanProduct} disabled={!selectedFile || isScanning}>
                        {isScanning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ScanLine className="mr-2 h-4 w-4" />
                        )}
                        Scan Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) setImportFile(null); setIsImportOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import {importType}</DialogTitle>
                    <DialogDescription>Upload a CSV file to bulk-add {importType.toLowerCase()}. Make sure your file matches the required format.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>1. Download Template (Optional)</Label>
                        <p className="text-xs text-muted-foreground">If you're unsure about the format, download our template to get started.</p>
                        <Button variant="outline" className="w-full">
                            <Download className="mr-2 h-4 w-4"/>
                            Download CSV Template
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="import-file">2. Upload your CSV file</Label>
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

      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the selected item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
