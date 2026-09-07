'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import {
    LegalContactCard,
    LegalH3,
    LegalList,
    LegalPageShell,
    LegalSection,
} from '@/components/legal/LegalPageShell';

const TOC = [
    { id: 'who', label: '1. Who we are' },
    { id: 'roles', label: '2. Controller and processor' },
    { id: 'data', label: '3. Data we process' },
    { id: 'sources', label: '4. How we collect it' },
    { id: 'purposes', label: '5. Why we use it' },
    { id: 'children', label: '6. Children' },
    { id: 'sensitive', label: '7. Health and photos' },
    { id: 'admissions', label: '8. Admissions' },
    { id: 'identity', label: '9. Identity, transfers, closure' },
    { id: 'ai', label: '10. Lois, Bud, and AI' },
    { id: 'cookies', label: '11. Cookies and telemetry' },
    { id: 'payments', label: '12. Payments' },
    { id: 'sharing', label: '13. Who we share with' },
    { id: 'transfers-intl', label: '14. International transfers' },
    { id: 'retention', label: '15. Retention' },
    { id: 'security', label: '16. Security' },
    { id: 'rights', label: '17. Your rights' },
    { id: 'automated', label: '18. Automated decisions' },
    { id: 'breach', label: '19. Breaches' },
    { id: 'changes', label: '20. Changes' },
    { id: 'contact', label: '21. Contact' },
];

