
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { Contact } from '@/lib/types';

// Helper to convert Firestore doc to our type, handling Timestamps
function toObject<T>(docData: DocumentData): T {
    const obj: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            // Convert Firestore Timestamp to a 'YYYY-MM-DD' string format
            obj[key] = docData[key].toDate().toISOString().split('T')[0];
        } else {
            obj[key] = docData[key];
        }
    }
    return obj as T;
}

const contactsCollection = collection(db, 'contacts');

export async function getContacts(): Promise<Contact[]> {
    const snapshot = await getDocs(contactsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Contact, 'id'>>(doc.data()) }));
}

export async function addContact(contact: Omit<Contact, 'id'>): Promise<string> {
    const docRef = await addDoc(contactsCollection, contact);
    return docRef.id;
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<void> {
    const docRef = doc(db, 'contacts', id);
    await updateDoc(docRef, data);
}

export async function deleteContact(id: string): Promise<void> {
    const docRef = doc(db, 'contacts', id);
    await deleteDoc(docRef);
}
