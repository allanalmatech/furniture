'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { Ticket } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // Handle potential Timestamp conversions if needed
    return obj;
}

const ticketsCollection = collection(db, 'tickets');

export async function getTickets(): Promise<Ticket[]> {
    const snapshot = await getDocs(ticketsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Ticket, 'id'>>(doc.data()) }));
}

export async function addTicket(ticket: Omit<Ticket, 'id'>): Promise<string> {
    const docRef = await addDoc(ticketsCollection, ticket);
    return docRef.id;
}

export async function updateTicket(id: string, data: Partial<Ticket>): Promise<void> {
    const docRef = doc(db, 'tickets', id);
    await updateDoc(docRef, data);
}

export async function deleteTicket(id: string): Promise<void> {
    const docRef = doc(db, 'tickets', id);
    await deleteDoc(docRef);
}
