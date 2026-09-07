import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description:
        'How Myschoolbud collects, uses, and protects student, parent, and school data under the Nigeria Data Protection Act, including children, health records, transfers, and AI.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
