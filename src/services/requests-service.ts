
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { MaterialCashRequest } from '@/lib/types';

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

const requestsCollection = collection(db, 'materialCashRequests');

export async function getRequests(): Promise<MaterialCashRequest[]> {
    const snapshot = await getDocs(requestsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<MaterialCashRequest, 'id'>>(doc.data()) }));
}

export async function addRequest(request: Omit<MaterialCashRequest, 'id'>): Promise<string> {
    const docRef = await addDoc(requestsCollection, request as DocumentData);
    return docRef.id;
}

export async function updateRequest(id: string, data: Partial<MaterialCashRequest>): Promise<void> {
    const docRef = doc(db, 'materialCashRequests', id);
    await updateDoc(docRef, data as DocumentData);
}

export async function deleteRequest(id: string): Promise<void> {
    const docRef = doc(db, 'materialCashRequests', id);
    await deleteDoc(docRef);
}
