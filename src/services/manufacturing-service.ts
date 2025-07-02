
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { BillOfMaterial, WorkOrder, ProductionPlan } from '@/lib/types';

// Helper to convert Firestore doc to our type, handling Timestamps
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

const getCollection = <T>(collectionName: string) => collection(db, collectionName);

// Generic Service Functions
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

// Bill of Materials
export const getBoms = async () => await getAll<BillOfMaterial>('boms');
export const addBom = async (data: Omit<BillOfMaterial, 'id'>) => await add<BillOfMaterial>('boms', data);
export const updateBom = async (id: string, data: Partial<BillOfMaterial>) => await update<BillOfMaterial>('boms', id, data);
export const deleteBom = async (id: string) => await remove('boms', id);

// Work Orders
export const getWorkOrders = async () => await getAll<WorkOrder>('workOrders');
export const addWorkOrder = async (data: Omit<WorkOrder, 'id'>) => await add<WorkOrder>('workOrders', data);
export const updateWorkOrder = async (id: string, data: Partial<WorkOrder>) => await update<WorkOrder>('workOrders', id, data);
export const deleteWorkOrder = async (id: string) => await remove('workOrders', id);

// Production Plans
export const getProductionPlans = async () => await getAll<ProductionPlan>('productionPlans');
export const addProductionPlan = async (data: Omit<ProductionPlan, 'id'>) => await add<ProductionPlan>('productionPlans', data);
export const updateProductionPlan = async (id: string, data: Partial<ProductionPlan>) => await update<ProductionPlan>('productionPlans', id, data);
export const deleteProductionPlan = async (id: string) => await remove('productionPlans', id);
