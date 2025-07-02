
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp } from 'firebase/firestore';
import type { Project, Task, Milestone } from '@/lib/types';

// Helper to convert Firestore doc to our type, handling Timestamps
function toObject<T>(docData: DocumentData): T {
    const obj: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            obj[key] = docData[key].toDate();
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

// Projects
export const getProjects = async () => await getAll<Project>('projects');
export const addProject = async (data: Omit<Project, 'id'>) => await add<Project>('projects', data);
export const updateProject = async (id: string, data: Partial<Project>) => await update<Project>('projects', id, data);
export const deleteProject = async (id: string) => await remove('projects', id);

// Tasks
export const getTasks = async () => await getAll<Task>('tasks');
export const addTask = async (data: Omit<Task, 'id'>) => await add<Task>('tasks', data);
export const updateTask = async (id: string, data: Partial<Task>) => await update<Task>('tasks', id, data);
export const deleteTask = async (id: string) => await remove('tasks', id);

// Milestones
export const getMilestones = async () => await getAll<Milestone>('milestones');
export const addMilestone = async (data: Omit<Milestone, 'id'>) => await add<Milestone>('milestones', data);
export const updateMilestone = async (id: string, data: Partial<Milestone>) => await update<Milestone>('milestones', id, data);
export const deleteMilestone = async (id: string) => await remove('milestones', id);
