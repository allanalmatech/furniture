// This file is no longer used and can be removed.
"use client";
import { Bar, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueHoursChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--primary))" fontSize={12} label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideRight' }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                    }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="hours" name="Team Hours" stroke="hsl(var(--accent))" strokeWidth={2} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
