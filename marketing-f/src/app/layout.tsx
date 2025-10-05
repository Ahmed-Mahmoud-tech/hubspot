import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";
import Providers from "./providers";
import { GoogleTagManager } from "@/components/GoogleTagManager";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5NN5RQXN';

export const metadata: Metadata = {
  title: "HubSpot Duplicate Management System",
  description: "Manage and merge duplicate contacts in your HubSpot CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTagManager gtmId={GTM_ID} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
