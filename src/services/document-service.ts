
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { Document } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    return obj;
}

const documentsCollection = collection(db, 'documents');

export async function getDocuments(): Promise<Document[]> {
    const snapshot = await getDocs(documentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Document, 'id'>>(doc.data()) }));
}

export async function addDocument(document: Omit<Document, 'id'>): Promise<string> {
    const docRef = await addDoc(documentsCollection, document);
    return docRef.id;
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<void> {
    const docRef = doc(db, 'documents', id);
    await updateDoc(docRef, data);
}

export async function deleteDocument(id: string): Promise<void> {
    const docRef = doc(db, 'documents', id);
    await deleteDoc(docRef);
}
