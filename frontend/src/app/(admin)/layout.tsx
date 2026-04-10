import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { AdminLayoutWrapper } from "@/components/layout-wrapper"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AdminLayoutWrapper
            sidebar={<AppSidebar variant="inset" />}
            header={<SiteHeader />}
        >
            {children}
        </AdminLayoutWrapper>
    )
}
