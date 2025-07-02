
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { AuditLog, ApprovalWorkflow } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // You might need to handle Date conversions if you store Timestamps
    return obj;
}

// Audit Logs
const auditLogsCollection = collection(db, 'auditLogs');

export async function getAuditLogs(): Promise<AuditLog[]> {
    const snapshot = await getDocs(auditLogsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<AuditLog, 'id'>>(doc.data()) }));
}

export async function addAuditLog(log: Omit<AuditLog, 'id'>): Promise<string> {
    const docRef = await addDoc(auditLogsCollection, log);
    return docRef.id;
}


// Approval Workflows
const approvalWorkflowsCollection = collection(db, 'approvalWorkflows');

export async function getApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    const snapshot = await getDocs(approvalWorkflowsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<ApprovalWorkflow, 'id'>>(doc.data()) }));
}

export async function addApprovalWorkflow(workflow: Omit<ApprovalWorkflow, 'id'>): Promise<string> {
    const docRef = await addDoc(approvalWorkflowsCollection, workflow);
    return docRef.id;
}

export async function updateApprovalWorkflow(id: string, data: Partial<ApprovalWorkflow>): Promise<void> {
    const docRef = doc(db, 'approvalWorkflows', id);
    await updateDoc(docRef, data);
}

export async function deleteApprovalWorkflow(id: string): Promise<void> {
    const docRef = doc(db, 'approvalWorkflows', id);
    await deleteDoc(docRef);
}
