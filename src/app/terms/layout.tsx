import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description:
        'Terms of Service for Myschoolbud: school management, academic identity, transfers, billing, and AI tools. Read before using the platform.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
