"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from "@/lib/utils";

type ChartData = {
  month: string;
  revenue: number;
  expenses: number;
};

export function AccountingChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" stroke="#888888" fontSize={12} />
        <YAxis stroke="#888888" fontSize={12} tickFormatter={(value) => `UGX ${value}`} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        />
        <Legend />
        <Bar dataKey="revenue" fill="hsl(197, 76%, 53%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="hsl(31, 94%, 61%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
