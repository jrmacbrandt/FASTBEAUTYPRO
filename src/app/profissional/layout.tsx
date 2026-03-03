import Layout from '@/components/layout/Layout';
import PasswordResetGuard from '@/components/auth/PasswordResetGuard';

export default function ProfessionalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Layout title="Área do Profissional">
            <PasswordResetGuard>
                {children}
            </PasswordResetGuard>
        </Layout>
    );
}
