import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Products | AI-Powered School Management Tools',
  description: "Explore School Bud's suite of products: Lois AI, RollCall, and Bursary Pro. Transforming every aspect of African school management.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
