
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { QCChecklist, QCInspection } from '@/lib/types';

function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    return obj;
}

const getCollection = <T>(collectionName: string) => collection(db, collectionName);
async function getAll<T>(collectionName: string): Promise<T[]> {
    const snapshot = await getDocs(getCollection<T>(collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<T, 'id'>>(doc.data()) }));
}
async function add<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(getCollection<T>(collectionName), data as DocumentData);
    return docRef.id;
}
async function update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as DocumentData);
}
async function remove(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}

// Checklists
export const getChecklists = async () => await getAll<QCChecklist>('qcChecklists');
export const addChecklist = async (data: Omit<QCChecklist, 'id'>) => await add<QCChecklist>('qcChecklists', data);
export const updateChecklist = async (id: string, data: Partial<QCChecklist>) => await update<QCChecklist>('qcChecklists', id, data);
export const deleteChecklist = async (id: string) => await remove('qcChecklists', id);

// Inspections
export const getInspections = async () => await getAll<QCInspection>('qcInspections');
export const addInspection = async (data: Omit<QCInspection, 'id'>) => await add<QCInspection>('qcInspections', data);
export const updateInspection = async (id: string, data: Partial<QCInspection>) => await update<QCInspection>('qcInspections', id, data);
export const deleteInspection = async (id: string) => await remove('qcInspections', id);
