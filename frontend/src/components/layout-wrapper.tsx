"use client";

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function AdminLayoutWrapper({
    sidebar,
    header,
    children
}: {
    sidebar: React.ReactNode;
    header: React.ReactNode;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    
    // Check if the route is literally /meeting/[roomId]
    // The pathname will look like "/meeting/123"
    const isMeetingRoom = pathname?.startsWith('/meeting/') && pathname.split('/').length >= 3;

    if (isMeetingRoom) {
        return <div className="flex flex-1 flex-col h-full w-full bg-background">{children}</div>;
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            {sidebar}
            <SidebarInset>
                {header}
                <div className="flex flex-1 flex-col">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
