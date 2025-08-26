import type { Metadata } from "next";
import Header from "@/app/components/layout/Header";

export const metadata: Metadata = {
    title: "Clear Root",
    description: "Find, review and merge duplicate contacts in your HubSpot CRM",
};

export default function DuplicatesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            {children}
        </div>
    );
}
