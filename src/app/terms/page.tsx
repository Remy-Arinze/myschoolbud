'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import {
    LegalContactCard,
    LegalH3,
    LegalList,
    LegalPageShell,
    LegalSection,
} from '@/components/legal/LegalPageShell';

const TOC = [
    { id: 'agreement', label: '1. Agreement' },
    { id: 'parties', label: '2. Who these Terms cover' },
    { id: 'service', label: '3. The Platform' },
    { id: 'accounts', label: '4. Accounts' },
    { id: 'identity', label: '5. Academic Identity' },
    { id: 'roles', label: '6. Roles and duties' },
    { id: 'children', label: '7. Children' },
    { id: 'admissions', label: '8. Admissions' },
    { id: 'transfers', label: '9. Transfers and closure' },
    { id: 'ai', label: '10. Lois and AI' },
    { id: 'billing', label: '11. Billing' },
    { id: 'portals', label: '12. Portals and domains' },
    { id: 'acceptable-use', label: '13. Acceptable use' },
    { id: 'ip', label: '14. Intellectual property' },
    { id: 'third-parties', label: '15. Third parties' },
    { id: 'suspension', label: '16. Suspension' },
    { id: 'disclaimers', label: '17. Disclaimers' },
    { id: 'liability', label: '18. Liability' },
    { id: 'indemnity', label: '19. Indemnity' },
    { id: 'changes', label: '20. Changes' },
    { id: 'law', label: '21. Governing law' },
    { id: 'contact', label: '22. Contact' },
];

