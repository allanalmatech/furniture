
'use server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, writeBatch, doc, DocumentData, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/types';

function toObject<T>(docData: DocumentData): T {
    const obj: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            obj[key] = docData[key].toDate().toISOString();
        } else {
            obj[key] = docData[key];
        }
    }
    return obj as T;
}

const notificationsCollection = collection(db, 'notifications');

type NewNotificationPayload = {
    recipientId: string;
    type: Notification['type'];
    title: string;
    description: string;
    link?: string;
}

export async function addNotification(notification: NewNotificationPayload): Promise<string> {
    const docRef = await addDoc(notificationsCollection, {
        ...notification,
        createdAt: new Date().toISOString(),
        isRead: false,
    });
    return docRef.id;
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const q = query(
        notificationsCollection, 
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Notification, 'id'>>(doc.data()) }));
}

export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
        const docRef = doc(db, 'notifications', id);
        batch.update(docRef, { isRead: true });
    });
    await batch.commit();
}
