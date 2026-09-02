'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetPublicSchoolQuery, useGetAdmissionConfigQuery, useSubmitAdmissionApplicationMutation } from '@/lib/store/api/publicApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, GraduationCap, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function PublicAdmissionPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.schoolId as string;

  const { data: school, isLoading: isLoadingSchool, isError } = useGetPublicSchoolQuery(schoolId);
  const { data: admissionConfig } = useGetAdmissionConfigQuery(schoolId);
  const [submitApplication, { isLoading: isSubmitting }] = useSubmitAdmissionApplicationMutation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    nationality: '',
    state: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: '',
    bloodGroup: '',
    allergies: '',
    medications: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    medicalNotes: '',
  });

  const [submitted, setSubmitted] = useState(false);

  type FieldCfg = { key: string; label: string; required: boolean; visible: boolean };
  const fields = (admissionConfig?.formFields as FieldCfg[] | undefined) ?? [];
  const fieldByKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const show = (key: string) => !fieldByKey[key] || fieldByKey[key].visible !== false;
  const req = (key: string, fallback = false) => fieldByKey[key]?.required ?? fallback;
  const label = (key: string, fallback: string) => fieldByKey[key]?.label ?? fallback;

  const applicationsOpen = admissionConfig?.applicationsOpen !== false;
  const deadlinePassed =
    !!admissionConfig?.applicationDeadline &&
    new Date() > new Date(admissionConfig.applicationDeadline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await submitApplication({
        schoolId,
        application: formData
      }).unwrap();
      
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to submit application');
    }
  };

  if (isLoadingSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">School Not Found</h1>
        <p className="text-gray-600 mb-6">The admission link you followed is invalid or has expired.</p>
        <Button onClick={() => router.push('/')}>Go to Homepage</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for applying to <strong>{school.name}</strong>. Your application is now being reviewed by the school administration.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            You will receive an email once your application has been processed.
          </p>
          <Button variant="primary" className="w-full" onClick={() => router.push('/')}>
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  if (!applicationsOpen || deadlinePassed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Applications closed</h1>
        <p className="text-gray-600 mb-6">
          {deadlinePassed
            ? 'The application deadline for this school has passed.'
            : 'This school is not currently accepting applications.'}
        </p>
        <Button onClick={() => router.push('/')}>Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* School Branding */}
        <div className="flex flex-col items-center mb-8">
          {school.logo ? (
            <div className="relative h-20 w-20 mb-4 rounded-xl overflow-hidden shadow-sm">
              <Image src={school.logo} alt={school.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-16 w-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-gray-600">Student Admission Form</p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {show('firstName') && (
                  <Input
                    label={`${label('firstName', 'First Name')}${req('firstName', true) ? ' *' : ''}`}
                    required={req('firstName', true)}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  )}
                  {show('lastName') && (
                  <Input
                    label={`${label('lastName', 'Last Name')}${req('lastName', true) ? ' *' : ''}`}
                    required={req('lastName', true)}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                  )}
                  {show('middleName') && (
                  <Input
                    label={`${label('middleName', 'Middle Name')}${req('middleName') ? ' *' : ''}`}
                    required={req('middleName')}
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                  )}
                  {show('gender') && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{label('gender', 'Gender')}{req('gender', true) ? ' *' : ''}</label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                      required={req('gender', true)}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  )}
                  {show('dateOfBirth') && (
                  <DatePicker
                    label={`${label('dateOfBirth', 'Date of Birth')}${req('dateOfBirth', true) ? ' *' : ''}`}
                    required={req('dateOfBirth', true)}
                    value={formData.dateOfBirth}
                    onChange={(val) => setFormData({ ...formData, dateOfBirth: val })}
                  />
                  )}
                  {show('nationality') && (
                  <Input
                    label={`${label('nationality', 'Nationality')}${req('nationality', true) ? ' *' : ''}`}
                    required={req('nationality', true)}
                    placeholder="e.g. Nigerian"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  />
                  )}
                  {show('state') && (
                  <Input
                    label={`${label('state', 'State of Origin')}${req('state', true) ? ' *' : ''}`}
                    required={req('state', true)}
                    placeholder="e.g. Lagos"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {show('email') && (
                  <Input
                    label={`${label('email', 'Email Address')}${req('email', true) ? ' *' : ''}`}
                    type="email"
                    required={req('email', true)}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  )}
                  {show('phone') && (
                  <PhoneInput
                    label={`${label('phone', 'Phone Number')}${req('phone') ? ' *' : ''}`}
                    required={req('phone')}
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                  />
                  )}
                  {show('address') && (
                  <div className="sm:col-span-2">
                    <Input
                      label={`${label('address', 'Home Address')}${req('address') ? ' *' : ''}`}
                      required={req('address')}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  )}
                </div>
              </div>

              {(show('parentName') || show('parentPhone') || show('parentEmail') || show('parentRelationship')) && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Parent/Guardian Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {show('parentName') && (
                  <Input
                    label={`${label('parentName', 'Parent Full Name')}${req('parentName', true) ? ' *' : ''}`}
                    required={req('parentName', true)}
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  />
                  )}
                  {show('parentRelationship') && (
                  <Input
                    label={`${label('parentRelationship', 'Relationship')}${req('parentRelationship', true) ? ' *' : ''}`}
                    required={req('parentRelationship', true)}
                    placeholder="e.g. Father, Mother"
                    value={formData.parentRelationship}
                    onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value })}
                  />
                  )}
                  {show('parentPhone') && (
                  <PhoneInput
                    label={`${label('parentPhone', 'Parent Phone Number')}${req('parentPhone', true) ? ' *' : ''}`}
                    required={req('parentPhone', true)}
                    value={formData.parentPhone}
                    onChange={(val) => setFormData({ ...formData, parentPhone: val })}
                  />
                  )}
                  {show('parentEmail') && (
                  <Input
                    label={`${label('parentEmail', 'Parent Email Address')}${req('parentEmail') ? ' *' : ''}`}
                    type="email"
                    required={req('parentEmail')}
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                  )}
                </div>
              </div>
              )}

              {(show('bloodGroup') ||
                show('allergies') ||
                show('medications') ||
                show('emergencyContact') ||
                show('emergencyContactPhone') ||
                show('medicalNotes')) && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Health Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {show('bloodGroup') && (
                  <Input
                    label={`${label('bloodGroup', 'Blood Group')}${req('bloodGroup') ? ' *' : ''}`}
                    required={req('bloodGroup')}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  />
                  )}
                  {show('allergies') && (
                  <Input
                    label={`${label('allergies', 'Allergies')}${req('allergies') ? ' *' : ''}`}
                    required={req('allergies')}
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                  )}
                  {show('medications') && (
                  <Input
                    label={`${label('medications', 'Medications')}${req('medications') ? ' *' : ''}`}
                    required={req('medications')}
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  />
                  )}
                  {show('emergencyContact') && (
                  <Input
                    label={`${label('emergencyContact', 'Emergency Contact')}${req('emergencyContact') ? ' *' : ''}`}
                    required={req('emergencyContact')}
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                  )}
                  {show('emergencyContactPhone') && (
                  <PhoneInput
                    label={`${label('emergencyContactPhone', 'Emergency Contact Phone')}${req('emergencyContactPhone') ? ' *' : ''}`}
                    required={req('emergencyContactPhone')}
                    value={formData.emergencyContactPhone}
                    onChange={(val) => setFormData({ ...formData, emergencyContactPhone: val })}
                  />
                  )}
                  {show('medicalNotes') && (
                  <div className="sm:col-span-2">
                    <Input
                      label={`${label('medicalNotes', 'Medical Notes')}${req('medicalNotes') ? ' *' : ''}`}
                      required={req('medicalNotes')}
                      value={formData.medicalNotes}
                      onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    />
                  </div>
                  )}
                </div>
              </div>
              )}

              <div className="pt-6">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full h-12 text-lg"
                  isLoading={isSubmitting}
                >
                  Submit Application
                </Button>
                <p className="text-center text-xs text-gray-500 mt-4">
                  By submitting this form, you agree to the school&apos;s admission terms and conditions.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Myschoolbud
          </button>
        </div>
      </div>
    </div>
  );
}
