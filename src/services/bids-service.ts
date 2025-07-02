
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { Bid } from '@/lib/types';

// Helper to convert Firestore doc to our type, handling Timestamps
function toObject<T>(docData: DocumentData): T {
    const obj: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            obj[key] = docData[key].toDate().toISOString().split('T')[0];
        } else {
            obj[key] = docData[key];
        }
    }
    return obj as T;
}

const bidsCollection = collection(db, 'bids');

export async function getBids(): Promise<Bid[]> {
    const snapshot = await getDocs(bidsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Bid, 'id'>>(doc.data()) }));
}

export async function addBid(bid: Omit<Bid, 'id'>): Promise<string> {
    const docRef = await addDoc(bidsCollection, bid);
    return docRef.id;
}

export async function updateBid(id: string, data: Partial<Bid>): Promise<void> {
    const docRef = doc(db, 'bids', id);
    await updateDoc(docRef, data);
}

export async function deleteBid(id: string): Promise<void> {
    const docRef = doc(db, 'bids', id);
    await deleteDoc(docRef);
}
