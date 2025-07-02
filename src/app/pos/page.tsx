
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Barcode, Search, CreditCard, Trash2, X, Receipt, PauseCircle, ListRestart, Loader2 } from "lucide-react";
import Image from "next/image";
import type { Inventory, Contact, Order } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getInventoryItems, updateStockForSale } from '@/services/inventory-service';
import { getContacts } from '@/services/crm-service';
import { addOrder } from '@/services/sales-service';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';


type CartItem = Inventory & { quantity: number };

const ReceiptDialog = ({
    isOpen,
    onClose,
    saleDetails,
}: {
    isOpen: boolean;
    onClose: () => void;
    saleDetails: { cart: CartItem[], subtotal: number, tax: number, total: number, customer: string, paymentMethod: string, orderId: string } | null;
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    if (!saleDetails) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
             <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-receipt, .printable-receipt * { visibility: visible; }
                    .printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            `}</style>
            <DialogContent className="sm:max-w-md no-print">
                <DialogHeader>
                    <DialogTitle>Sale Complete</DialogTitle>
                    <DialogDescription>
                        Transaction successfully processed. You can now print the receipt.
                    </DialogDescription>
                </DialogHeader>
                <div ref={receiptRef} className="printable-receipt p-4 border rounded-lg bg-background text-foreground space-y-4 font-mono text-sm">
                    <div className="text-center space-y-1">
                        <h3 className="font-bold text-lg">Footsteps Furniture</h3>
                        <p className="text-xs">123 Furniture Ave, Mukono, Uganda</p>
                        <p className="text-xs">Sale Receipt</p>
                    </div>
                    <Separator/>
                    <div className="space-y-1">
                        <p>Date: {new Date().toLocaleString()}</p>
                        <p>Customer: {saleDetails.customer}</p>
                        <p>Transaction ID: {saleDetails.orderId}</p>
                    </div>
                     <Separator dashed />
                    <div>
                        {saleDetails.cart.map(item => (
                            <div key={item.id} className="flex justify-between">
                                <div className='flex-1'>
                                    <p>{item.name}</p>
                                    <p className="pl-2">{item.quantity} x {formatCurrency(item.price)}</p>
                                </div>
                                <p>{formatCurrency(item.quantity * item.price)}</p>
                            </div>
                        ))}
                    </div>
                    <Separator dashed />
                    <div className="space-y-1">
                         <div className="flex justify-between"><p>Subtotal</p><p>{formatCurrency(saleDetails.subtotal)}</p></div>
                         <div className="flex justify-between"><p>Tax</p><p>{formatCurrency(saleDetails.tax)}</p></div>
                         <div className="flex justify-between font-bold text-base"><p>TOTAL</p><p>{formatCurrency(saleDetails.total)}</p></div>
                    </div>
                    <Separator/>
                    <p>Payment Method: {saleDetails.paymentMethod.charAt(0).toUpperCase() + saleDetails.paymentMethod.slice(1)}</p>
                    <p className="text-center pt-2">Thank you for your business!</p>
                </div>
                <DialogFooter className="no-print">
                    <Button variant="outline" onClick={handlePrint}>
                        <Receipt className="mr-2 h-4 w-4"/>
                        Print Receipt
                    </Button>
                    <Button onClick={onClose}>New Sale</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function POSPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [availableProducts, setAvailableProducts] = useState<Inventory[]>([]);
    const [customers, setCustomers] = useState<string[]>(["Walk-in Customer"]);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [heldCarts, setHeldCarts] = useState<CartItem[][]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);
    
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'mobile'>('card');
    
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState(null);
    const [isHeldSalesOpen, setIsHeldSalesOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [productsData, contactsData] = await Promise.all([
                    getInventoryItems(),
                    getContacts(),
                ]);
                setAvailableProducts(productsData);
                const customerNames = [...new Set(contactsData.map(c => c.company || c.name))];
                setCustomers(["Walk-in Customer", ...customerNames]);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Failed to load products and customers." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    useEffect(() => {
        if (!isScannerOpen) return;
        const scanner = new Html5Qrcode("reader");
        const onScanSuccess = (decodedText: string) => {
            const product = availableProducts.find(p => p.sku === decodedText);
            if (product) {
                addToCart(product);
                toast({ title: "Product Scanned", description: `${product.name} added to cart.` });
            } else {
                toast({ variant: 'destructive', title: "Product not found", description: `No product found with SKU: ${decodedText}` });
            }
            setIsScannerOpen(false);
        };
        const onScanError = (errorMessage: string) => { /* ignore */ };
        scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanError)
            .catch(err => {
                console.error("Unable to start scanning.", err);
                toast({ variant: "destructive", title: "Scanner Error", description: "Could not start camera. Please check permissions." });
            });
        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(err => {
                    console.error("Failed to stop scanner.", err);
                });
            }
        };
    }, [isScannerOpen, toast, availableProducts]);

    const filteredProducts = useMemo(() =>
        availableProducts.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        ), [searchQuery, availableProducts]
    );

    const addToCart = (product: Inventory) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                } else {
                    toast({ variant: 'destructive', title: "Stock Limit Reached", description: `Cannot add more of ${product.name}.` });
                    return prevCart;
                }
            }
            if (product.stock > 0) {
                return [...prevCart, { ...product, quantity: 1 }];
            } else {
                toast({ variant: 'destructive', title: "Out of Stock", description: `${product.name} is currently out of stock.` });
                return prevCart;
            }
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prevCart => {
            const itemToUpdate = prevCart.find(item => item.id === productId);
            if (!itemToUpdate) return prevCart;

            const newQuantity = itemToUpdate.quantity + delta;
            
            if (newQuantity > itemToUpdate.stock) {
                toast({ variant: 'destructive', title: "Stock Limit Reached", description: `Only ${itemToUpdate.stock} units of ${itemToUpdate.name} available.` });
                return prevCart;
            }

            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId);
            }
            
            return prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
        });
    };
    
    const removeFromCart = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(customers[0]);
    };

    const handleHoldSale = () => {
        if(cart.length === 0) return;
        setHeldCarts(prev => [...prev, cart]);
        clearCart();
        toast({ title: "Sale Held", description: "The current sale has been saved. You can resume it later." });
    };
    
    const handleResumeSale = (index: number) => {
        const saleToResume = heldCarts[index];
        setCart(saleToResume);
        setHeldCarts(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleDeleteHeldSale = (index: number) => {
        setHeldCarts(prev => prev.filter((_, i) => i !== index));
        toast({ title: "Held Sale Discarded" });
    };

    const processPayment = async (method: 'card' | 'cash' | 'mobile') => {
        setIsProcessingPayment(true);
        try {
            // 1. Create a new Order in the database
            const newOrderData: Omit<Order, 'id'> = {
                customer: selectedCustomer,
                date: format(new Date(), 'yyyy-MM-dd'),
                items: cart.map(item => ({ id: item.id, description: item.name, quantity: item.quantity, unitPrice: item.price })),
                status: 'Processing',
                paymentMethod: method,
                totalAmount: cartTotal,
            };
            const orderId = await addOrder(newOrderData);
            
            // 2. Update stock levels
            const stockUpdateItems = cart.map(item => ({ productId: item.id, quantity: item.quantity }));
            await updateStockForSale(stockUpdateItems);

            // 3. Update local product state to reflect new stock levels
            setAvailableProducts(prevProducts =>
                prevProducts.map(p => {
                    const cartItem = cart.find(ci => ci.id === p.id);
                    return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
                })
            );

            const saleDetails = {
                cart,
                subtotal: cartSubtotal,
                tax: cartTax,
                total: cartTotal,
                customer: selectedCustomer,
                paymentMethod: method,
                orderId: orderId,
            };
            setLastCompletedSale(saleDetails as any);
            setIsPaymentOpen(false);
            setIsReceiptOpen(true);
        } catch (error) {
            console.error("Payment processing failed:", error);
            toast({ variant: 'destructive', title: "Payment Failed", description: "Could not process the sale. Please try again."});
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleNewSale = () => {
        clearCart();
        setIsReceiptOpen(false);
        setLastCompletedSale(null);
    }

    const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const taxRate = 0.08; // 8%
    const cartTax = cartSubtotal * taxRate;
    const cartTotal = cartSubtotal + cartTax;

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)]">
            <PageHeader title="Point of Sale" description="Create a new sale by adding products or scanning a barcode." />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden">
                <div className="lg:col-span-2 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search products by name or SKU..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline" onClick={() => setIsScannerOpen(true)}><Barcode className="mr-2 h-4 w-4" /> Scan</Button>
                    </div>
                    <Card className="flex-grow overflow-y-auto">
                        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {isLoading ? Array.from({length: 8}).map((_, i) => (
                                <Card key={i}><CardContent className="p-3"><Skeleton className="aspect-square w-full rounded-md mb-2" /><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
                            )) :
                             filteredProducts.map(product => (
                                <Card
                                    key={product.id}
                                    className={cn(
                                        "flex flex-col group relative overflow-hidden transition-colors",
                                        product.stock > 0 ? "cursor-pointer hover:border-primary" : "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => product.stock > 0 && addToCart(product)}
                                >
                                    {product.stock === 0 && (
                                        <Badge variant="destructive" className="absolute top-2 right-2 z-10">Out of Stock</Badge>
                                    )}
                                    <div className="aspect-square bg-muted flex items-center justify-center p-2 rounded-t-lg">
                                       <Image src={`https://placehold.co/150x150.png`} alt={product.name} width={150} height={150} className="rounded-md group-hover:scale-105 transition-transform" data-ai-hint="furniture product" />
                                    </div>
                                    <div className="p-3 text-sm flex-grow flex flex-col justify-between">
                                        <div>
                                            <p className="font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-2">
                                            <p className="text-base font-semibold">{formatCurrency(product.price)}</p>
                                            <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Current Sale</CardTitle>
                            <div className="flex items-center gap-1">
                                <Dialog open={isHeldSalesOpen} onOpenChange={setIsHeldSalesOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={heldCarts.length === 0}>
                                            <ListRestart className="mr-2 h-4 w-4" />
                                            Held Sales ({heldCarts.length})
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Held Sales</DialogTitle>
                                            <DialogDescription>Select a sale to resume or discard it.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                                            {heldCarts.length > 0 ? (
                                                heldCarts.map((heldCart, index) => {
                                                    const total = heldCart.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + taxRate);
                                                    return (
                                                        <Card key={index} className="p-4 flex justify-between items-center">
                                                            <div>
                                                                <p className="font-semibold">{heldCart.length} Items</p>
                                                                <p className="text-sm text-muted-foreground">{formatCurrency(total)}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => { handleResumeSale(index); setIsHeldSalesOpen(false); }}>Resume</Button>
                                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteHeldSale(index)}>Delete</Button>
                                                            </div>
                                                        </Card>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-muted-foreground text-center py-8">No sales are currently on hold.</p>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="outline" size="sm" onClick={handleHoldSale} disabled={cart.length === 0}>
                                    <PauseCircle className="mr-2 h-4 w-4" /> Hold
                                </Button>
                                <Button variant="ghost" size="icon" onClick={clearCart} disabled={cart.length === 0}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0 space-y-4">
                        <div className="px-6">
                            <Label htmlFor="customer-select">Customer</Label>
                             <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                <SelectTrigger id="customer-select"><SelectValue /></SelectTrigger>
                                <SelectContent>{customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {cart.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground h-full flex items-center justify-center">
                                <p>No items in cart</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-center w-[80px]">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[40px]"><span className="sr-only">Remove</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="py-2">
                                                <p className="font-medium text-sm leading-tight">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3"/></Button>
                                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium py-2">{formatCurrency(item.price * item.quantity)}</TableCell>
                                            <TableCell className="py-2">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}><X className="h-4 w-4"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-stretch space-y-4 mt-auto p-4 border-t">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><p className="text-muted-foreground">Subtotal</p><p>{formatCurrency(cartSubtotal)}</p></div>
                            <div className="flex justify-between"><p className="text-muted-foreground">Taxes ({(taxRate * 100).toFixed(0)}%)</p><p>{formatCurrency(cartTax)}</p></div>
                            <div className="flex justify-between font-bold text-base"><p>Total</p><p>{formatCurrency(cartTotal)}</p></div>
                        </div>
                        <Button size="lg" disabled={cart.length === 0 || isProcessingPayment} onClick={() => setIsPaymentOpen(true)}>
                            {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            Charge {formatCurrency(cartTotal)}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Scan Product Barcode</DialogTitle><DialogDescription>Point your camera at a barcode.</DialogDescription></DialogHeader>
                    <div id="reader" className="w-full"></div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Process Payment</DialogTitle><DialogDescription>Confirm payment for the transaction.</DialogDescription></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="text-center">
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="text-4xl font-bold">{formatCurrency(cartTotal)}</p>
                        </div>
                         <div className="flex gap-2">
                            <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="flex-1" onClick={() => setPaymentMethod('cash')}>Cash</Button>
                            <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} className="flex-1" onClick={() => setPaymentMethod('card')}>Credit Card</Button>
                            <Button variant={paymentMethod === 'mobile' ? 'default' : 'outline'} className="flex-1" onClick={() => setPaymentMethod('mobile')}>Mobile Money</Button>
                         </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} disabled={isProcessingPayment}>Cancel</Button>
                        <Button onClick={() => processPayment(paymentMethod)} disabled={isProcessingPayment}>
                            {isProcessingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <ReceiptDialog
                isOpen={isReceiptOpen}
                onClose={handleNewSale}
                saleDetails={lastCompletedSale}
            />
        </div>
    );
}
