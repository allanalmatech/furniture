
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, query, where, writeBatch, getDoc, documentId } from 'firebase/firestore';
import type { Inventory, Supplier, PurchaseOrder } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // You might need to handle Date conversions if you store Timestamps
    // For example: if (obj.date) obj.date = obj.date.toDate();
    return obj;
}

// --- Inventory Service ---
const inventoryCollection = collection(db, 'inventory');

export async function getInventoryItems(): Promise<Inventory[]> {
    const snapshot = await getDocs(inventoryCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Inventory, 'id'>>(doc.data()) }));
}

export async function addInventoryItem(item: Omit<Inventory, 'id'>): Promise<string> {
    const docRef = await addDoc(inventoryCollection, item);
    return docRef.id;
}

export async function updateInventoryItem(id: string, data: Partial<Inventory>): Promise<void> {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
    const docRef = doc(db, 'inventory', id);
    await deleteDoc(docRef);
}

export async function getProductsByIds(productIds: string[]): Promise<Inventory[]> {
  if (!productIds || productIds.length === 0) {
    return [];
  }
  // Firestore 'in' queries are limited to 30 elements. Chunking the requests.
  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += 30) {
      chunks.push(productIds.slice(i, i + 30));
  }

  const allProducts: Inventory[] = [];
  for (const chunk of chunks) {
      if (chunk.length === 0) continue;
      const q = query(inventoryCollection, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Inventory, 'id'>>(doc.data()) }));
      allProducts.push(...products);
  }
  return allProducts;
}

export async function updateStockForSale(items: { productId: string; quantity: number }[]): Promise<void> {
    const batch = writeBatch(db);

    for (const item of items) {
        const productRef = doc(db, 'inventory', item.productId);
        try {
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const currentStock = productSnap.data().stock as number;
                const newStock = currentStock - item.quantity;
                batch.update(productRef, { stock: newStock >= 0 ? newStock : 0 });
            } else {
                 console.warn(`Product with ID ${item.productId} not found for stock update.`);
            }
        } catch (error) {
            console.error(`Failed to get product ${item.productId} for stock update`, error);
            throw new Error(`Could not read product ${item.productId} to update stock.`);
        }
    }
    await batch.commit();
}


// --- Supplier Service ---
const suppliersCollection = collection(db, 'suppliers');

export async function getSuppliers(): Promise<Supplier[]> {
    const snapshot = await getDocs(suppliersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Supplier, 'id'>>(doc.data()) }));
}

export async function addSupplier(supplier: Omit<Supplier, 'id'>): Promise<string> {
    const docRef = await addDoc(suppliersCollection, supplier);
    return docRef.id;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, data);
}

export async function deleteSupplier(id: string): Promise<void> {
    const docRef = doc(db, 'suppliers', id);
    await deleteDoc(docRef);
}

// --- Purchase Order Service ---
const purchaseOrdersCollection = collection(db, 'purchaseOrders');

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const snapshot = await getDocs(purchaseOrdersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<PurchaseOrder, 'id'>>(doc.data()) }));
}

export async function addPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<string> {
    const docRef = await addDoc(purchaseOrdersCollection, po);
    return docRef.id;
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<void> {
    const docRef = doc(db, 'purchaseOrders', id);
    await updateDoc(docRef, data);

    if (data.status === 'Received') {
        const poDoc = await getDoc(doc(db, 'purchaseOrders', id));
        const poData = poDoc.data() as PurchaseOrder | undefined;
        
        if (poData?.items) {
            const batch = writeBatch(db);
            const productUpdatePromises = poData.items.map(async item => {
                if (item.productId) {
                    const productRef = doc(db, 'inventory', item.productId);
                    try {
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            const currentStock = productSnap.data().stock as number;
                            const newStock = currentStock + item.quantity;
                            batch.update(productRef, { stock: newStock });
                        }
                    } catch (e) {
                        console.error(`Error processing product ${item.productId} for PO ${id}`, e);
                    }
                }
            });

            await Promise.all(productUpdatePromises);
            await batch.commit();
        }
    }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
    const docRef = doc(db, 'purchaseOrders', id);
    await deleteDoc(docRef);
}
