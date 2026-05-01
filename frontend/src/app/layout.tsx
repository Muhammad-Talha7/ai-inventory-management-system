'use client';

import { Inter } from "next/font/google";
import { usePathname } from 'next/navigation';
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className={`${inter.variable}`} style={{ colorScheme: 'light' }}>
      <body
        className="bg-white text-slate-900"
        style={{ fontFamily: 'var(--font-inter), -apple-system, sans-serif' }}
      >
        <AuthProvider>
          {isLoginPage ? (
            <main className="h-screen w-full overflow-hidden bg-slate-50">
              {children}
            </main>
          ) : (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: '260px' }}>
                <Header />
                <main className="flex-1 overflow-y-auto bg-slate-50" style={{ padding: '28px 32px' }}>
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
