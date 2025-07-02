
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { EmailCampaign, SmsCampaign, PushCampaign } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // Handle potential Timestamp conversions if needed
    return obj;
}

const getCollection = <T>(collectionName: string) => collection(db, collectionName);

// Generic Service Functions
async function getAll<T>(collectionName:string): Promise<T[]> {
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


// Email Campaigns
export const getEmailCampaigns = async () => await getAll<EmailCampaign>('emailCampaigns');
export const addEmailCampaign = async (data: Omit<EmailCampaign, 'id'>) => await add<EmailCampaign>('emailCampaigns', data);
export const updateEmailCampaign = async (id: string, data: Partial<EmailCampaign>) => await update<EmailCampaign>('emailCampaigns', id, data);
export const deleteEmailCampaign = async (id: string) => await remove('emailCampaigns', id);

// SMS Campaigns
export const getSmsCampaigns = async () => await getAll<SmsCampaign>('smsCampaigns');
export const addSmsCampaign = async (data: Omit<SmsCampaign, 'id'>) => await add<SmsCampaign>('smsCampaigns', data);
export const updateSmsCampaign = async (id: string, data: Partial<SmsCampaign>) => await update<SmsCampaign>('smsCampaigns', id, data);
export const deleteSmsCampaign = async (id: string) => await remove('smsCampaigns', id);

// Push Campaigns
export const getPushCampaigns = async () => await getAll<PushCampaign>('pushCampaigns');
export const addPushCampaign = async (data: Omit<PushCampaign, 'id'>) => await add<PushCampaign>('pushCampaigns', data);
export const updatePushCampaign = async (id: string, data: Partial<PushCampaign>) => await update<PushCampaign>('pushCampaigns', id, data);
export const deletePushCampaign = async (id: string) => await remove('pushCampaigns', id);
