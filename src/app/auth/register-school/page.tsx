'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { WordedLogo } from '@/components/layout/WordedLogo';
import { Alert } from '@/components/ui/Alert';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { CountrySelector } from '@/components/ui/CountrySelector';
import { useRegisterSchoolMutation } from '@/lib/store/api/publicApi';

export default function RegisterSchoolPage() {
    const [registerSchool, { isLoading }] = useRegisterSchoolMutation();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // react-international-phone always carries at least the dial code (e.g. "+234")
    // A valid phone needs at least 7 digits total (dial code + subscriber number)
    const isPhoneFilled = (val: string) => val.replace(/\D/g, '').length >= 7;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        hasPrimary: false,
        hasSecondary: false,
        hasTertiary: false,
        registrationNote: '',
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPhone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePhoneChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (!formData.hasPrimary && !formData.hasSecondary && !formData.hasTertiary) {
            setError('Please select at least one school type.');
            return;
        }

        try {
            const response = await registerSchool(formData).unwrap();
            if (response.success) {
                setSuccess(true);
            } else {
                setError(response.message || 'Registration failed. Please try again.');
            }
        } catch (err: any) {
            setError(
                err?.data?.message || err?.message || 'An error occurred during registration.'
            );
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md bg-[var(--light-card)] dark:bg-[var(--dark-surface)] p-8 rounded-xl border border-[var(--light-border)] dark:border-[var(--dark-border)] text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-2">Registration Submitted</h2>
                    <p className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-6">
                        Thank you for registering your school on Myschoolbud. Your application is currently under review by our administration team. You will be notified via email once your account has been verified.
                    </p>
                    <Link href="/auth/login" className="text-agora-blue hover:underline transition-colors">
                        Return to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-center mb-8">
                    <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                        <WordedLogo size="md" priority />
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-3 text-center">
                    Register Your School
                </h1>
                <p className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] text-center mb-8 text-sm">
                    Join Myschoolbud to streamline your school's management pipeline.
                </p>

                <form onSubmit={handleSubmit} className="bg-[var(--light-card)] dark:bg-[var(--dark-surface)] p-6 sm:p-8 rounded-xl border border-[var(--light-border)] dark:border-[var(--dark-border)] space-y-8">
                    {error && (
                        <Alert variant="error">{error}</Alert>
                    )}

                    {/* School Details */}
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 border-b border-[var(--light-border)] dark:border-[var(--dark-border)] pb-2">School Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>School Name *</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="Official School Name"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>School Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="contact@school.com"
                                />
                            </div>
                            <PhoneInput
                                label="School Phone"
                                required
                                value={formData.phone}
                                onChange={(val) => handlePhoneChange('phone', val)}
                                placeholder="8012345678"
                                labelClassName="text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]"
                            />
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>Address</label>
                                <input
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="123 School Road"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>City</label>
                                <input
                                    name="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="Lagos"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>State</label>
                                <input
                                    name="state"
                                    type="text"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="Lagos State"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>Country</label>
                                <CountrySelector
                                    value={formData.country}
                                    onChange={(val) => setFormData(prev => ({ ...prev, country: val }))}
                                    scope="west-africa"
                                    placeholder="Select country"
                                />
                            </div>
                        </div>
                    </div>

                    {/* School Type */}
                    <div>
                        <h2 className="font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1 border-b border-[var(--light-border)] dark:border-[var(--dark-border)] pb-2" style={{ fontSize: 'var(--text-section-title)' }}>School Type *</h2>
                        <div className="flex flex-wrap gap-6 text-xs">
                            <label className="flex items-center gap-3 text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="hasPrimary"
                                    checked={formData.hasPrimary}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 accent-agora-blue focus:ring-agora-blue cursor-pointer transition-all"
                                />
                                <span className="text-xs font-medium group-hover:text-agora-blue transition-colors">Primary Education</span>
                            </label>
                            <label className="flex items-center gap-3 text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="hasSecondary"
                                    checked={formData.hasSecondary}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 accent-agora-blue focus:ring-agora-blue cursor-pointer transition-all"
                                />
                                <span className="font-medium group-hover:text-agora-blue transition-colors" style={{ fontSize: 'var(--text-body)' }}>Secondary Education</span>
                            </label>
                            <label className="flex items-center gap-3 text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="hasTertiary"
                                    checked={formData.hasTertiary}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 accent-agora-blue focus:ring-agora-blue cursor-pointer transition-all"
                                />
                                <span className="font-medium group-hover:text-agora-blue transition-colors" style={{ fontSize: 'var(--text-body)' }}>Tertiary Education</span>
                            </label>
                        </div>
                    </div>

                    {/* Super Admin Details */}
                    <div className="mt-10">
                        <h2 className="font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1 border-b border-[var(--light-border)] dark:border-[var(--dark-border)] pb-2" style={{ fontSize: 'var(--text-section-title)' }}>School Super Admin Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>First Name *</label>
                                <input
                                    name="ownerFirstName"
                                    type="text"
                                    required
                                    value={formData.ownerFirstName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>Last Name *</label>
                                <input
                                    name="ownerLastName"
                                    type="text"
                                    required
                                    value={formData.ownerLastName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="Doe"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-body)' }}>Email *</label>
                                <input
                                    name="ownerEmail"
                                    type="email"
                                    required
                                    value={formData.ownerEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border-2 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[var(--light-border)] dark:border-[var(--dark-border)]"
                                    placeholder="owner@school.com"
                                />
                            </div>
                            <PhoneInput
                                label="Super Admin Phone"
                                required
                                value={formData.ownerPhone}
                                onChange={(val) => handlePhoneChange('ownerPhone', val)}
                                placeholder="8012345678"
                                labelClassName="text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-3 text-sm"
                            isLoading={isLoading}
                            isFlat={!(
                                formData.name.trim() &&
                                formData.email.trim() &&
                                isPhoneFilled(formData.phone) &&
                                (formData.hasPrimary || formData.hasSecondary || formData.hasTertiary) &&
                                formData.ownerFirstName.trim() &&
                                formData.ownerLastName.trim() &&
                                formData.ownerEmail.trim() &&
                                isPhoneFilled(formData.ownerPhone)
                            )}
                            disabled={
                                !formData.name.trim() ||
                                !formData.email.trim() ||
                                !isPhoneFilled(formData.phone) ||
                                !(formData.hasPrimary || formData.hasSecondary || formData.hasTertiary) ||
                                !formData.ownerFirstName.trim() ||
                                !formData.ownerLastName.trim() ||
                                !formData.ownerEmail.trim() ||
                                !isPhoneFilled(formData.ownerPhone)
                            }
                        >
                            Submit Registration
                        </Button>
                        <div className="text-center mt-4">
                            <Link href="/auth/login" className="text-sm text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:text-[#2490FD] hover:underline transition-colors border-b border-transparent">
                                Already have an account? Sign In
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
