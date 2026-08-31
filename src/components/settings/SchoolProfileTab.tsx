'use client';

import { useState, useEffect, useRef } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import toast from 'react-hot-toast';
import { settingsText } from '@/components/settings/SettingsSection';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { CountrySelector } from '@/components/ui';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  useGetMySchoolQuery,
  useUpdateMySchoolMutation,
  useRequestEditTokenMutation,
  useVerifyEditTokenMutation,
  useUploadSchoolLogoMutation,
} from '@/lib/store/api/schoolAdminApi';
import { Save, Mail, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';
import type { School } from '@/lib/store/api/schoolsApi';

interface SchoolProfileTabProps {
  token: string | null;
  router: AppRouterInstance;
}

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  hasPrimary: boolean;
  hasSecondary: boolean;
  hasTertiary: boolean;
}

function emptyForm(): ProfileForm {
  return {
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
  };
}

function formFromSchool(school: {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  hasPrimary: boolean;
  hasSecondary: boolean;
  hasTertiary: boolean;
}): ProfileForm {
  return {
    name: school.name || '',
    email: school.email || '',
    phone: school.phone || '',
    address: school.address || '',
    city: school.city || '',
    state: school.state || '',
    country: school.country || 'Nigeria',
    hasPrimary: school.hasPrimary,
    hasSecondary: school.hasSecondary,
    hasTertiary: school.hasTertiary,
  };
}

function levelsChanged(form: ProfileForm, school: ProfileForm) {
  return (
    form.hasPrimary !== school.hasPrimary ||
    form.hasSecondary !== school.hasSecondary ||
    form.hasTertiary !== school.hasTertiary
  );
}

function buildUpdatePayload(form: ProfileForm, includeLevels: boolean) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    country: form.country.trim() || 'Nigeria',
  };

  if (includeLevels) {
    payload.levels = {
      primary: form.hasPrimary,
      secondary: form.hasSecondary,
      tertiary: form.hasTertiary,
    };
  }

  return payload;
}