export default function TermsOfService() {
    return (
        <LegalPageShell
            title="Terms of Service"
            icon={Shield}
            lastUpdated="5 September 2026"
            intro="These Terms of Service govern access to Myschoolbud, including school portals, parent and student accounts, admissions, transfers, billing, and Lois (our AI tools). Please read them with our Privacy Policy."
            toc={TOC}
            otherLegalHref="/privacy"
            otherLegalLabel="Privacy Policy"
        >
            <LegalSection id="agreement" title="1. Agreement to these Terms">
                <p>
                    These Terms of Service (the <strong>Terms</strong>) are a contract between you and Myschoolbud,
                    operating from Lagos, Nigeria (the <strong>Company</strong>, <strong>we</strong>, <strong>us</strong>,
                    or <strong>our</strong>). By creating an account, inviting users, submitting an admission form,
                    clicking to accept, or otherwise using myschoolbud.com, a school subdomain, or a connected custom
                    domain (together, the <strong>Platform</strong>), you agree to these Terms.
                </p>
                <p>
                    If you do not agree, do not use the Platform. If you are accepting on behalf of a school or other
                    organisation, you confirm that you have authority to bind that organisation.
                </p>
                <p>
                    For registered company name, registration number, or a written data-processing addendum, email{' '}
                    <a href="mailto:systems@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        systems@myschoolbud.com
                    </a>
                    .
                </p>
            </LegalSection>

            <LegalSection id="parties" title="2. Who these Terms cover">
                <p>The Platform is used by different people with different rights. In these Terms:</p>
                <LegalList>
                    <li>
                        <strong>Institution</strong> means a school or other education provider that holds a tenant on
                        the Platform (primary, secondary, or tertiary).
                    </li>
                    <li>
                        <strong>Staff</strong> means school owners, principals, school admins, teachers, and other
                        users the Institution invites.
                    </li>
                    <li>
                        <strong>Parent</strong> means a parent, guardian, or other adult linked to a student.
                    </li>
                    <li>
                        <strong>Student</strong> means a learner enrolled or applying at an Institution.
                    </li>
                    <li>
                        <strong>Super Admin</strong> means Company personnel who operate the registry (for example
                        verifying new schools or handling a school close).
                    </li>
                </LegalList>
                <p>
                    An Institution&apos;s subscription is the primary commercial contract. Staff, parents, and students
                    receive a licence to use the features their role allows. A child under 18 cannot form this contract
                    on their own; a parent or the Institution (acting for the child in the education relationship) must
                    accept these Terms on the child&apos;s behalf.
                </p>
            </LegalSection>

            <LegalSection id="service" title="3. Description of the Platform">
                <p>
                    Myschoolbud is a multi-tenant school management and academic identity system. Depending on the
                    Institution&apos;s plan and settings, the Platform may include:
                </p>
                <LegalList>
                    <li>School setup, branding, and a portal at a Myschoolbud subdomain or verified custom domain.</li>
                    <li>Staff, class, timetable, attendance, assessment, curriculum, and scheme-of-work tools.</li>
                    <li>Student records, guardians, health notes the school chooses to store, photos, and files.</li>
                    <li>Public or shared admission applications.</li>
                    <li>Fee balances and billing locks tied to the Institution&apos;s subscription.</li>
                    <li>Cross-school transfers using a Transfer Access Code (TAC).</li>
                    <li>Parent and student portals, in-app notifications, email, and optional web push.</li>
                    <li>Optional Google Calendar sync where a school enables it.</li>
                    <li>Lois, our AI assistant, for lesson support, grading assistance, chat, and insights.</li>
                    <li>A school-close flow that deactivates a tenant but keeps academic records.</li>
                </LegalList>
                <p>
                    Some products described on our marketing site (for example RollCall biometric attendance or Bursary
                    Pro) may be planned or in preview. Those features are not part of these Terms until we make them
                    generally available and, if they collect new categories of data, update the Privacy Policy.
                </p>
                <p>
                    We may change, add, or remove features. We will not use a routine update as a way to take away a
                    student&apos;s ability to request a copy of their verified academic record.
                </p>
            </LegalSection>

            <LegalSection id="accounts" title="4. Accounts, authentication, and security">
                <LegalH3>4.1 Creating and claiming accounts</LegalH3>
                <p>
                    Schools register and are reviewed before they become a live tenant. Staff and students are usually
                    created by the Institution. Parents may start as a shadow record (name and phone or email only) and
                    later claim a login with a one-time code we send them.
                </p>
                <LegalH3>4.2 Sign-in</LegalH3>
                <p>
                    We use passwords and/or email or phone one-time codes. A refresh token is stored in an HTTP-only
                    cookie so you can stay signed in. We may record device identifiers, IP address, and browser
                    information to protect accounts.
                </p>
                <LegalH3>4.3 Your responsibilities</LegalH3>
                <LegalList>
                    <li>Keep credentials confidential and use a unique password where one is set.</li>
                    <li>Tell the Institution or us promptly if you think an account is compromised.</li>
                    <li>Use only the roles and school context you are authorised to use.</li>
                    <li>Do not share a staff login with students or the public.</li>
                </LegalList>
                <p>
                    The Institution is responsible for who it invites, which permissions it grants, and for disabling
                    access when someone leaves.
                </p>
            </LegalSection>

            <LegalSection id="identity" title="5. Academic Identity and the Chain-of-Trust">
                <p>
                    The Platform is built so a student can carry a portable academic profile (the{' '}
                    <strong>Academic Identity</strong>) between Institutions in the Myschoolbud network. Schools enter
                    and verify enrolments, grades, attendance, and related records. We log provenance so a later school
                    can see that a record was issued by a named Institution.
                </p>
                <p>
                    <strong>Ownership in practice.</strong> The student (or their parent, while the student is a minor)
                    has a personal interest in that profile: they may request a copy, and they may move it to another
                    live school through a transfer. That does not mean the record is beyond correction, or that the
                    Institution loses its duty to keep lawful education records. If a grade or enrolment is wrong, the
                    Institution that issued it must correct it. Cryptographic or audit logging of provenance is not a
                    promise that a mistake can never be fixed.
                </p>
                <p>
                    Academic Identity is not a government ID, visa, or professional licence. Other schools, employers,
                    or authorities decide whether to rely on it.
                </p>
            </LegalSection>

            <LegalSection id="roles" title="6. Roles, accuracy, and professional judgement">
                <LegalH3>6.1 Institutions</LegalH3>
                <p>Each Institution is responsible for:</p>
                <LegalList>
                    <li>The lawfulness of collecting and uploading pupil, parent, and staff data.</li>
                    <li>Accuracy of names, dates of birth, enrolments, grades, attendance, and fees it enters.</li>
                    <li>Obtaining parental or guardian authority for minors, including photo and health data.</li>
                    <li>Final decisions on admissions, promotion, discipline, and published results.</li>
                    <li>Informing families how the school uses Myschoolbud, in line with its own policies.</li>
                </LegalList>
                <LegalH3>6.2 Staff</LegalH3>
                <p>
                    Teachers and admins must use Lois and grading tools to support, not replace, professional
                    judgement. The Institution is responsible for checking AI-assisted grades and lesson materials
                    before they are treated as official.
                </p>
                <LegalH3>6.3 Parents and students</LegalH3>
                <p>
                    Parents and students must provide true information when they apply, update a profile, or complete a
                    transfer. Students must not impersonate others or attempt to alter official records except through
                    the school&apos;s correction process.
                </p>
                <LegalH3>6.4 Fraud and fake records</LegalH3>
                <p>
                    Uploading forged certificates, inventing enrolments, bypassing verification, or otherwise
                    misrepresenting academic history is a material breach. We may suspend the user, the Institution, or
                    both, and we may flag affected records so later schools are not misled.
                </p>
            </LegalSection>

            <LegalSection id="children" title="7. Children and parental authority">
                <p>
                    A large part of the Platform is used by and about children (anyone under 18). A child may receive a
                    student login only because an Institution or parent has set that up. The parent or Institution
                    accepts these Terms for the child and is responsible for the child&apos;s use.
                </p>
                <p>
                    Parents can be linked to one or more students. Visibility of grades, attendance, fees, and
                    messages follows the Institution&apos;s settings and the guardian relationship stored on the
                    Platform. When a student turns 18, the Institution should treat them as an adult data subject; we
                    will follow a reasonable written request from the Institution or the student to adjust access.
                </p>
            </LegalSection>

            <LegalSection id="admissions" title="8. Admissions">
                <p>
                    An Institution may publish an admission form (including on a school portal). Submitting that form
                    sends the application to that Institution through Myschoolbud. The applicant (or their parent)
                    agrees that:
                </p>
                <LegalList>
                    <li>The information is true and complete to the best of their knowledge.</li>
                    <li>The Institution may review, accept, or decline the application.</li>
                    <li>Myschoolbud processes the submission as described in the Privacy Policy.</li>
                    <li>The Institution&apos;s own admission rules still apply.</li>
                </LegalList>
                <p>
                    Submitting a form does not create a place at the school or a paid subscription. Health and
                    emergency fields are collected only when the Institution enables them.
                </p>
            </LegalSection>

            <LegalSection id="transfers" title="9. Transfers and school close, retain, and transfer">
                <LegalH3>9.1 Ordinary transfers</LegalH3>
                <p>
                    A student may move to another Institution on the Platform using a Transfer Access Code. Ordinary
                    TACs expire (typically 30 days after they are created) and are single-use once a transfer is
                    completed and the student has an active enrolment at the destination school. Starting, rejecting,
                    or abandoning a transfer does not consume the code.
                </p>
                <p>
                    The destination school can review the academic data the source school has made available for the
                    transfer. Completing a transfer does not automatically delete the historical record at the source
                    school.
                </p>
                <LegalH3>9.2 School close</LegalH3>
                <p>
                    Schools are not hard-deleted. A school owner or a Super Admin may schedule a close and must give a
                    written reason. The school stays fully usable for 7 days and the close can be cancelled in that
                    period. After deactivation:
                </p>
                <LegalList>
                    <li>Academic and student records are retained.</li>
                    <li>Teachers have read-only access and cannot reactivate the school.</li>
                    <li>
                        Students are told the current school is suspended. They may switch to another live enrolment if
                        they have one, or transfer out using a closure transfer code that does not expire.
                    </li>
                    <li>
                        A closure transfer code is used only when the transfer is completed and the student has a new
                        active enrolment elsewhere.
                    </li>
                    <li>The school owner, a principal, or a Super Admin may reactivate the school.</li>
                    <li>Students who already transferred stay at their new school after a reactivation.</li>
                </LegalList>
            </LegalSection>

            <LegalSection id="ai" title="10. Lois and other AI tools">
                <p>
                    Lois is Myschoolbud&apos;s education assistant. Paid plans may include AI credits (sometimes
                    described as tokens). Credits are consumed by the complexity of the task (for example grading an
                    essay versus generating a short quiz). Unused credits expire at the end of the billing cycle unless
                    the plan says otherwise.
                </p>
                <p>You agree that:</p>
                <LegalList>
                    <li>AI output can be incomplete, biased, or wrong. It is not a substitute for a teacher or examiner.</li>
                    <li>Official grades, report comments, and curriculum documents need human review before they are issued.</li>
                    <li>You will not use Lois to generate or disguise academic dishonesty, or to impersonate a person.</li>
                    <li>
                        Prompts and submissions may be sent to our model providers so the feature can run. See the
                        Privacy Policy.
                    </li>
                </LegalList>
                <p>
                    We do not guarantee any particular model, latency, or that a given tool will remain available on
                    every plan.
                </p>
            </LegalSection>

            <LegalSection id="billing" title="11. Subscription, billing, and plan limits">
                <LegalH3>11.1 Plans</LegalH3>
                <p>
                    Access is tiered (including a free tier and paid plans). Current limits — for example student,
                    teacher, and admin caps, and AI credits — are shown in the product and on the Pricing page. Those
                    published limits form part of these Terms for the period they are displayed at checkout.
                </p>
                <LegalH3>11.2 Payment</LegalH3>
                <p>
                    Paid subscriptions are charged through Paystack. The Institution authorises recurring charges where
                    it selects a monthly or yearly plan. Amounts are typically in Nigerian Naira, plus any taxes or
                    processor fees shown at checkout. Paystack is the payment processor; we do not store full card
                    numbers.
                </p>
                <LegalH3>11.3 Grace period and non-payment</LegalH3>
                <p>
                    After a paid period ends, the Institution may have a grace period (currently 14 days) to renew.
                    During or after that period we may restrict admin write actions, require a renewal or downgrade, or
                    apply a billing lock to enrolments that exceed the new plan. A billing lock is not a deletion of the
                    student&apos;s Academic Identity.
                </p>
                <LegalH3>11.4 Downgrades, cancellations, and refunds</LegalH3>
                <p>
                    An Institution may downgrade to the free tier where the product allows it. Downgrading may disable
                    paid tools (including Lois) and lock excess students until the count fits the plan or the school
                    upgrades again. Unused AI credits are not a cash balance. Except where Nigerian consumer or payment
                    law requires otherwise, subscription fees and consumed credits are non-refundable. If Paystack
                    deducted funds but the upgrade failed, contact{' '}
                    <a href="mailto:support@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                        support@myschoolbud.com
                    </a>{' '}
                    with the payment reference.
                </p>
                <LegalH3>11.5 School fees versus our subscription</LegalH3>
                <p>
                    Tuition and other school fees charged to parents are the Institution&apos;s matter. Debt balances
                    stored on the Platform are school bookkeeping, not charges payable to Myschoolbud.
                </p>
            </LegalSection>

            <LegalSection id="portals" title="12. School portals, branding, and custom domains">
                <p>
                    Each Institution may receive a portal (for example a subdomain of myschoolbud.com) and may request a
                    custom domain after DNS verification. The Institution is responsible for the content, logo, and
                    statements it publishes there. Reserved paths and names may be withheld. We may suspend a custom
                    domain that harms users or infringes someone else&apos;s rights.
                </p>
                <p>
                    Branding uploaded to the Platform (logos, favicons) must be material the Institution has the right
                    to use.
                </p>
            </LegalSection>

            <LegalSection id="acceptable-use" title="13. Acceptable use">
                <p>You must not:</p>
                <LegalList>
                    <li>Break the law, or upload unlawful, defamatory, or sexually exploitative content, including any sexual content involving a minor.</li>
                    <li>Probe, scan, or overload the Platform, or bypass authentication, tenancy, or payment controls.</li>
                    <li>Scrape, harvest, or bulk-export personal data except through features we provide to that Institution.</li>
                    <li>Use another person&apos;s account, or create accounts for people who have not authorised it (except a school creating records it is entitled to keep).</li>
                    <li>Interfere with another school&apos;s tenant or attempt to access it.</li>
                    <li>Reverse engineer the Platform except to the extent the law allows.</li>
                    <li>Use the Platform to send spam or to install malware.</li>
                    <li>Misrepresent an Institution&apos;s verification status or a student&apos;s record.</li>
                </LegalList>
            </LegalSection>

            <LegalSection id="ip" title="14. Intellectual property and licences">
                <p>
                    The Platform, including software, design, Lois, and the Myschoolbud name and marks, is owned by us
                    or our licensors. These Terms give you a limited, non-exclusive, non-transferable licence to use
                    the Platform for the Institution&apos;s education operations, for as long as the account remains in
                    good standing.
                </p>
                <p>
                    The Institution (or the student, for their own work) retains ownership of records, documents, and
                    files it uploads. You grant us a licence to host, display, transmit, back up, and — for transfers
                    and Academic Identity — share that content as the product requires. AI output is licensed to the
                    Institution for its internal education use; we do not claim copyright in the school&apos;s
                    underlying pupil work.
                </p>
                <p>
                    Feedback you send us may be used to improve the Platform without an obligation to you.
                </p>
            </LegalSection>

            <LegalSection id="third-parties" title="15. Third-party services">
                <p>
                    The Platform relies on processors such as Paystack, model providers for Lois, Cloudinary for files
                    and images, email delivery, observability, hosting, and optional Google Calendar. Their terms apply
                    to the service they provide. We are not responsible for a third-party outage beyond our reasonable
                    control, but we remain responsible for choosing processors with appropriate safeguards, as
                    described in the Privacy Policy.
                </p>
            </LegalSection>

            <LegalSection id="suspension" title="16. Suspension, closure, and surviving terms">
                <p>
                    We may suspend or limit access if you breach these Terms, if a payment fails after grace, if we
                    must do so to protect children or the security of the registry, or if the law requires it. We will
                    try to notify the Institution&apos;s owner except where that would create a legal or security risk.
                </p>
                <p>
                    An Institution may schedule a close under section 9. User accounts may be suspended or archived.
                    Sections that by nature should survive (including Academic Identity retention, IP, disclaimers,
                    liability, indemnity, and governing law) survive closure or termination.
                </p>
            </LegalSection>

            <LegalSection id="disclaimers" title="17. Disclaimers">
                <p>
                    The Platform is provided on an <strong>&quot;as is&quot;</strong> and{' '}
                    <strong>&quot;as available&quot;</strong> basis. We do not warrant that it will be uninterrupted,
                    error-free, or that it will meet a particular inspection, examination board, or immigration
                    requirement. We do not warrant that AI output is accurate. To the fullest extent allowed by
                    Nigerian law, we disclaim implied warranties of merchantability, fitness for a particular purpose,
                    and non-infringement.
                </p>
            </LegalSection>

            <LegalSection id="liability" title="18. Limitation of liability">
                <p>
                    Nothing in these Terms limits liability that cannot be limited under Nigerian law, including death
                    or personal injury caused by negligence, or fraud.
                </p>
                <p>
                    Subject to that, we are not liable for lost profits, lost data (except where we failed to use
                    reasonable care to protect it), exam or admission outcomes, reputational harm, or indirect or
                    consequential loss. Our total liability to an Institution arising out of the Platform in any
                    twelve-month period is limited to the subscription fees that Institution actually paid us in that
                    period (or NGN 50,000 if they are on a free plan).
                </p>
                <p>
                    We are not liable for decisions an Institution, parent, or third party makes based on records or
                    AI output on the Platform.
                </p>
            </LegalSection>

            <LegalSection id="indemnity" title="19. Indemnity">
                <p>
                    The Institution will defend and indemnify Myschoolbud against claims, losses, and reasonable legal
                    fees arising from: (a) data it uploads or instructs us to process; (b) its failure to obtain
                    required consent for children, photos, or health information; (c) its users&apos; breach of these
                    Terms; or (d) content on its portal or custom domain, except to the extent we caused the claim by
                    our own negligence or wilful misconduct.
                </p>
            </LegalSection>

            <LegalSection id="changes" title="20. Changes to these Terms">
                <p>
                    We may update these Terms. The date at the top will change. For material changes we will give
                    reasonable notice (for example in-product notice or email to the school owner). Continued use after
                    the effective date is acceptance. If you do not agree, the Institution should stop using the
                    Platform and may schedule a close.
                </p>
            </LegalSection>

            <LegalSection id="law" title="21. Governing law and disputes">
                <p>
                    These Terms are governed by the laws of the Federal Republic of Nigeria. Courts in Lagos, Nigeria
                    have exclusive jurisdiction, except that we may seek injunctive relief in any forum to protect
                    children, users, or the registry. Please contact us first so we can try to resolve a dispute
                    informally.
                </p>
            </LegalSection>

            <LegalSection id="contact" title="22. Contact">
                <p>
                    Questions about these Terms, institutional tenants, or the Chain-of-Trust:
                </p>
                <LegalContactCard
                    title="Myschoolbud Legal and Operations"
                    lines={[
                        <>
                            Email:{' '}
                            <a href="mailto:systems@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                                systems@myschoolbud.com
                            </a>
                        </>,
                        <>
                            Support:{' '}
                            <a href="mailto:support@myschoolbud.com" className="text-[var(--agora-blue)] hover:underline">
                                support@myschoolbud.com
                            </a>
                        </>,
                        'Lagos, Nigeria',
                        <>
                            Privacy requests: see the{' '}
                            <Link href="/privacy" className="text-[var(--agora-blue)] hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </>,
                    ]}
                />
            </LegalSection>
        </LegalPageShell>
    );
}
