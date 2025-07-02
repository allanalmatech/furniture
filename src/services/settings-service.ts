
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, DocumentData, getDoc, setDoc } from 'firebase/firestore';
import type { ApiKey, CompanyBranding, LocalizationSettings } from '@/lib/types';

function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    return obj;
}

// --- API Keys ---
const apiKeysCollection = collection(db, 'apiKeys');

export async function getApiKeys(): Promise<ApiKey[]> {
    const snapshot = await getDocs(apiKeysCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<ApiKey, 'id'>>(doc.data()) }));
}

export async function addApiKey(apiKey: Omit<ApiKey, 'id'>): Promise<string> {
    const docRef = await addDoc(apiKeysCollection, apiKey);
    return docRef.id;
}

export async function deleteApiKey(id: string): Promise<void> {
    const docRef = doc(db, 'apiKeys', id);
    await deleteDoc(docRef);
}


// --- Branding Settings ---
const brandingDocRef = doc(db, 'settings', 'branding');

export async function getBranding(): Promise<CompanyBranding> {
    const docSnap = await getDoc(brandingDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as CompanyBranding;
    } else {
        // Default branding if not found in DB
        const defaultBranding: CompanyBranding = {
            companyName: "Footsteps Furniture",
            logoUrl: "https://placehold.co/128x128.png",
        };
        await setDoc(brandingDocRef, defaultBranding);
        return defaultBranding;
    }
}

export async function updateBranding(data: CompanyBranding): Promise<void> {
    await setDoc(brandingDocRef, data);
}


// --- Localization Settings ---
const localizationDocRef = doc(db, 'settings', 'localization');

export async function getLocalizationSettings(): Promise<LocalizationSettings> {
    const docSnap = await getDoc(localizationDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as LocalizationSettings;
    } else {
        const defaultSettings: LocalizationSettings = { currency: 'UGX' };
        await setDoc(localizationDocRef, defaultSettings);
        return defaultSettings;
    }
}

export async function updateLocalizationSettings(data: Partial<LocalizationSettings>): Promise<void> {
    await setDoc(localizationDocRef, data, { merge: true });
}
