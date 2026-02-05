import Layout from '@/components/layout/Layout';

export default function AdminMasterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Layout title="Administrador Master">
            {children}
        </Layout>
    );
}
