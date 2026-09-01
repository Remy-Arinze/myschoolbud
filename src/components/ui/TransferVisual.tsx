'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const TransferVisual = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<SVGPathElement>(null);
    const packetsRef = useRef<HTMLDivElement>(null);
    const rippleRef = useRef<HTMLDivElement>(null);
    const destGlowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const packets = gsap.utils.toArray('.data-packet');

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 70%',
                    end: 'bottom 20%',
                    scrub: 1, // Smooth scrub
                }
            });

            // The path length is approximately 640px (120 down + 120 right + 160 down + 120 left + 120 down)
            tl.fromTo(lineRef.current,
                { strokeDashoffset: 650, strokeDasharray: 650 },
                { strokeDashoffset: 0, ease: 'none', duration: 1.5 },
                0
            );

            // Packets animate sequentially down the branching path based on scroll
            packets.forEach((packet: any, i) => {
                const delay = i * 0.15; // Stagger start time
                
                gsap.set(packet, { x: 0, y: 0, opacity: 0 });

                const pktTl = gsap.timeline();
                // Fade in
                pktTl.to(packet, { opacity: 1, duration: 0.05, ease: 'none' })
                     // Travel down to branch
                     .to(packet, { y: 120, duration: 0.2, ease: 'none' })
                     // Travel right
                     .to(packet, { x: 120, duration: 0.15, ease: 'none' })
                     // Travel down through validation
                     .to(packet, { y: 280, duration: 0.2, ease: 'none' })
                     // Travel left back to main spine
                     .to(packet, { x: 0, duration: 0.15, ease: 'none' })
                     // Travel down to destination
                     .to(packet, { y: 400, duration: 0.2, ease: 'none' })
                     // Fade out
                     .to(packet, { opacity: 0, duration: 0.05, ease: 'none' });

                tl.add(pktTl, delay);
            });

            // Success Animation at the Destination School at the end of the timeline
            const endTime = 1.5;
            tl.fromTo(rippleRef.current, 
                { scale: 0.5, opacity: 0.8 }, 
                { scale: 4, opacity: 0, duration: 0.3, ease: 'power1.out' }, 
                endTime
            );
            tl.to(destGlowRef.current, 
                { backgroundColor: '#4ade80', boxShadow: '0 0 30px #4ade80', duration: 0.2 }, 
                endTime
            );

        }, containerRef);

        return () => ctx.revert();
    }, []);

    const packetData = [
        { label: 'Academic Records', color: 'bg-agora-blue' },
        { label: 'Verified ID', color: 'bg-agora-accent' },
        { label: 'Financial Clearance', color: 'bg-agora-success' },
        { label: 'Health Profile', color: 'bg-[var(--dark-text-secondary)]' },
        { label: 'Attendance History', color: 'bg-agora-blue/70' },
    ];

    return (
        <div ref={containerRef} className="relative w-full max-w-4xl mx-auto h-[450px] md:h-[500px] flex justify-center py-10 px-4 overflow-hidden">
            {/* Main coordinate space for the visualization */}
            <div className="relative w-0 h-[400px] top-6">
                
                {/* Branching SVG Path Background */}
                <svg className="absolute top-0 left-[-150px] w-[300px] h-[400px] overflow-visible pointer-events-none">
                    {/* M 150 0 -> Center top. We shift X by 150 to center the 0 coordinate */}
                    {/* Background Path */}
                    <path d="M 150 0 L 150 120 L 270 120 L 270 280 L 150 280 L 150 400" fill="none" stroke="var(--dark-border)" strokeWidth="2" strokeLinejoin="round" />
                    {/* Glowing Active Path */}
                    <path ref={lineRef} d="M 150 0 L 150 120 L 270 120 L 270 280 L 150 280 L 150 400" fill="none" stroke="var(--agora-blue)" strokeWidth="2" strokeLinejoin="round" />
                </svg>

                {/* Static Origin Node */}
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-agora-blue shadow-[0_0_15px_rgba(36,144,253,1)] mb-3 md:mb-4" />
                    <span className="text-[8px] md:text-[10px] font-bold text-[var(--dark-text-primary)] uppercase tracking-wider whitespace-nowrap">Current School</span>
                    <span className="text-[8px] font-mono text-agora-blue mt-1">Initiating Transfer...</span>
                </div>

                {/* Validation Node (Branched Out to the Right) */}
                <div className="absolute top-[200px] left-[120px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="w-8 h-8 rounded-full bg-[var(--dark-surface)] border border-agora-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,83,42,0.2)]">
                        <svg className="w-3.5 h-3.5 text-agora-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.286a2 2 0 01.586-1.414l9.573-9.573A6 6 0 0121 9z" />
                        </svg>
                    </div>
                    <span className="absolute top-full mt-2 text-[8px] md:text-[10px] font-bold text-[var(--dark-text-primary)] uppercase tracking-wider whitespace-nowrap">Student Validation</span>
                    <span className="absolute top-full mt-6 text-[7px] font-mono text-[var(--dark-text-secondary)] bg-[var(--dark-surface)]/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-[var(--dark-border)] whitespace-nowrap">Private Key Required</span>
                </div>

                {/* Static Destination Node */}
                <div className="absolute top-[400px] left-0 -translate-x-1/2 flex flex-col items-center mt-2">
                    <span className="text-[8px] md:text-[10px] font-bold text-[var(--dark-text-primary)] uppercase tracking-wider whitespace-nowrap mb-1">Destination School</span>
                    <span className="text-[8px] font-mono text-agora-success mb-3">Awaiting Records</span>
                    <div className="relative">
                        <div ref={rippleRef} className="absolute inset-0 w-3 h-3 rounded-full border border-agora-success -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 opacity-0" />
                        <div ref={destGlowRef} className="w-3 h-3 rounded-full bg-[var(--dark-border)] transition-colors duration-300" />
                    </div>
                </div>

                {/* Flowing Packets */}
                <div ref={packetsRef} className="absolute inset-0 pointer-events-none">
                    {packetData.map((packet, i) => (
                        <div
                            key={i}
                            className="data-packet absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-4 opacity-0 z-20"
                        >
                            {/* The Packet Dot */}
                            <div className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${packet.color} shadow-[0_0_10px_currentColor]`} />

                            {/* Label */}
                            <div className="bg-[var(--dark-surface)]/80 backdrop-blur-md border border-[var(--dark-border)] px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                <span className="text-[7px] md:text-[9px] font-mono text-[var(--dark-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                                    {packet.label}
                                </span>
                            </div>

                            {/* Connection detail line */}
                            <div className="w-4 md:w-8 h-[1px] bg-[var(--dark-border)]" />
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .data-packet:nth-child(even) {
                    flex-direction: row-reverse;
                }
            `}</style>
        </div>
    );
};
