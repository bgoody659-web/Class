import "./globals.css";
import type { Metadata } from "next";
import RealtimeRefresh from "@/components/realtime-refresh";

export const metadata: Metadata = {
  title: "CLASS",
  description: "Sistema SaaS multi-tienda para operaciones de negocios físicos"
};

const themeBootScript = `
  try {
    const theme = localStorage.getItem('class_theme') || 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    const sidebar = localStorage.getItem('class_sidebar_collapsed');
    document.documentElement.dataset.sidebar = sidebar === null && window.matchMedia('(max-width: 768px)').matches ? 'collapsed' : (sidebar === 'true' ? 'collapsed' : 'expanded');
  } catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <RealtimeRefresh />
        {children}
      </body>
    </html>
  );
}
