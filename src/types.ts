export type Role = 'admin' | 'doctor' | 'nurse' | 'patient';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  language?: string;
  bio?: string;
  phoneNumber?: string;
  primaryDoctorId?: string;
  primaryDoctorName?: string;
  // New fields
  dateOfBirth?: string;
  education?: string;
  profession?: string;
  workLevel?: string;
  incomeRange?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  immunizationRecord?: string;
  familyHistory?: string;
  insuranceRecord?: string;
  // Doctor specific fields
  title?: string;
  qualifications?: string;
  specialization?: string;
  licenseNumber?: string;
  experienceYears?: number;
  affiliations?: string;
  languages?: string[];
  workingHours?: string;
  clinicAddress?: string;
  consultationFee?: number;
  specialServices?: string;
  acceptedInsurance?: string;
  communicationOptions?: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  audioUrl?: string;
  transcription?: string;
  soapNotes?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  structuredInfo?: {
    symptoms: string[];
    findings: string[];
    diagnosis: string;
    treatment: string;
  };
  clinicalChecklist?: string[];
  createdAt: string;
}

export interface PregnancySession {
  id: string;
  patientId: string;
  patientName: string;
  lmp: string;
  edd: string;
  initialGestationWeeks?: number;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface PregnancyRecord {
  id: string;
  sessionId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  weight?: number;
  bloodPressure?: string;
  fundalHeight?: number;
  fetalHeartRate?: number;
  notes: string;
  medicalAdvice?: string;
  createdAt: string;
}

export interface PreviousPregnancy {
  id: string;
  patientId: string;
  year: string;
  outcome: 'healthy' | 'abortion' | 'stillbirth' | 'miscarriage' | 'other';
  gestationWeeks?: number;
  deliveryType?: string;
  complications?: string;
  notes?: string;
  createdAt: string;
}

export interface PreviousPregnancyMedicalRecord {
  id: string;
  previousPregnancyId: string;
  patientId: string;
  type: 'immunization' | 'medicine' | 'other';
  description: string;
  date: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  queueNumber?: number;
  reason?: string;
  type: 'consultation' | 'lab';
  labService?: string;
  doctorNotes?: string;
  feedback?: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
}

export interface NutritionIntake {
  id: string;
  patientId: string;
  date: string;
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  notes?: string;
  createdAt: string;
}
