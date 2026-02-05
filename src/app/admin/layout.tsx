import Layout from '@/components/layout/Layout';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Layout title="Painel Administrativo">
            {children}
        </Layout>
    );
}
