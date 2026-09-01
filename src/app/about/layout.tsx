import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Our Mission',
  description: "Learn about Myschoolbud's mission to build the digital infrastructure for African education. We are creating a lifelong Chain-of-Trust for student records.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
