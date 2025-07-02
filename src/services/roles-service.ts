
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { defaultRolesConfig } from '@/lib/auth';


export type RoleConfig = {
  name: Role;
  description: string;
  permissions: string[];
}

const rolesCollection = collection(db, 'roles');

export async function getRoles(): Promise<RoleConfig[]> {
    const snapshot = await getDocs(rolesCollection);
    
    if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultRolesConfig.forEach(roleConfig => {
            const docRef = doc(rolesCollection, roleConfig.name);
            batch.set(docRef, roleConfig);
        });
        await batch.commit();
        return defaultRolesConfig;
    }

    return snapshot.docs.map(doc => doc.data() as RoleConfig);
}

export async function updateRolePermissions(roleName: Role, permissions: string[]): Promise<void> {
    const roleDocRef = doc(db, "roles", roleName);
    await updateDoc(roleDocRef, { permissions });
}
