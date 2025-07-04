
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from "next-themes";
import { RoleProvider } from '@/context/role-context';
import { BrandingProvider } from '@/context/branding-context';

export const metadata: Metadata = {
  title: 'Footsteps Furniture',
  description: 'ERP for Footsteps Furniture Company Limited.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider>
            <RoleProvider>
              <AppLayout>{children}</AppLayout>
              <Toaster />
            </RoleProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
