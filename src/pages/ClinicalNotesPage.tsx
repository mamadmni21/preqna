import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mic, X, Activity, MessageSquare, Check, Settings, Users, Clock, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { transcribeClinicalAudio } from '../services/geminiService';

const Loading = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

const ClinicalNotesPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [notes, setNotes] = useState<any>(null);
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [activeTab, setActiveTab] = useState<'notes' | 'profile'>('notes');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'patient'));
    return onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;

    const notesQ = query(
      collection(db, 'clinicalNotes'),
      where('patientId', '==', selectedPatient.id),
      orderBy('createdAt', 'desc')
    );
    const nutritionQ = query(
      collection(db, 'nutrition'),
      where('patientId', '==', selectedPatient.id),
      orderBy('createdAt', 'desc')
    );

    const unsubNotes = onSnapshot(notesQ, (snapshot) => {
      setExistingNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubNutrition = onSnapshot(nutritionQ, (snapshot) => {
      setNutritionHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubNotes();
      unsubNutrition();
    };
  }, [selectedPatient]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    mediaRecorder?.stream.getTracks().forEach(track => track.stop());
  };

  const handleTranscribe = async () => {
    if (!audioBlob || !selectedPatient) return;
    setTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await transcribeClinicalAudio(base64, 'audio/webm');
        setNotes(result);
        
        // Save to Firestore
        await setDoc(doc(collection(db, 'clinicalNotes')), {
          patientId: selectedPatient.id,
          patientName: selectedPatient.displayName,
          doctorId: profile.uid,
          doctorName: profile.displayName,
          ...result,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        toast.success('Clinical notes generated and saved');
      };
    } catch (error: any) {
      toast.error('Transcription failed: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('clinicalNotes')}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Select Patient</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {patients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedPatient?.id === p.id ? 'bg-brand-primary text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} className="w-10 h-10 rounded-full" alt="" />
                  <div className="text-left">
                    <p className="font-bold text-sm">{p.displayName}</p>
                    <p className={`text-xs ${selectedPatient?.id === p.id ? 'text-white/80' : 'text-slate-500'}`}>{p.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedPatient ? (
            <div className="card h-full flex flex-col items-center justify-center text-center py-20">
              <Users size={64} className="text-slate-200 mb-4" />
              <p className="text-slate-500">Select a patient to start clinical documentation</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'notes' ? 'bg-brand-primary text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Clinical Notes
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-brand-primary text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Patient Profile
                </button>
              </div>

              {activeTab === 'notes' ? (
                <>
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Audio Documentation</h3>
                        <p className="text-sm text-slate-500">Record clinical audio for {selectedPatient.displayName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all animate-pulse">
                            <X size={20} /> Stop
                          </button>
                        ) : (
                          <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-opacity-90 transition-all">
                            <Mic size={20} /> Start Recording
                          </button>
                        )}
                      </div>
                    </div>

                    {audioBlob && !isRecording && (
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
                            <Mic size={20} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Audio recorded successfully</span>
                        </div>
                        <button 
                          onClick={handleTranscribe} 
                          disabled={transcribing}
                          className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                        >
                          {transcribing ? <Loading /> : <><Activity size={18} /> Generate Notes</>}
                        </button>
                      </div>
                    )}
                  </div>

                  {notes && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Generated Documentation</h3>
                        <button onClick={() => setNotes(null)} className="text-slate-400 hover:text-slate-600">Clear</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                          <h4 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                            <MessageSquare size={18} /> Subjective
                          </h4>
                          <p className="text-slate-700 text-sm leading-relaxed">{notes.soapNotes.subjective}</p>
                        </div>
                        <div className="card">
                          <h4 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                            <Activity size={18} /> Objective
                          </h4>
                          <p className="text-slate-700 text-sm leading-relaxed">{notes.soapNotes.objective}</p>
                        </div>
                        <div className="card">
                          <h4 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                            <Check size={18} /> Assessment
                          </h4>
                          <p className="text-slate-700 text-sm leading-relaxed">{notes.soapNotes.assessment}</p>
                        </div>
                        <div className="card">
                          <h4 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                            <Settings size={18} /> Plan
                          </h4>
                          <p className="text-slate-700 text-sm leading-relaxed">{notes.soapNotes.plan}</p>
                        </div>
                      </div>

                      <div className="card">
                        <h4 className="font-bold text-slate-900 mb-4">Clinical Checklist</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {notes.clinicalChecklist.map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                              <div className="w-5 h-5 border-2 border-brand-primary rounded flex items-center justify-center text-brand-primary">
                                <Check size={14} />
                              </div>
                              <span className="text-sm text-slate-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={20} className="text-brand-primary" />
                        Clinical History
                      </h3>
                      {existingNotes.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">No previous clinical notes.</p>
                      ) : (
                        existingNotes.map((note) => (
                          <div key={note.id} className="card p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-bold text-slate-900">{new Date(note.date).toLocaleDateString()}</p>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Dr. {note.doctorName}</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">{note.soapNotes.assessment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Utensils size={20} className="text-brand-primary" />
                        Nutrition Monitor
                      </h3>
                      {nutritionHistory.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">No nutrition records found.</p>
                      ) : (
                        <div className="space-y-2">
                          {nutritionHistory.slice(0, 5).map((rec) => (
                            <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div>
                                <p className="font-bold text-sm text-slate-900">{rec.foodName}</p>
                                <p className="text-[10px] text-slate-500">{new Date(rec.createdAt).toLocaleDateString()}</p>
                              </div>
                              <p className="font-bold text-brand-primary text-sm">{rec.calories} kcal</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="font-bold text-brand-primary border-b border-slate-100 pb-2">Basic & Socio-economic</h4>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-slate-500">Date of Birth:</span> {selectedPatient.dateOfBirth || 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Blood Type:</span> {selectedPatient.bloodType || 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Education:</span> {selectedPatient.education || 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Profession:</span> {selectedPatient.profession || 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Work Level:</span> {selectedPatient.workLevel || 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Income Range:</span> {selectedPatient.incomeRange || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-bold text-brand-primary border-b border-slate-100 pb-2">Physical Stats</h4>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-slate-500">Weight:</span> {selectedPatient.weight ? `${selectedPatient.weight} kg` : 'Not provided'}</p>
                          <p className="text-sm"><span className="text-slate-500">Height:</span> {selectedPatient.height ? `${selectedPatient.height} cm` : 'Not provided'}</p>
                          <p className="text-sm">
                            <span className="text-slate-500">BMI:</span> {
                              (selectedPatient.weight && selectedPatient.height) 
                                ? (selectedPatient.weight / Math.pow(selectedPatient.height / 100, 2)).toFixed(1) 
                                : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card">
                      <h4 className="font-bold text-brand-primary mb-4">Immunization Record</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPatient.immunizationRecord || 'No records provided'}</p>
                    </div>
                    <div className="card">
                      <h4 className="font-bold text-brand-primary mb-4">Family Medical History</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPatient.familyHistory || 'No records provided'}</p>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-bold text-brand-primary mb-4">Healthcare Insurance</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPatient.insuranceRecord || 'No records provided'}</p>
                  </div>

                  <div className="card">
                    <h4 className="font-bold text-brand-primary mb-4">Patient Bio</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPatient.bio || 'No bio provided'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalNotesPage;
