import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalVoiceChrome } from "@/components/GlobalVoiceChrome";
import { UserOpenAIKeyProvider } from "@/components/UserOpenAIKeyProvider";
import { VoiceAssistantProvider } from "@/components/VoiceAssistantProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent workspace",
  description: "Task Hub, P21 SQL Query Master, and agentic tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <UserOpenAIKeyProvider>
          <VoiceAssistantProvider>
            <GlobalVoiceChrome />
            {children}
          </VoiceAssistantProvider>
        </UserOpenAIKeyProvider>
      </body>
    </html>
  );
}
