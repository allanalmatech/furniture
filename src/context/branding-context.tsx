
"use client";

import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { getBranding, updateBranding } from '@/services/settings-service';

export type CompanyBranding = {
  companyName: string;
  logoUrl: string;
};

interface BrandingContextType {
  branding: CompanyBranding;
  setBranding: (value: CompanyBranding | ((prevState: CompanyBranding) => CompanyBranding)) => void;
  loading: boolean;
}

const defaultBranding: CompanyBranding = {
    companyName: "Footsteps Furniture",
    logoUrl: "https://placehold.co/128x128.png",
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<CompanyBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrandingData = async () => {
      try {
        const brandingData = await getBranding();
        setBrandingState(brandingData);
      } catch (error) {
        console.error("Failed to fetch branding from Firestore", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrandingData();
  }, []);

  const setBranding = async (value: CompanyBranding | ((prevState: CompanyBranding) => CompanyBranding)) => {
      const valueToStore = value instanceof Function ? value(branding) : value;
      setBrandingState(valueToStore);
      try {
          await updateBranding(valueToStore);
      } catch (error) {
          console.error("Failed to save branding to Firestore", error);
          // Optional: handle error, maybe revert state or show toast
      }
  };

  const value = useMemo(() => ({ branding, setBranding, loading }), [branding, loading]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
