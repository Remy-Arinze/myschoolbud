'use client';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type LegalTocItem = { id: string; label: string };

export function LegalPageShell({
    title,
    icon: Icon,
    lastUpdated,
    intro,
    toc,
    otherLegalHref,
    otherLegalLabel,
    children,
}: {
    title: string;
    icon: LucideIcon;
    lastUpdated: string;
    intro: string;
    toc: LegalTocItem[];
    otherLegalHref: string;
    otherLegalLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] transition-colors duration-300">
            <LandingNavbar />

            <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
                <FadeInUp duration={0.6}>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:text-[var(--agora-blue)] transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--agora-blue)]/10 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-[var(--agora-blue)]" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-heading">
                            {title}
                        </h1>
                    </div>

                    <p className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] text-lg mb-4 leading-relaxed max-w-3xl">
                        {intro}
                    </p>
                    <p className="text-sm text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] mb-10">
                        Last updated: {lastUpdated}. Also see our{' '}
                        <Link href={otherLegalHref} className="text-[var(--agora-blue)] hover:underline">
                            {otherLegalLabel}
                        </Link>
                        .
                    </p>

                    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
                        <nav
                            aria-label="On this page"
                            className="mb-10 lg:mb-0 lg:sticky lg:top-28 lg:self-start"
                        >
                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] mb-3">
                                On this page
                            </p>
                            <ul className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col lg:gap-2 text-sm">
                                {toc.map((item) => (
                                    <li key={item.id}>
                                        <a
                                            href={`#${item.id}`}
                                            className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:text-[var(--agora-blue)] transition-colors"
                                        >
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="space-y-12 text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed text-sm md:text-base">
                            {children}
                        </div>
                    </div>
                </FadeInUp>
            </main>

            <footer className="py-12 border-t border-[var(--light-border)] dark:border-[var(--dark-border)] text-center text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] text-sm">
                <p>&copy; 2026 Myschoolbud. All rights reserved.</p>
            </footer>
        </div>
    );
}

export function LegalSection({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="space-y-4 scroll-mt-28">
            <h2 className="text-2xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] font-heading">
                {title}
            </h2>
            {children}
        </section>
    );
}

export function LegalH3({ children }: { children: ReactNode }) {
    return (
        <h3 className="text-lg font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] font-heading pt-2">
            {children}
        </h3>
    );
}

export function LegalList({ children }: { children: ReactNode }) {
    return <ul className="list-disc pl-6 space-y-2">{children}</ul>;
}

export function LegalContactCard({
    title,
    lines,
}: {
    title: string;
    lines: ReactNode[];
}) {
    return (
        <div className="bg-[var(--light-surface)] dark:bg-[var(--dark-surface)] p-6 rounded-2xl border border-[var(--light-border)] dark:border-[var(--dark-border)] transition-colors duration-300">
            <p className="font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-2">
                {title}
            </p>
            {lines.map((line, i) => (
                <p key={i}>{line}</p>
            ))}
        </div>
    );
}