export function SchoolProfileTab({ token, router }: SchoolProfileTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm());
  const [baseline, setBaseline] = useState<ProfileForm>(emptyForm());
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingTokenChanges, setPendingTokenChanges] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  const { data: schoolResponse, isLoading, refetch } = useGetMySchoolQuery();
  const school = schoolResponse?.data;

  const [updateSchool, { isLoading: isSaving }] = useUpdateMySchoolMutation();
  const [requestEditToken, { isLoading: isRequestingToken }] = useRequestEditTokenMutation();
  const [verifyEditToken] = useVerifyEditTokenMutation();
  const [uploadSchoolLogo, { isLoading: isUploadingLogo }] = useUploadSchoolLogoMutation();

  useEffect(() => {
    if (!school) return;
    const next = formFromSchool(school);
    setForm(next);
    setBaseline(next);
  }, [school]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setIsVerifyingToken(true);

    verifyEditToken(token)
      .unwrap()
      .then((res) => {
        if (cancelled) return;
        setPendingTokenChanges(res.data.changes as Record<string, unknown>);
        toast.success('Verification token is valid. Review and apply the proposed changes.');
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.data?.message || 'Invalid or expired verification token.');
        router.replace('/dashboard/school/settings/profile?tab=profile');
      })
      .finally(() => {
        if (!cancelled) setIsVerifyingToken(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, verifyEditToken, router]);

  const handleChange = (field: keyof ProfileForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoSelect = (file: File) => {
    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!school) return;

    if (!form.name.trim()) {
      toast.error('School name is required.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('School email is required.');
      return;
    }
    if (!form.hasPrimary && !form.hasSecondary && !form.hasTertiary) {
      toast.error('Select at least one school type.');
      return;
    }

    const typeChange = levelsChanged(form, baseline);

    try {
      if (typeChange) {
        await requestEditToken(buildUpdatePayload(form, true) as Partial<School>).unwrap();
        toast.success(
          'Verification email sent to your principal. They must approve school type changes before they take effect.',
        );
        setBaseline(form);
        return;
      }

      await updateSchool({ data: buildUpdatePayload(form, false) as Partial<School> }).unwrap();
      toast.success('School profile updated.');
      setBaseline(form);
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Failed to update school profile.';
      toast.error(message);
    }
  };

  const handleApplyTokenChanges = async () => {
    if (!token || !pendingTokenChanges) return;

    try {
      await updateSchool({
        data: pendingTokenChanges as Partial<School>,
        token,
      }).unwrap();
      toast.success('School profile changes applied.');
      setPendingTokenChanges(null);
      router.replace('/dashboard/school/settings/profile?tab=profile');
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Failed to apply changes.';
      toast.error(message);
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) return;
    try {
      await uploadSchoolLogo({ file: selectedLogoFile }).unwrap();
      toast.success('School logo uploaded.');
      setSelectedLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Failed to upload logo.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!school) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Could not load school profile.</AlertDescription>
      </Alert>
    );
  }

  const pendingLevels = pendingTokenChanges?.levels as
    | { primary?: boolean; secondary?: boolean; tertiary?: boolean }
    | undefined;

  return (
    <div className="space-y-6">
      {token && (
        <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35}>
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {isVerifyingToken ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying email link…
                </span>
              ) : pendingTokenChanges ? (
                <div className="space-y-3">
                  <p>
                    <strong>Pending profile changes</strong> — review and apply to update your school
                    profile.
                  </p>
                  {pendingLevels && (
                    <ul className="list-disc pl-5 space-y-1" style={settingsText.body}>
                      <li>Primary: {pendingLevels.primary ? 'Yes' : 'No'}</li>
                      <li>Secondary: {pendingLevels.secondary ? 'Yes' : 'No'}</li>
                      <li>Tertiary: {pendingLevels.tertiary ? 'Yes' : 'No'}</li>
                    </ul>
                  )}
                  <Button onClick={handleApplyTokenChanges} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply changes
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                'This verification link is invalid or has expired.'
              )}
            </AlertDescription>
          </Alert>
        </FadeInUp>
      )}

      <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle>School logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoSelect(file);
                }}
              />
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="object-cover rounded-lg border-2 border-blue-500"
                  style={{ width: 72, height: 72 }}
                />
              ) : school.logo ? (
                <img
                  src={school.logo}
                  alt="School logo"
                  className="object-cover rounded-lg border border-light-border dark:border-dark-border"
                  style={{ width: 72, height: 72 }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center rounded-lg border-2 border-dashed border-light-border dark:border-dark-border hover:border-blue-400 transition-colors"
                  style={{ width: 72, height: 72 }}
                >
                  <Upload className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose image
                </Button>
                {selectedLogoFile && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUploadLogo}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? 'Uploading…' : 'Upload logo'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLogoFile(null);
                        setLogoPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeInUp>

      <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>School details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="school-name">School name</Label>
                <Input
                  id="school-name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Official school name"
                />
              </div>
              <div>
                <Label htmlFor="school-email">School email</Label>
                <Input
                  id="school-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@school.com"
                />
              </div>
              <div>
                <PhoneInput
                  label="School phone"
                  value={form.phone}
                  onChange={(val) => handleChange('phone', val)}
                  placeholder="8012345678"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="school-address">Address</Label>
                <Input
                  id="school-address"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 School Road"
                />
              </div>
              <div>
                <Label htmlFor="school-city">City</Label>
                <Input
                  id="school-city"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Lagos"
                />
              </div>
              <div>
                <Label htmlFor="school-state">State</Label>
                <Input
                  id="school-state"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Lagos State"
                />
              </div>
              <div>
                <Label>Country</Label>
                <CountrySelector
                  value={form.country}
                  onChange={(val) => handleChange('country', val)}
                  scope="west-africa"
                  placeholder="Select country"
                />
              </div>
            </div>

            <div>
              <h3
                className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-3 border-b border-light-border dark:border-dark-border pb-2"
                style={{ fontSize: 'var(--text-section-title)' }}
              >
                School type
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4" style={settingsText.body}>
                Changing school type requires email verification from a principal-level admin.
              </p>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.hasPrimary}
                    onCheckedChange={(checked) => handleChange('hasPrimary', checked)}
                  />
                  <span style={{ fontSize: 'var(--text-body)' }}>Primary education</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.hasSecondary}
                    onCheckedChange={(checked) => handleChange('hasSecondary', checked)}
                  />
                  <span style={{ fontSize: 'var(--text-body)' }}>Secondary education</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.hasTertiary}
                    onCheckedChange={(checked) => handleChange('hasTertiary', checked)}
                  />
                  <span style={{ fontSize: 'var(--text-body)' }}>Tertiary education</span>
                </label>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || isRequestingToken}
              className="rounded-xl"
            >
              {isSaving || isRequestingToken ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
