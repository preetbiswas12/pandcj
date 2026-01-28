import AdminLayout from "@/components/admin/AdminLayout";
import AdminLoginPage from "./login/page";
import { cookies } from "next/headers";
import jwt from 'jsonwebtoken'

export const metadata = {
    title: "P&C Jewellery - Admin",
    description: "P&C Jewellery - Admin",
};

export default async function RootAdminLayout({ children }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("pandc_admin_token")?.value;
    let isAdmin = false;
    
    if (token) {
        try {
            // Verify JWT token directly
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
            const decoded = jwt.verify(token, JWT_SECRET)
            
            // Check if token has valid userId and role is ADMIN
            if (decoded.userId && decoded.role === 'ADMIN') {
                isAdmin = true
            }
        } catch (e) {
            console.error('[AdminLayout] Token validation failed:', e.message)
            isAdmin = false
        }
    }

    return (
        <>
            <AdminLayout>{isAdmin ? children : <AdminLoginPage />}</AdminLayout>
        </>
    );
}
