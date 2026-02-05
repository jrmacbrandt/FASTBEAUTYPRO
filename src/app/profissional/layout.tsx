import Layout from '@/components/layout/Layout';

export default function ProfessionalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Layout title="Área do Profissional">
            {children}
        </Layout>
    );
}
