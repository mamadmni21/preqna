import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const Loading = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

const ProfilePage = ({ profile, setProfile }: { profile: UserProfile, setProfile: any }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: profile.displayName,
    bio: profile.bio || '',
    phoneNumber: profile.phoneNumber || '',
    primaryDoctorId: profile.primaryDoctorId || '',
    primaryDoctorName: profile.primaryDoctorName || '',
    dateOfBirth: profile.dateOfBirth || '',
    education: profile.education || '',
    profession: profile.profession || '',
    workLevel: profile.workLevel || '',
    incomeRange: profile.incomeRange || '',
    weight: profile.weight ?? null,
    height: profile.height ?? null,
    bloodType: profile.bloodType || '',
    immunizationRecord: profile.immunizationRecord || '',
    familyHistory: profile.familyHistory || '',
    insuranceRecord: profile.insuranceRecord || '',
    // Doctor fields
    title: profile.title || '',
    qualifications: profile.qualifications || '',
    specialization: profile.specialization || '',
    licenseNumber: profile.licenseNumber || '',
    experienceYears: profile.experienceYears ?? null,
    affiliations: profile.affiliations || '',
    workingHours: profile.workingHours || '',
    clinicAddress: profile.clinicAddress || '',
    consultationFee: profile.consultationFee ?? null,
    specialServices: profile.specialServices || '',
    acceptedInsurance: profile.acceptedInsurance || '',
    communicationOptions: profile.communicationOptions || '',
  });
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return unsub;
  }, []);

  const educationOptions = ['Primary', 'Secondary', 'Vocational', 'Bachelor', 'Master', 'Doctorate'];
  const workLevelOptions = ['Entry Level', 'Mid Level', 'Senior Level', 'Management', 'Executive'];
  const incomeOptions = ['< $10k', '$10k - $30k', '$30k - $60k', '$60k - $100k', '> $100k'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedProfile = { ...profile, ...formData };
      await setDoc(doc(db, 'users', profile.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile);
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'weight' || name === 'height' || name === 'experienceYears' || name === 'consultationFee') ? (value ? Number(value) : null) : value
    }));
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('profile')}</h1>
      <div className="card">
        <div className="flex flex-col items-center mb-8">
          <img 
            src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
            alt="Profile" 
            className="w-32 h-32 rounded-full border-4 border-brand-primary/20 mb-4"
          />
          <h2 className="text-xl font-bold text-slate-900">{profile.displayName}</h2>
          <p className="text-slate-500 capitalize">{t(profile.role)}</p>
          {profile.role === 'doctor' && (
            <div className="flex items-center gap-1 mt-2 text-amber-500">
              <span className="font-bold">4.9</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-slate-400 text-xs ml-1">(120+ reviews)</span>
            </div>
          )}
        </div>

        <form onSubmit={handleUpdate} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.role === 'patient' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primary Doctor (Assigned)</label>
                  <select 
                    name="primaryDoctorId"
                    value={formData.primaryDoctorId || ''}
                    onChange={(e) => {
                      const doc = doctors.find(d => d.uid === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        primaryDoctorId: e.target.value,
                        primaryDoctorName: doc?.displayName || ''
                      }));
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg/10"
                  >
                    <option value="">Select a Doctor</option>
                    {doctors.map(d => (
                      <option key={d.uid} value={d.uid}>Dr. {d.displayName}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Changing your doctor will transfer your clinical records to the new selection.</p>
                </div>
              )}
              {profile.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title (e.g. MD, MBBS)</label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. MD, Cardiologist"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Blood Type</label>
                <select 
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Select Blood Type</option>
                  {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Professional & Socio-economic */}
          {profile.role === 'patient' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">Professional & Socio-economic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Education</label>
                  <select 
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">Select Education</option>
                    {educationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Profession</label>
                  <input 
                    type="text" 
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Work Level</label>
                  <select 
                    name="workLevel"
                    value={formData.workLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">Select Work Level</option>
                    {workLevelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Income Range</label>
                  <select 
                    name="incomeRange"
                    value={formData.incomeRange}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">Select Income Range</option>
                    {incomeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : profile.role === 'doctor' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">Credentials & Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Qualifications</label>
                  <input 
                    type="text" 
                    name="qualifications"
                    value={formData.qualifications}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. MBBS, MD, PhD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Specialization</label>
                  <input 
                    type="text" 
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Cardiologist, Pediatrician"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">License Number</label>
                  <input 
                    type="text" 
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Medical Registration Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Years of Experience</label>
                  <input 
                    type="number" 
                    name="experienceYears"
                    value={formData.experienceYears || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Languages Spoken (comma separated)</label>
                  <input 
                    type="text" 
                    name="languages"
                    value={formData.languages?.join(', ') || ''}
                    onChange={(e) => {
                      const langs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setFormData(prev => ({ ...prev, languages: langs }));
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. English, Malay, Mandarin"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hospital Affiliations</label>
                  <textarea 
                    name="affiliations"
                    value={formData.affiliations}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    placeholder="List hospitals or clinics you are affiliated with..."
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Physical & Medical / Scheduling */}
          {profile.role === 'patient' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">Physical & Medical</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
                  <input 
                    type="number" 
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Height (cm)</label>
                  <input 
                    type="number" 
                    name="height"
                    value={formData.height || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Immunization Record</label>
                <textarea 
                  name="immunizationRecord"
                  value={formData.immunizationRecord}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                  placeholder="List your immunizations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Family Medical History</label>
                <textarea 
                  name="familyHistory"
                  value={formData.familyHistory}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                  placeholder="Describe any relevant family medical history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Healthcare Insurance</label>
                <textarea 
                  name="insuranceRecord"
                  value={formData.insuranceRecord}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                  placeholder="Insurance provider and policy details..."
                />
              </div>
            </div>
          ) : profile.role === 'doctor' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">Scheduling & Practice</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Working Hours</label>
                  <input 
                    type="text" 
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Mon-Fri: 9AM - 5PM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Consultation Fee ($)</label>
                  <input 
                    type="number" 
                    name="consultationFee"
                    value={formData.consultationFee || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Clinic/Hospital Address</label>
                  <textarea 
                    name="clinicAddress"
                    value={formData.clinicAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    placeholder="Full address of your primary practice..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Accepted Insurance Plans</label>
                  <textarea 
                    name="acceptedInsurance"
                    value={formData.acceptedInsurance}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    placeholder="List insurance providers you accept..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Special Services & Procedures</label>
                  <textarea 
                    name="specialServices"
                    value={formData.specialServices}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    placeholder="e.g. Virtual consultation, specialized check-ups..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Communication Options</label>
                  <input 
                    type="text" 
                    name="communicationOptions"
                    value={formData.communicationOptions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Messaging, Video Call, Phone"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-primary border-b border-slate-100 pb-2">About Me</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-32"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
            {loading ? <Loading /> : <><Save size={20} /> {t('save')}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
