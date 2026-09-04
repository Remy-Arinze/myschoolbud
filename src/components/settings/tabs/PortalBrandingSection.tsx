'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { useGetMySubscriptionQuery, SubscriptionTier } from '@/lib/store/api/subscriptionsApi';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
// const DEFAULT_ACCENT = '#007FFF';
// const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function PortalBrandingSection() {
  const { data: schoolRes, refetch } = useGetMySchoolQuery();
  const { data: subRes } = useGetMySubscriptionQuery();
  const token = useSelector((state: RootState) => state.auth.token);
  const school = schoolRes?.data;
  const tier = subRes?.data?.tier || SubscriptionTier.FREE;
  const paid = tier === SubscriptionTier.PRO_PLUS || tier === SubscriptionTier.CUSTOM;

  // const [accentColor, setAccentColor] = useState('');
  const [loginTagline, setLoginTagline] = useState('');
  const [hidePlatformMark, setHidePlatformMark] = useState(false);
  // const [customHost, setCustomHost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!school) return;
    // setAccentColor(school.branding?.accentColor || '');
    setLoginTagline(school.branding?.loginTagline || '');
    setHidePlatformMark(!!school.branding?.hidePlatformMark);
    // setCustomHost(school.customDomain || '');
  }, [school]);

  const authHeaders = () => ({
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  });

  const saveBranding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/school-admin/school/branding`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ loginTagline, hidePlatformMark }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save branding');
      toast.success('Portal branding saved.');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // const requestDomain = async () => {
  //   try {
  //     const res = await fetch(`${API}/school-admin/school/custom-domain`, {
  //       method: 'POST',
  //       headers: authHeaders(),
  //       body: JSON.stringify({ host: customHost }),
  //     });
  //     const json = await res.json();
  //     if (!res.ok) throw new Error(json.message || 'Failed to save domain');
  //     toast.success('Add the TXT record shown, then click Verify.');
  //     refetch();
  //   } catch (e) {
  //     toast.error(e instanceof Error ? e.message : 'Failed to save domain');
  //   }
  // };

  // const verifyDomain = async () => {
  //   try {
  //     const res = await fetch(`${API}/school-admin/school/custom-domain/verify`, {
  //       method: 'POST',
  //       headers: authHeaders(),
  //     });
  //     const json = await res.json();
  //     if (!res.ok) throw new Error(json.message || 'Verification failed');
  //     toast.success('Custom domain verified.');
  //     refetch();
  //   } catch (e) {
  //     toast.error(e instanceof Error ? e.message : 'Verification failed');
  //   }
  // };

  if (!school) return null;
  const portalUrl = school.portalUrl || (school.slug ? `https://${school.slug}.myschoolbud.com` : null);

  return (
    <div className="space-y-8">
      <SettingsSection title="School portal">
        <Label>Portal URL</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={portalUrl || 'Assigned when your school is verified'} />
          {portalUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                toast.success('Copied');
              }}
            >
              Copy
            </Button>
          )}
        </div>
        <p className="mt-2" style={settingsText.body}>
          Teachers, students, and admins all sign in at this address.
        </p>
      </SettingsSection>

      <SettingsSection title="Console branding">
        {/* Accent color — hidden until redesign
        <Label>Accent color</Label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="color"
            value={HEX_COLOR.test(accentColor) ? accentColor : DEFAULT_ACCENT}
            onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
            className="h-10 w-14 cursor-pointer rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-transparent p-1"
            aria-label="Pick accent color"
          />
          <span className="text-sm text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] font-mono">
            {HEX_COLOR.test(accentColor) ? accentColor : 'Default'}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAccentColor('')}
            disabled={!accentColor}
          >
            Use default
          </Button>
        </div>
        <p className="mt-2" style={settingsText.body}>
          Used for buttons and highlights in your school portal. Reset to the Myschoolbud blue anytime.
        </p>
        */}
        <Label>Login tagline</Label>
        <Input value={loginTagline} onChange={(e) => setLoginTagline(e.target.value)} placeholder="Welcome to our school" />
        <p className="mt-2" style={settingsText.body}>
          Shown under the sign-in heading on your school’s login page. Leave blank to hide it.
        </p>
        <label className="flex items-center gap-2 mt-4" style={settingsText.body}>
          <Checkbox checked={hidePlatformMark} disabled={!paid} onCheckedChange={(v) => setHidePlatformMark(!!v)} />
          Hide “Powered by Myschoolbud” {paid ? '' : '(Pro Plus)'}
        </label>
        <Button className="mt-4" onClick={saveBranding} disabled={saving}>Save branding</Button>
      </SettingsSection>

      {/* Custom domain — hidden until launch
      <SettingsSection title="Custom domain">
        <p className="mb-2" style={settingsText.body}>
          Point a CNAME to <code>cname.myschoolbud.com</code>, then add the TXT verification record. Pro Plus and custom plans only.
        </p>
        <Input value={customHost} onChange={(e) => setCustomHost(e.target.value)} placeholder="portal.yourschool.edu.ng" disabled={!paid} />
        <div className="flex gap-2 mt-3">
          <Button type="button" onClick={requestDomain} disabled={!paid || !customHost}>Save domain</Button>
          <Button type="button" variant="ghost" onClick={verifyDomain} disabled={!paid}>Verify DNS</Button>
        </div>
        {school.customDomainStatus && (
          <p className="mt-2" style={settingsText.body}>Status: {school.customDomainStatus}</p>
        )}
      </SettingsSection>
      */}
    </div>
  );
}
