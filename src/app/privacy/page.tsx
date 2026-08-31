'use client';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[var(--dark-bg)] text-[var(--dark-text-primary)] transition-colors duration-300">
            <LandingNavbar />

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                <FadeInUp duration={0.6}>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[var(--dark-text-secondary)] hover:text-[var(--agora-blue)] transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--agora-blue)]/10 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-[var(--agora-blue)]" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-heading">
                            Privacy Policy
                        </h1>
                    </div>

                    <p className="text-[var(--dark-text-secondary)] text-lg mb-12 leading-relaxed">
                        Effective Date: March 5, 2026. Your privacy and data security are the foundation of everything we build at School Bud.
                    </p>

                    <div className="space-y-12 text-[var(--dark-text-secondary)] leading-relaxed text-sm md:text-base">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">1. Introduction to Digital Identity</h2>
                            <p>
                                School Bud ("we," "our," or "us") is built on the principle of academic sovereignty. We ensure that educational records are not just digitized, but transformed into a verified digital identity that is owned by the student and trusted by institutions across Africa.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">2. Information Governance</h2>
                            <p>We collect and process data in three distinct capacities:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Institutional Data:</strong> Necessary for the operation of the school management system (staff records, class structures, financial logs).</li>
                                <li><strong>Academic Identity Data:</strong> Verified records (grades, attendance, certifications) that form the student's borderless profile.</li>
                                <li><strong>Interaction Data:</strong> Logs from School Bud AI usage, used to improve model accuracy and institutional analytics.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">3. Multi-Tenant Isolation & Encryption</h2>
                            <p>
                                The security of academic records is paramount. School Bud employs a "zero-trust" architecture for data access. Every school's data is isolated within its own logical tenant. We use AES-256 encryption at rest and TLS 1.3 for data in transit. Identity verification is secured via cryptographic signatures, ensuring that once a record is verified, its provenance is immutable.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">4. AI Data Processing</h2>
                            <p>
                                School Bud AI processes academic submissions (essays, quizzes) to provide grading assistance. This data is used only within your institutional context and is not used to train global models in a way that would expose personally identifiable information (PII) to other tenants.
                            </p>
                        </section>

                        <section className="space-y-4 border-t border-[var(--dark-border)] pt-12">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">Privacy & Data Requests</h2>
                            <p>
                                Students and parents have the right to request a digital copy of their verified academic identity at any time. For institutional data concerns, please contact our Data Protection Office:
                            </p>
                            <div className="bg-[var(--dark-surface)] p-6 rounded-2xl border border-[var(--dark-border)] transition-colors duration-300">
                                <p className="font-semibold text-[var(--dark-text-primary)]">Data Protection Office</p>
                                <p>Email: privacy@agora.ng</p>
                                <p>Lagos, Nigeria | Secure Academic Registry</p>
                            </div>
                        </section>
                    </div>
                </FadeInUp>
            </main>

            <footer className="py-12 border-t border-[var(--dark-border)] text-center text-[var(--dark-text-muted)] text-sm">
                <p>&copy; 2026 School Bud. All rights reserved.</p>
            </footer>
        </div>
    );
}
