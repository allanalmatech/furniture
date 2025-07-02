
"use client";

import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User, Role } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { defaultRolesConfig } from '@/lib/auth';
import { getRoles, updateRolePermissions, type RoleConfig } from '@/services/roles-service';

const roleNames: Record<Role, string> = {
    Admin: "Admin",
    ManagingDirector: "Managing Director",
    ExecutiveDirector: "Executive Director",
    GeneralManager: "General Manager",
    HRManager: "HR Manager",
    FactoryManager: "Factory Manager",
    OperationalManager: "Operational Manager",
    SalesExecutive: "Sales Executive",
    SalesAgent: "Sales Agent",
    BidsOfficer: "Bids Officer",
    ProcurementOfficer: "Procurement Officer",
    Cashier: "Cashier",
    StoreManager: "Store Manager",
    User: "Carpenter",
};

type RolesConfig = typeof defaultRolesConfig;

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  role: Role;
  roleName: string;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permissionId: string) => boolean;
  rolesConfig: RolesConfig;
  setRolesConfig: (value: RolesConfig | ((prevState: RolesConfig) => RolesConfig)) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesConfig, setRolesConfig] = useState<RolesConfig>(defaultRolesConfig);
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'staff', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userDataFromDb = userDocSnap.data() as User;
           setUser({
              id: firebaseUser.uid,
              name: userDataFromDb.name || firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: userDataFromDb.role,
           });
        } else {
            console.error("User document not found in Firestore 'staff' collection. Logging out.");
            await signOut(auth);
            setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const fetchRoles = async () => {
        try {
            const configFromDb = await getRoles();
            if (configFromDb && configFromDb.length > 0) {
              const orderedConfig = defaultRolesConfig.map(defaultRole => 
                  configFromDb.find(dbRole => dbRole.name === defaultRole.name) || defaultRole
              );
              setRolesConfig(orderedConfig);
            }
        } catch (error) {
            console.error("Failed to fetch roles config from Firestore", error);
            setRolesConfig(defaultRolesConfig);
        }
    };
    
    fetchRoles();

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error) {
        console.error("Firebase login error:", error);
        return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const hasPermission = (permissionId: string) => {
    if (!user) return false;
    const adminRoles: Role[] = ['Admin', 'ManagingDirector', 'ExecutiveDirector'];
    if (adminRoles.includes(user.role)) return true;
    
    const userRoleConfig = rolesConfig.find(r => r.name === user.role);
    return userRoleConfig?.permissions.includes(permissionId) || false;
  }

  const handleSetRolesConfig = async (value: RolesConfig | ((prevState: RolesConfig) => RolesConfig)) => {
      const oldConfig = rolesConfig;
      const newConfig = value instanceof Function ? value(rolesConfig) : value;

      const changedRole = newConfig.find((newRole, index) => {
          const oldRole = oldConfig[index];
          return JSON.stringify(newRole.permissions) !== JSON.stringify(oldRole.permissions);
      });

      if (changedRole) {
          try {
              await updateRolePermissions(changedRole.name, changedRole.permissions);
              setRolesConfig(newConfig);
          } catch (error) {
              console.error("Failed to save roles config to Firestore", error);
          }
      }
  };
  
  const value = useMemo(() => ({ 
      user, 
      setUser,
      loading,
      role: user?.role || 'User',
      roleName: user ? roleNames[user.role] : "Guest",
      login,
      logout,
      hasPermission,
      rolesConfig,
      setRolesConfig: handleSetRolesConfig
    }), [user, loading, rolesConfig]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a RoleProvider');
  }
  return context;
}
