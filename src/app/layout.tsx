import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveBackground } from "@/components/LiveBackground";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Case-Battle :: Демо игра без реальных платежей",
  description: "Демо клон case-battle с виртуальной валютой",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  return (
    <html lang="ru">
      <body className="antialiased min-h-screen flex flex-col">
        <LiveBackground />
        <SiteHeader user={user ? { id: user.id, username: user.username, balance: user.balance, avatarUrl: user.avatarUrl } : null} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-white/5 mt-10 py-6 text-center text-xs text-[color:var(--muted)]">
          Демо-проект. Виртуальная валюта, без реальных платежей и выводов. Не аффилирован с case-battle.red.
        </footer>
      </body>
    </html>
  );
}
