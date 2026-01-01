'use server'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageIntro from '@/components/PageIntro'
import { getPageIntro } from '@/lib/pageintro'

export default async function PublicLayout({ children }) {
    const settings = await getPageIntro()
    return (
        <>
            <Navbar />
            <PageIntro initial={settings} />
            {children}
            <Footer />
        </>
    );
}
