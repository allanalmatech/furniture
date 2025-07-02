
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, query, where, writeBatch } from 'firebase/firestore';
import type { Quotation, Order, Invoice, SalesTarget } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // You might need to handle Date conversions if you store Timestamps
    // For example: if (obj.date) obj.date = obj.date.toDate();
    return obj;
}

// --- Quotations Service ---
const quotationsCollection = collection(db, 'quotations');

export async function getQuotations(): Promise<Quotation[]> {
    const snapshot = await getDocs(quotationsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Quotation, 'id'>>(doc.data()) }));
}

export async function addQuotation(quotation: Omit<Quotation, 'id'>): Promise<string> {
    const docRef = await addDoc(quotationsCollection, quotation);
    return docRef.id;
}

export async function updateQuotation(id: string, data: Partial<Quotation>): Promise<void> {
    const docRef = doc(db, 'quotations', id);
    await updateDoc(docRef, data);
}

export async function deleteQuotation(id: string): Promise<void> {
    const docRef = doc(db, 'quotations', id);
    await deleteDoc(docRef);
}


// --- Orders Service ---
const ordersCollection = collection(db, 'orders');

export async function getOrders(): Promise<Order[]> {
    const snapshot = await getDocs(ordersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Order, 'id'>>(doc.data()) }));
}

export async function addOrder(order: Omit<Order, 'id'>): Promise<string> {
    const docRef = await addDoc(ordersCollection, order);
    return docRef.id;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, data);
}


// --- Invoices Service ---
const invoicesCollection = collection(db, 'invoices');

export async function getInvoices(): Promise<Invoice[]> {
    const snapshot = await getDocs(invoicesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Invoice, 'id'>>(doc.data()) }));
}

export async function addInvoice(invoice: Omit<Invoice, 'id'>): Promise<string> {
    const docRef = await addDoc(invoicesCollection, invoice);
    return docRef.id;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
    const docRef = doc(db, 'invoices', id);
    await updateDoc(docRef, data);
}

export async function deleteInvoice(id: string): Promise<void> {
    const docRef = doc(db, 'invoices', id);
    await deleteDoc(docRef);
}


// --- Sales Targets Service ---
const salesTargetsCollection = collection(db, 'salesTargets');

export async function getSalesTargets(): Promise<SalesTarget[]> {
    const snapshot = await getDocs(salesTargetsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<SalesTarget, 'id'>>(doc.data()) }));
}

export async function upsertSalesTarget(targetData: Partial<SalesTarget>): Promise<SalesTarget> {
    if (!targetData.agentName || !targetData.period) {
        throw new Error("Agent name and period are required to upsert a sales target.");
    }
    
    const q = query(salesTargetsCollection, 
        where("agentName", "==", targetData.agentName), 
        where("period", "==", targetData.period)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        // Create new
        const docRef = await addDoc(salesTargetsCollection, targetData);
        return { id: docRef.id, ...targetData } as SalesTarget;
    } else {
        // Update existing
        const docToUpdate = snapshot.docs[0];
        const updatedData = { ...docToUpdate.data(), ...targetData };
        await updateDoc(docToUpdate.ref, updatedData);
        return { id: docToUpdate.id, ...updatedData } as SalesTarget;
    }
}

    