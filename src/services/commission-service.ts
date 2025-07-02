
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { CommissionClaim } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    return obj;
}

const commissionCollection = collection(db, 'commissionClaims');

export async function getCommissionClaims(): Promise<CommissionClaim[]> {
    const snapshot = await getDocs(commissionCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<CommissionClaim, 'id'>>(doc.data()) }));
}

export async function addCommissionClaim(claim: Omit<CommissionClaim, 'id'>): Promise<string> {
    const docRef = await addDoc(commissionCollection, claim);
    return docRef.id;
}

export async function updateCommissionClaim(id: string, data: Partial<CommissionClaim>): Promise<void> {
    const docRef = doc(db, 'commissionClaims', id);
    await updateDoc(docRef, data);
}

export async function deleteCommissionClaim(id: string): Promise<void> {
    const docRef = doc(db, 'commissionClaims', id);
    await deleteDoc(docRef);
}

    