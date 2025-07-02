
"use client";

import { useAuth } from "@/context/role-context";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import SalesDashboard from "@/components/dashboards/SalesDashboard";
import DefaultDashboard from "@/components/dashboards/DefaultDashboard";
import { useMemo } from "react";

export default function DashboardPage() {
    const { role } = useAuth();

    const renderDashboard = useMemo(() => {
        switch (role) {
            case 'Admin':
            case 'ManagingDirector':
            case 'ExecutiveDirector':
            case 'GeneralManager':
                return <AdminDashboard />;
            case 'SalesAgent':
            case 'SalesExecutive':
                return <SalesDashboard />;
            default:
                return <DefaultDashboard />;
        }
    }, [role]);

    return <>{renderDashboard}</>;
}
