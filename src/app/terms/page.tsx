'use client';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function TermsOfService() {
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
                            <Shield className="w-6 h-6 text-[var(--agora-blue)]" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-heading">
                            Terms of Service
                        </h1>
                    </div>

                    <p className="text-[var(--dark-text-secondary)] text-lg mb-12 leading-relaxed">
                        Last updated: March 5, 2026. Please read these terms carefully before using the Myschoolbud platform.
                    </p>

                    <div className="space-y-12 text-[var(--dark-text-secondary)] leading-relaxed text-sm md:text-base">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using Myschoolbud ("the Platform"), you agree to be bound by these Terms of Service. Myschoolbud is a comprehensive school management and academic identity ecosystem. Our services are available only to legal entities (schools) and individuals (parents, students, teachers) who can form legally binding contracts under applicable law.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">2. Description of Service: The Chain-of-Trust</h2>
                            <p>
                                Myschoolbud provides a unified management system designed to digitize legacy records and verify student identities. At its core is the "Chain-of-Trust"—a cryptographically secured registry where:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Institutions</strong> verify the authenticity of student enrollments and academic performance.</li>
                                <li><strong>Teachers</strong> contribute to real-time academic logs, verified by the institution.</li>
                                <li><strong>Students & Parents</strong> claim verified profiles that become a lifelong, immutable academic passport.</li>
                            </ul>
                            <p>
                                The Platform also provides AI-powered tools for grading, lesson planning, and cohort analytics to enhance educational quality.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">3. Academic Identity Ownership</h2>
                            <p>
                                Myschoolbud introduces a paradigm shift in data ownership. While schools input and verify data, the verified academic profile (the "Academic Identity") belongs to the student. This identity is "borderless"—it moves seamlessly between institutions within the Myschoolbud ecosystem, eliminating the need for manual transcript requests when transferring schools.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">4. Professional & Academic Integrity</h2>
                            <p>
                                Users of Myschoolbud AI and our grading systems agree to use these tools to augment, not replace, human pedagogical judgment. Schools are responsible for the final validation of any AI-generated content or grades. Any attempt to upload fraudulent records or bypass the verification protocols will result in immediate termination of the institutional license.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">5. Subscription, Billing & AI Tokens</h2>
                            <p>
                                Access to the Platform is tiered. Paid plans grant access to Myschoolbud AI via a token-based system. Tokens are consumed based on the complexity of the AI task (e.g., grading an essay vs. generating a quiz). Unused tokens expire at the end of the billing cycle unless specified otherwise in your plan.
                            </p>
                        </section>

                        <section className="space-y-4 border-t border-[var(--dark-border)] pt-12">
                            <h2 className="text-2xl font-bold text-[var(--dark-text-primary)] font-heading">Contact Us</h2>
                            <p>
                                If you have any questions about these Terms, the Chain-of-Trust, or how to manage your institutional tenant, please contact:
                            </p>
                            <div className="bg-[var(--dark-surface)] p-6 rounded-2xl border border-[var(--dark-border)] transition-colors duration-300">
                                <p className="font-semibold text-[var(--dark-text-primary)]">Myschoolbud Legal & Operations</p>
                                <p>Email: systems@agora.ng</p>
                                <p>Lagos, Nigeria | Pan-African Support</p>
                            </div>
                        </section>
                    </div>
                </FadeInUp>
            </main>

            <footer className="py-12 border-t border-[var(--dark-border)] text-center text-[var(--dark-text-muted)] text-sm">
                <p>&copy; 2026 Myschoolbud. All rights reserved.</p>
            </footer>
        </div>
    );
}