export default function PrivacyPolicy() {
    return (
        <LegalPageShell
            title="Privacy Policy"
            icon={Lock}
            lastUpdated="5 September 2026"
            intro="This Privacy Policy explains how Myschoolbud processes personal data for schools, staff, parents, and students — including children’s records, health notes, admissions, transfers, billing, and Lois. It should be read with our Terms of Service."
            toc={TOC}
            otherLegalHref="/terms"
            otherLegalLabel="Terms of Service"
        >
            <LegalSection id="who" title="1. Who we are">
                <p>
                    Myschoolbud (<strong>we</strong>, <strong>us</strong>, <strong>our</strong>) operates a school
                    management and academic identity platform from Lagos, Nigeria, including myschoolbud.com, school
                    subdomains, and verified custom domains. We process personal data in line with the Nigeria Data
                    Protection Act 2023 (<strong>NDPA</strong>), the Nigeria Data Protection Commission (
                    <strong>NDPC</strong>) rules, and other laws that apply to a given school.
                </p>
                <p>
                    For registered company details or a written data-processing agreement, email{' '}
                    <a href="mailto:privacy@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        privacy@myschoolbud.com
                    </a>
                    .
                </p>
            </LegalSection>

            <LegalSection id="roles" title="2. When we are a processor and when we are a controller">
                <LegalH3>2.1 The school as controller</LegalH3>
                <p>
                    For day-to-day school records — enrolments, classes, attendance, assessments, fees the school
                    records, staff files, and most parent/student communications — the <strong>Institution is the
                    data controller</strong>. It decides what to collect and why. Myschoolbud is the{' '}
                    <strong>processor</strong>: we host and process that data on the school&apos;s instructions and
                    through the product features it enables.
                </p>
                <LegalH3>2.2 Myschoolbud as controller</LegalH3>
                <p>We are an independent controller for:</p>
                <LegalList>
                    <li>Accounts, authentication, security logs, and abuse prevention.</li>
                    <li>Our subscription, Paystack customer references, and AI-credit billing.</li>
                    <li>Platform telemetry (errors, performance, and sampled session replay in production).</li>
                    <li>
                        The cross-school Academic Identity and transfer registry (so a student can move between live
                        tenants without a paper transcript).
                    </li>
                    <li>Enquiries sent directly to us (support, privacy, or legal).</li>
                </LegalList>
                <p>
                    Super Admins are Company staff. They may access a tenant to verify a school, operate a close, or
                    fix a platform issue — not to run the school&apos;s classroom.
                </p>
            </LegalSection>

            <LegalSection id="data" title="3. Personal data we process">
                <p>Depending on role and school settings, we may process:</p>
                <LegalH3>3.1 Identity and contact</LegalH3>
                <LegalList>
                    <li>Names, date of birth, gender, nationality, state, address, and profile photos.</li>
                    <li>Email, phone number, and public student identifiers (for example an AG- style ID).</li>
                    <li>Guardian name, phone, email, and relationship, including who is the primary guardian.</li>
                </LegalList>
                <LegalH3>3.2 Academic and school operations</LegalH3>
                <LegalList>
                    <li>Enrolments, class and arm, term, session, course registrations, and transfer history.</li>
                    <li>Grades, assessments, submissions, attendance, timetables, and curriculum documents.</li>
                    <li>Staff roles, permissions, and teaching assignments.</li>
                    <li>Admission applications and supporting documents the school asks for.</li>
                    <li>Files a student or staff member uploads (personal resources, logos, schemes of work).</li>
                </LegalList>
                <LegalH3>3.3 Health and emergency (special category)</LegalH3>
                <LegalList>
                    <li>
                        Optional fields such as blood group, allergies, medications, emergency contacts, and medical
                        notes, when a school stores them on a student or an admission form.
                    </li>
                </LegalList>
                <LegalH3>3.4 Finance (school books and our billing)</LegalH3>
                <LegalList>
                    <li>Fee assignments and debt balances the school records against an enrolment.</li>
                    <li>Whether an enrolment is billing-locked after a plan downgrade or non-payment.</li>
                    <li>Paystack customer, plan, and subscription references for the school&apos;s Myschoolbud plan.</li>
                </LegalList>
                <LegalH3>3.5 Account and technical data</LegalH3>
                <LegalList>
                    <li>Password hashes, one-time codes, session IDs, and HTTP-only refresh-token cookies.</li>
                    <li>IP address, user agent, device identifier, and last login time.</li>
                    <li>In-app notifications and optional web-push subscription endpoints.</li>
                    <li>AI usage logs (who ran which tool, credit cost) and chat conversations with Lois.</li>
                    <li>Application error reports and, in production, RUM events and sampled session replay.</li>
                    <li>Optional Google Calendar connection tokens if a school enables calendar sync.</li>
                </LegalList>
            </LegalSection>

            <LegalSection id="sources" title="4. How we collect data">
                <LegalList>
                    <li>Directly from schools when they register, import, or type records.</li>
                    <li>From parents and students when they claim an account, update a profile, or apply for admission.</li>
                    <li>Automatically from the browser or app (cookies, device and security logs, telemetry).</li>
                    <li>From Paystack when a payment succeeds or fails.</li>
                    <li>From another school on the Platform when a transfer is completed.</li>
                    <li>From you when you email support or privacy.</li>
                </LegalList>
                <p>
                    We do not buy student lists from data brokers. Shadow parent records exist because a school entered
                    a guardian so the family can later claim a login.
                </p>
            </LegalSection>

            <LegalSection id="purposes" title="5. Why we use data and our lawful bases">
                <p>
                    Under the NDPA we rely on the bases below. More than one basis may apply to the same processing.
                </p>
                <LegalList>
                    <li>
                        <strong>Contract</strong> — to provide the Platform the Institution subscribed for: accounts,
                        portals, records, transfers, and billed AI features.
                    </li>
                    <li>
                        <strong>Consent</strong> — where a school or parent enables optional items such as a profile
                        photo, web push, Google Calendar, or non-essential telemetry cookies, and for health data as
                        described in section 7.
                    </li>
                    <li>
                        <strong>Legitimate interests</strong> — to keep tenants isolated, prevent fraud, bill
                        accurately, improve reliability, and operate the cross-school identity registry. We do not use
                        this basis to override a child&apos;s essential interests.
                    </li>
                    <li>
                        <strong>Legal obligation</strong> — to keep records we must keep, respond to lawful requests,
                        and handle tax or payment-compliance duties.
                    </li>
                    <li>
                        <strong>Vital interests</strong> — rarely, if emergency contact or health information is needed
                        to protect someone&apos;s life or safety.
                    </li>
                </LegalList>
                <p>
                    Schools that are controllers must have their own basis for instructing us (usually the education
                    relationship with the family, plus consent where they collect extra health or photo data).
                </p>
            </LegalSection>

            <LegalSection id="children" title="6. Children&apos;s data">
                <p>
                    Most student records on Myschoolbud are children&apos;s data. We treat anyone under 18 as a child.
                    We do not offer the Platform as a social network for children to sign up on their own.
                </p>
                <LegalList>
                    <li>
                        A school may create a student profile only as part of an education relationship it is entitled
                        to run. The school warrants it has parental or guardian authority, or another lawful basis.
                    </li>
                    <li>
                        A parent who claims an account via one-time code can see the children linked to them, subject
                        to school settings.
                    </li>
                    <li>
                        A student login is for schoolwork and viewing their own record, not for us to market unrelated
                        products to the child.
                    </li>
                    <li>
                        We do not use children&apos;s data to sell advertising, and we do not sell personal data.
                    </li>
                    <li>
                        Photo and health fields are optional at the school&apos;s configuration. Schools should not
                        collect them without a need and appropriate consent.
                    </li>
                </LegalList>
                <p>
                    Requests about a child&apos;s record should usually go to the school first. We will help where we
                    are the controller (account, transfer registry) or where the school has authorised us to assist.
                </p>
            </LegalSection>

            <LegalSection id="sensitive" title="7. Health information and photographs">
                <p>
                    Health notes and similar fields are <strong>sensitive personal data</strong> under the NDPA. We
                    process them only when a school (or an applicant on an admission form) provides them, to support
                    the school&apos;s duty of care. We do not use health data to train public AI models or for
                    marketing.
                </p>
                <p>
                    Profile photos are stored with our file host. The student record includes a photo-consent flag.
                    Schools must not upload a child&apos;s photo unless a parent or guardian has agreed, or another
                    lawful school policy applies. You can ask the school to remove a photo; we will action a valid
                    request they send us, or a request we can verify as coming from the parent or adult student.
                </p>
            </LegalSection>

            <LegalSection id="admissions" title="8. Public admission forms">
                <p>
                    If a school publishes an admission link, the applicant (or parent) submits child and guardian
                    details to that school through us. Until the school accepts the applicant as a student, that
                    school is the controller of the application. We store it so the school can review, accept, or
                    decline it.
                </p>
                <p>
                    A declined or withdrawn application is not automatically published to other schools. We may retain
                    it for a limited period so the school can handle queries or disputes, then delete or anonymise it
                    when the school asks or when the retention period in section 15 ends.
                </p>
            </LegalSection>

            <LegalSection id="identity" title="9. Academic Identity, transfers, and school closure">
                <p>
                    Academic Identity is the portable profile built from verified enrolments and results. The student
                    (or parent, for a minor) may request a digital copy at any time. Provenance is logged so a later
                    school can see which Institution issued a record. Logging provenance does not prevent a correction
                    when a record is wrong.
                </p>
                <p>
                    <strong>Ordinary transfers</strong> use a Transfer Access Code. The destination school sees the
                    student data the product exposes for review (including identity and academic history; date of birth
                    is included so the receiving school can match the pupil). Ordinary codes expire; they are consumed
                    only when a transfer is completed and the student has an active enrolment at the new school.
                </p>
                <p>
                    <strong>School closure</strong> is a deactivation, not a wipe. After a 7-day cancellable notice,
                    teachers keep read-only access. Students can use a non-expiring closure transfer code. Academic
                    records stay available so learners are not stranded. The owner, a principal, or a Super Admin may
                    reactivate the school; students who already moved stay at the new school.
                </p>
            </LegalSection>

            <LegalSection id="ai" title="10. Lois, Bud, and AI processing">
                <p>
                    Lois may send prompts, lesson context, essays, or school-knowledge snippets to a large-language
                    model provider (currently OpenAI and/or Azure OpenAI, depending on our configuration) so we can
                    return a completion. We also store usage logs and chat history so the school can manage credits
                    and continue a conversation.
                </p>
                <p>
                    Bud is an optional student-paid study companion. A student (or a parent using a guardian email at
                    checkout) can subscribe separately from the school&apos;s Myschoolbud plan. Bud stores a companion
                    name, review decks, card ratings, and short chat turns against that student&apos;s own scheme
                    topics. School billing lock or downgrade does not cancel Bud. Children&apos;s use is under the
                    school/parent relationship described in section 6; Bud does not write formal assessments.
                </p>
                <LegalList>
                    <li>
                        We do not use one school&apos;s identifiable pupil work to improve another school&apos;s tenant.
                    </li>
                    <li>
                        We configure providers so they are not permitted to use API content to train their general
                        public models, to the extent their enterprise/API terms allow that control.
                    </li>
                    <li>
                        Staff must not paste unnecessary health or extra-sensitive data into Lois. Schools remain
                        responsible for what their users submit.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection id="cookies" title="11. Cookies, sessions, and telemetry">
                <LegalH3>11.1 Essential cookies</LegalH3>
                <p>
                    We use an HTTP-only cookie to hold a refresh token after login. That cookie is necessary to keep
                    you signed in and is not used for advertising. Login and OTP flows also create short-lived server
                    records (codes, session IDs, IP, user agent).
                </p>
                <LegalH3>11.2 Analytics and session replay (production)</LegalH3>
                <p>
                    In production we use OpenObserve for real-user monitoring and error logs. We may record page
                    performance, user interactions, and — for a sample of sessions (currently about half) — a session
                    replay. Typed input is masked. When you are signed in we may attach a user id, name, email, role,
                    and school id to those events so we can debug a problem.
                </p>
                <p>
                    These tools help us keep the Platform stable. They are not used to advertise to students. If you
                    want replay disabled for your organisation, the school owner can email{' '}
                    <a href="mailto:privacy@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        privacy@myschoolbud.com
                    </a>
                    . We will add finer in-product controls as the product matures.
                </p>
                <LegalH3>11.3 Optional notifications</LegalH3>
                <p>
                    If you enable web push, the browser gives us an endpoint we use only to deliver notifications you
                    or the school requested. You can revoke that in the browser.
                </p>
            </LegalSection>

            <LegalSection id="payments" title="12. Payments">
                <p>
                    School subscriptions are paid through Paystack. Paystack processes card or other payment-method
                    data as its own controller/processor under its policy. We receive payment status, references, and
                    customer/subscription codes so we can activate, renew, or grace a plan. We do not store full card
                    PAN or CVV.
                </p>
                <p>
                    Parent tuition paid to a school is not processed by Myschoolbud unless we later launch a fees
                    product and update this Policy.
                </p>
            </LegalSection>

            <LegalSection id="sharing" title="13. Who we share data with">
                <p>We share personal data only as needed to run the Platform:</p>
                <LegalList>
                    <li>
                        <strong>The Institution and its authorised users</strong> — staff, linked parents, and the
                        student, according to role.
                    </li>
                    <li>
                        <strong>Another Institution</strong> — when a transfer is initiated or completed, or when a
                        student already has a live enrolment there.
                    </li>
                    <li>
                        <strong>Paystack</strong> — billing for Myschoolbud plans.
                    </li>
                    <li>
                        <strong>OpenAI / Azure OpenAI</strong> — Lois prompts and completions.
                    </li>
                    <li>
                        <strong>Cloudinary</strong> — images and uploaded files.
                    </li>
                    <li>
                        <strong>Email providers</strong> (for example Resend or Google Workspace) — OTPs, invites, and
                        operational mail.
                    </li>
                    <li>
                        <strong>OpenObserve</strong> — errors, performance, and sampled session replay.
                    </li>
                    <li>
                        <strong>Hosting and database providers</strong> — to store and run the service.
                    </li>
                    <li>
                        <strong>Google</strong> — only if a school connects Google Calendar.
                    </li>
                    <li>
                        <strong>Authorities</strong> — if the law requires it, or to protect children or the security
                        of the registry.
                    </li>
                </LegalList>
                <p>We do not sell personal data or share it with advertisers.</p>
            </LegalSection>

            <LegalSection id="transfers-intl" title="14. International transfers">
                <p>
                    Some processors are outside Nigeria (for example model providers, file hosting, or observability).
                    When we transfer personal data abroad we use NDPA-appropriate safeguards: contracts with those
                    processors, access controls, and encryption in transit. By using the Platform, the Institution
                    instructs us to make those transfers where a feature it enables requires them (especially Lois,
                    file uploads, and email).
                </p>
            </LegalSection>

            <LegalSection id="retention" title="15. How long we keep data">
                <LegalList>
                    <li>
                        <strong>School academic records and Academic Identity</strong> — retained after a school close
                        so students can transfer and later schools can verify history. We do not hard-delete a school
                        tenant as a routine close. Erasure is handled as in section 17.
                    </li>
                    <li>
                        <strong>Admission applications</strong> — while the school is reviewing them, then for a
                        limited period after a decision (typically up to 24 months unless the school asks us to delete
                        sooner or must keep them longer).
                    </li>
                    <li>
                        <strong>Accounts and login sessions</strong> — for the life of the account; OTPs and unused
                        login sessions expire within hours or days; refresh cookies last for the session lifetime we
                        configure.
                    </li>
                    <li>
                        <strong>AI chats and usage logs</strong> — while the school needs them for continuity and
                        billing, then in backups for a limited period.
                    </li>
                    <li>
                        <strong>Payment records</strong> — as long as needed for accounting, chargebacks, and law
                        (often several years).
                    </li>
                    <li>
                        <strong>Telemetry and error logs</strong> — typically weeks to a few months, unless needed to
                        investigate an incident.
                    </li>
                    <li>
                        <strong>Backups</strong> — rolling backups may hold a deleted item until the backup cycle
                        expires.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection id="security" title="16. Security">
                <p>
                    Each school sits in a logical tenant. Access is role-based. We encrypt data in transit (TLS 1.3)
                    and at rest (including AES-256 where our infrastructure provides it). Passwords are hashed.
                    Refresh tokens are HTTP-only. We log security-relevant actions. No method is perfect; you must
                    still protect devices and credentials.
                </p>
                <p>
                    &quot;Zero-trust&quot; and &quot;immutable provenance&quot; describe our design goals: we isolate
                    tenants and record who issued a record. They are not a guarantee against every breach or every
                    human error at a school.
                </p>
            </LegalSection>

            <LegalSection id="rights" title="17. Your rights under the NDPA">
                <p>Subject to the NDPA and any school-controller duties, you may:</p>
                <LegalList>
                    <li>
                        <strong>Access</strong> — request a copy of personal data we hold, including a digital copy of
                        a verified Academic Identity.
                    </li>
                    <li>
                        <strong>Rectify</strong> — correct inaccurate data. Academic corrections that change an official
                        result must usually be done by the issuing school.
                    </li>
                    <li>
                        <strong>Erase</strong> — ask us to delete data we no longer need. We may refuse or limit this
                        where we must keep a record for the identity registry, a legal claim, security, or a school
                        close archive — we will explain why.
                    </li>
                    <li>
                        <strong>Restrict or object</strong> — in the cases the NDPA allows.
                    </li>
                    <li>
                        <strong>Withdraw consent</strong> — where processing is based on consent (for example a photo),
                        without affecting earlier lawful processing.
                    </li>
                    <li>
                        <strong>Portability</strong> — receive data you provided, in a reasonable machine-readable form
                        where technically feasible.
                    </li>
                    <li>
                        <strong>Complain</strong> — to us first, and to the Nigeria Data Protection Commission if you
                        are not satisfied.
                    </li>
                </LegalList>
                <p>
                    Send requests to{' '}
                    <a href="mailto:privacy@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        privacy@myschoolbud.com
                    </a>
                    . We may need to verify who you are (and, for a child, who the parent or school is). We aim to
                    respond within 30 days, or to say if we need more time as the NDPA allows.
                </p>
                <p>
                    If we are only the processor, we will forward the request to the school and support their response,
                    unless the request is clearly about our own controller activities.
                </p>
            </LegalSection>

            <LegalSection id="automated" title="18. Automated processing and AI grades">
                <p>
                    Lois can suggest grades, comments, lesson plans, and insights. Those outputs can affect a student
                    if a school adopts them. We do not treat an AI suggestion as a final official grade. The
                    Institution must have a human review the result before it becomes part of the student&apos;s
                    official record. You can challenge an official grade through the school; the school can correct
                    the record on the Platform.
                </p>
                <p>
                    Billing locks and plan limits are automated account rules, not profiling of a child&apos;s ability.
                </p>
            </LegalSection>

            <LegalSection id="breach" title="19. Personal data breaches">
                <p>
                    If we become aware of a breach that is likely to risk people&apos;s rights, we will investigate,
                    contain it, and notify the NDPC and affected controllers (schools) as the NDPA requires. Schools
                    are responsible for notifying families when they are the controller, unless we agree to send that
                    notice for them. Individuals who think their data was exposed should email{' '}
                    <a href="mailto:privacy@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        privacy@myschoolbud.com
                    </a>
                    .
                </p>
            </LegalSection>

            <LegalSection id="changes" title="20. Changes to this Policy">
                <p>
                    We will update this Policy when the product or the law changes (for example if RollCall biometric
                    attendance or parent fee collection launches). The date at the top will change. For material
                    changes we will give reasonable notice to school owners. Continued use after the effective date is
                    acceptance of the updated Policy.
                </p>
            </LegalSection>

            <LegalSection id="contact" title="21. Contact and complaints">
                <p>
                    Privacy and data-protection requests, including access to an Academic Identity:
                </p>
                <LegalContactCard
                    title="Data Protection Office"
                    lines={[
                        <>
                            Email:{' '}
                            <a href="mailto:privacy@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                                privacy@myschoolbud.com
                            </a>
                        </>,
                        'Lagos, Nigeria',
                        <>
                            Operations:{' '}
                            <a href="mailto:systems@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                                systems@myschoolbud.com
                            </a>
                        </>,
                        <>
                            Terms:{' '}
                            <Link href="/terms" className="text-[var(--agora-blue)] hover:underline">
                                Terms of Service
                            </Link>
                        </>,
                    ]}
                />
                <p>
                    You may also lodge a complaint with the{' '}
                    <a
                        href="https://ndpc.gov.ng"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--agora-blue)] hover:underline"
                    >
                        Nigeria Data Protection Commission
                    </a>
                    .
                </p>
            </LegalSection>
        </LegalPageShell>
    );
}
