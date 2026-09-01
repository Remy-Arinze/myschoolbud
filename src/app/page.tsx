import type { Metadata } from 'next';
import { Suspense } from 'react';
import HomeContent from './HomeContent';

export const metadata: Metadata = {
  title: 'Borderless Academic Identity | Myschoolbud',
  description: 'Myschoolbud turns static paper trails into a living, portable digital profile. Every student achievement, certification, and growth secured on a global ledger.',
};

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
