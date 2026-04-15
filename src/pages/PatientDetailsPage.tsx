import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Appointment, ClinicalNote } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  User, Calendar, ClipboardList, Activity, 
  ChevronLeft, Plus, Sparkles, FileText, 
  Stethoscope, Pill, Thermometer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractClinicalInfo } from '../services/qwenService';

const PatientDetailsPage = ({ profile }: { profile: UserProfile }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [patient, setPatient] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // SOAP Form State
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [structuredInfo, setStructuredInfo] = useState({
    symptoms: [] as string[],
    findings: [] as string[],
    diagnosis: '',
    treatment: ''
  });

  useEffect(() => {
    if (!id) return;

    // Fetch Patient Profile
    const fetchPatient = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
          setPatient(docSnap.data() as UserProfile);
        } else {
          toast.error('Patient not found');
          navigate('/');
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    };

    fetchPatient();

    // Fetch Appointments
    const aptsQ = query(
      collection(db, 'appointments'),
      where('patientId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubApts = onSnapshot(aptsQ, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    });

    // Fetch Clinical Notes
    const notesQ = query(
      collection(db, 'clinicalNotes'),
      where('patientId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubNotes = onSnapshot(notesQ, (snapshot) => {
      setClinicalNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalNote)));
      setLoading(false);
    });

    return () => {
      unsubApts();
      unsubNotes();
    };
  }, [id, navigate]);

  const handleExtract = async () => {
    const combinedText = `
      Subjective: ${soapData.subjective}
      Objective: ${soapData.objective}
      Assessment: ${soapData.assessment}
      Plan: ${soapData.plan}
    `;
    
    if (!combinedText.trim()) {
      toast.error('Please enter some notes first');
      return;
    }

    setExtracting(true);
    try {
      const info = await extractClinicalInfo(combinedText);
      if (info) {
        setStructuredInfo({
          symptoms: info.symptoms || [],
          findings: info.findings || [],
          diagnosis: info.diagnosis || '',
          treatment: info.treatment || ''
        });
        if (info.soap) {
          setSoapData(info.soap);
        }
        toast.success('Clinical information extracted!');
      }
    } catch (error) {
      toast.error('Failed to extract information');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;

    try {
      await addDoc(collection(db, 'clinicalNotes'), {
        patientId: id,
        doctorId: profile.uid,
        date: new Date().toISOString(),
        soapNotes: soapData,
        structuredInfo: structuredInfo,
        createdAt: new Date().toISOString()
      });
      toast.success('Clinical note saved');
      setShowNoteForm(false);
      setSoapData({ subjective: '', objective: '', assessment: '', plan: '' });
      setStructuredInfo({ symptoms: [], findings: [], diagnosis: '', treatment: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!patient) return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-brand-primary mb-6">
        <ChevronLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient Profile Sidebar */}
        <div className="space-y-6">
          <section className="card text-center">
            <img 
              src={patient.photoURL || `https://ui-avatars.com/api/?name=${patient.displayName}`} 
              alt={patient.displayName}
              className="w-24 h-24 rounded-full mx-auto border-4 border-brand-bg mb-4"
            />
            <h2 className="text-xl font-bold text-slate-900">{patient.displayName}</h2>
            <p className="text-sm text-slate-500">{patient.email}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-left">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Blood Type</p>
                <p className="font-bold text-slate-700">{patient.bloodType || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Age</p>
                <p className="font-bold text-slate-700">
                  {patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31536000000) : 'N/A'}
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h3 className="font-bold text-slate-900 mb-4">Current Diagnosis & Treatment</h3>
            {clinicalNotes.length > 0 && clinicalNotes[0].structuredInfo ? (
              <div className="space-y-4">
                <div className="p-3 bg-brand-bg/10 rounded-xl border border-brand-primary/10">
                  <p className="text-[10px] text-brand-primary uppercase font-bold mb-1">Latest Diagnosis</p>
                  <p className="text-sm font-bold text-slate-700">{clinicalNotes[0].structuredInfo.diagnosis}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-[10px] text-green-600 uppercase font-bold mb-1">Current Treatment</p>
                  <p className="text-sm font-bold text-slate-700">{clinicalNotes[0].structuredInfo.treatment}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No active diagnosis or treatment recorded.</p>
            )}
          </section>

          <section className="card">
            <h3 className="font-bold text-slate-900 mb-4">Medical Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Family History</p>
                <p className="text-sm text-slate-600">{patient.familyHistory || 'No history recorded'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Insurance</p>
                <p className="text-sm text-slate-600">{patient.insuranceRecord || 'No insurance info'}</p>
              </div>
            </div>
          </section>

          <section className="card">
            <h3 className="font-bold text-slate-900 mb-4">Recent Appointments</h3>
            <div className="space-y-3">
              {appointments.slice(0, 3).map(apt => (
                <div key={apt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-700">{apt.date}</p>
                    <span className="text-[10px] font-bold uppercase text-brand-primary">{apt.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{apt.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Clinical History</h2>
            <button 
              onClick={() => setShowNoteForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> New SOAP Note
            </button>
          </div>

          <AnimatePresence>
            {showNoteForm && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card border-brand-primary/20 bg-brand-bg/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Generate SOAP Report</h3>
                  <button 
                    onClick={handleExtract}
                    disabled={extracting}
                    className="flex items-center gap-2 text-brand-primary font-bold text-sm hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Sparkles size={16} />
                    {extracting ? 'Extracting...' : 'AI Extract Info'}
                  </button>
                </div>

                <form onSubmit={handleSaveNote} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subjective (S)</label>
                        <textarea 
                          value={soapData.subjective}
                          onChange={(e) => setSoapData({...soapData, subjective: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 h-32 text-sm"
                          placeholder="Patient's complaints, symptoms..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Objective (O)</label>
                        <textarea 
                          value={soapData.objective}
                          onChange={(e) => setSoapData({...soapData, objective: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 h-32 text-sm"
                          placeholder="Vital signs, physical exam findings..."
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Assessment (A)</label>
                        <textarea 
                          value={soapData.assessment}
                          onChange={(e) => setSoapData({...soapData, assessment: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 h-32 text-sm"
                          placeholder="Diagnosis, differential diagnosis..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Plan (P)</label>
                        <textarea 
                          value={soapData.plan}
                          onChange={(e) => setSoapData({...soapData, plan: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 h-32 text-sm"
                          placeholder="Treatment, medications, follow-up..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Structured Info Preview */}
                  {(structuredInfo.diagnosis || structuredInfo.treatment) && (
                    <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 space-y-4">
                      <h4 className="font-bold text-brand-primary flex items-center gap-2">
                        <Activity size={18} /> Structured Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Diagnosis</p>
                          <p className="text-sm font-medium text-slate-700">{structuredInfo.diagnosis}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Treatment</p>
                          <p className="text-sm font-medium text-slate-700">{structuredInfo.treatment}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button type="submit" className="btn-primary flex-1 py-3">Save Clinical Note</button>
                    <button 
                      type="button" 
                      onClick={() => setShowNoteForm(false)}
                      className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            {clinicalNotes.length === 0 ? (
              <div className="card text-center py-12">
                <ClipboardList className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500">No clinical notes recorded yet.</p>
              </div>
            ) : (
              clinicalNotes.map(note => (
                <div key={note.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center text-brand-primary">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Clinical Note</p>
                        <p className="text-xs text-slate-500">{new Date(note.date).toLocaleDateString()} at {new Date(note.date).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">S</div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Subjective</p>
                          <p className="text-sm text-slate-700">{note.soapNotes?.subjective}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">O</div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Objective</p>
                          <p className="text-sm text-slate-700">{note.soapNotes?.objective}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-500 shrink-0">A</div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Assessment</p>
                          <p className="text-sm text-slate-700">{note.soapNotes?.assessment}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 shrink-0">P</div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Plan</p>
                          <p className="text-sm text-slate-700">{note.soapNotes?.plan}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {note.structuredInfo && (
                    <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <Stethoscope size={18} className="text-brand-primary mt-1" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Diagnosis</p>
                          <p className="text-sm font-bold text-slate-900">{note.structuredInfo.diagnosis}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Pill size={18} className="text-brand-primary mt-1" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Treatment</p>
                          <p className="text-sm font-bold text-slate-900">{note.structuredInfo.treatment}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailsPage;
