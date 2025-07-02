
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { Vehicle, FuelLog, MaintenanceSchedule } from '@/lib/types';

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

// Vehicles
export const getVehicles = async () => await getAll<Vehicle>('vehicles');
export const addVehicle = async (data: Omit<Vehicle, 'id'>) => await add<Vehicle>('vehicles', data);
export const updateVehicle = async (id: string, data: Partial<Vehicle>) => await update<Vehicle>('vehicles', id, data);
export const deleteVehicle = async (id: string) => await remove('vehicles', id);

// Fuel Logs
export const getFuelLogs = async () => await getAll<FuelLog>('fuelLogs');
export const addFuelLog = async (data: Omit<FuelLog, 'id'>) => await add<FuelLog>('fuelLogs', data);
export const updateFuelLog = async (id: string, data: Partial<FuelLog>) => await update<FuelLog>('fuelLogs', id, data);
export const deleteFuelLog = async (id: string) => await remove('fuelLogs', id);

// Maintenance Schedules
export const getMaintenanceSchedules = async () => await getAll<MaintenanceSchedule>('maintenanceSchedules');
export const addMaintenanceSchedule = async (data: Omit<MaintenanceSchedule, 'id'>) => await add<MaintenanceSchedule>('maintenanceSchedules', data);
export const updateMaintenanceSchedule = async (id: string, data: Partial<MaintenanceSchedule>) => await update<MaintenanceSchedule>('maintenanceSchedules', id, data);
export const deleteMaintenanceSchedule = async (id: string) => await remove('maintenanceSchedules', id);
