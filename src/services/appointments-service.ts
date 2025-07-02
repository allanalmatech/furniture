
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { Appointment } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // In this service, we don't have Timestamps to convert, but the helper is good practice.
    return obj;
}

const appointmentsCollection = collection(db, 'appointments');

export async function getAppointments(): Promise<Appointment[]> {
    const snapshot = await getDocs(appointmentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Appointment, 'id'>>(doc.data()) }));
}

export async function addAppointment(appointment: Omit<Appointment, 'id'>): Promise<string> {
    const docRef = await addDoc(appointmentsCollection, appointment);
    return docRef.id;
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<void> {
    const docRef = doc(db, 'appointments', id);
    await updateDoc(docRef, data);
}

export async function deleteAppointment(id: string): Promise<void> {
    const docRef = doc(db, 'appointments', id);
    await deleteDoc(docRef);
}
