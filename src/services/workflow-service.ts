
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { Workflow } from '@/lib/types';

function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    return obj;
}

const workflowsCollection = collection(db, 'workflows');

export async function getWorkflows(): Promise<Workflow[]> {
    const snapshot = await getDocs(workflowsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Workflow, 'id'>>(doc.data()) }));
}

export async function addWorkflow(workflow: Omit<Workflow, 'id'>): Promise<string> {
    const docRef = await addDoc(workflowsCollection, workflow);
    return docRef.id;
}

export async function updateWorkflow(id: string, data: Partial<Workflow>): Promise<void> {
    const docRef = doc(db, 'workflows', id);
    await updateDoc(docRef, data);
}

export async function deleteWorkflow(id: string): Promise<void> {
    const docRef = doc(db, 'workflows', id);
    await deleteDoc(docRef);
}
