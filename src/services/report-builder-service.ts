
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { CustomReport } from '@/lib/types';

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

const reportsCollection = collection(db, 'customReports');

export async function getCustomReports(): Promise<CustomReport[]> {
    const snapshot = await getDocs(reportsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<CustomReport, 'id'>>(doc.data()) }));
}

export async function addCustomReport(report: Omit<CustomReport, 'id'>): Promise<string> {
    const docRef = await addDoc(reportsCollection, report);
    return docRef.id;
}
