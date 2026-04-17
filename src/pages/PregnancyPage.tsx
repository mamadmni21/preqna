import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, PregnancySession, PregnancyRecord, PreviousPregnancy, PreviousPregnancyMedicalRecord } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Baby, Plus, Calendar, Clock, Activity, ChevronRight, Save, X, ClipboardList, History, Syringe, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Loading = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

const PregnancyPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  
  // Current Pregnancy States
  const [sessions, setSessions] = useState<PregnancySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PregnancySession | null>(null);
  const [records, setRecords] = useState<PregnancyRecord[]>([]);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showNewRecordForm, setShowNewRecordForm] = useState(false);

  // Previous Pregnancy States
  const [previousPregnancies, setPreviousPregnancies] = useState<PreviousPregnancy[]>([]);
  const [selectedPreviousPregnancy, setSelectedPreviousPregnancy] = useState<PreviousPregnancy | null>(null);
  const [previousRecords, setPreviousRecords] = useState<PreviousPregnancyMedicalRecord[]>([]);
  const [showNewPreviousForm, setShowNewPreviousForm] = useState(false);
  const [showNewPreviousRecordForm, setShowNewPreviousRecordForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<UserProfile[]>([]);

  // Form states
  const [lmp, setLmp] = useState('');
  const [edd, setEdd] = useState('');
  const [targetPatientId, setTargetPatientId] = useState(profile.role === 'patient' ? profile.uid : '');

  const [recordData, setRecordData] = useState({
    weight: '',
    bloodPressure: '',
    fundalHeight: '',
    fetalHeartRate: '',
    notes: '',
    medicalAdvice: ''
  });

  const [previousData, setPreviousData] = useState({
    year: '',
    outcome: 'healthy' as PreviousPregnancy['outcome'],
    gestationWeeks: '',
    deliveryType: '',
    complications: '',
    notes: ''
  });

  const [prevRecordData, setPrevRecordData] = useState({
    type: 'immunization' as PreviousPregnancyMedicalRecord['type'],
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const isStaff = ['doctor', 'nurse', 'admin'].includes(profile.role);

  useEffect(() => {
    let q;
    if (profile.role === 'patient') {
      q = query(collection(db, 'pregnancySessions'), where('patientId', '==', profile.uid), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'pregnancySessions'), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PregnancySession)));
    });
  }, [profile]);

  useEffect(() => {
    if (isStaff) {
      const q = query(collection(db, 'users'), where('role', '==', 'patient'));
      return onSnapshot(q, (snapshot) => {
        setPatients(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      });
    }
  }, [isStaff]);

  useEffect(() => {
    if (!selectedSession) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(db, 'pregnancyRecords'),
      where('sessionId', '==', selectedSession.id),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PregnancyRecord)));
    });
  }, [selectedSession]);

  useEffect(() => {
    let q;
    if (profile.role === 'patient') {
      q = query(collection(db, 'previousPregnancies'), where('patientId', '==', profile.uid), orderBy('year', 'desc'));
    } else {
      q = query(collection(db, 'previousPregnancies'), orderBy('year', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      setPreviousPregnancies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreviousPregnancy)));
    });
  }, [profile]);

  useEffect(() => {
    if (!selectedPreviousPregnancy) {
      setPreviousRecords([]);
      return;
    }

    const q = query(
      collection(db, 'previousPregnancyRecords'),
      where('previousPregnancyId', '==', selectedPreviousPregnancy.id),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setPreviousRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreviousPregnancyMedicalRecord)));
    });
  }, [selectedPreviousPregnancy]);

  const calculateEDD = (lmpDate: string) => {
    if (!lmpDate) return '';
    const date = new Date(lmpDate);
    date.setDate(date.getDate() + 280); // Standard 280 days
    return date.toISOString().split('T')[0];
  };

  const handleLmpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLmp(val);
    setEdd(calculateEDD(val));
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const patient = profile.role === 'patient' ? profile : patients.find(p => p.uid === targetPatientId);
      if (!patient) throw new Error('Patient not found');

      const sessionData: Omit<PregnancySession, 'id'> = {
        patientId: patient.uid,
        patientName: patient.displayName,
        lmp,
        edd,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'pregnancySessions'), sessionData);
      toast.success('Pregnancy session registered successfully');
      setShowNewSessionForm(false);
      setLmp('');
      setEdd('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setLoading(true);
    try {
      const record: Omit<PregnancyRecord, 'id'> = {
        sessionId: selectedSession.id,
        patientId: selectedSession.patientId,
        doctorId: profile.uid,
        doctorName: profile.displayName,
        date: new Date().toISOString().split('T')[0],
        weight: recordData.weight ? Number(recordData.weight) : null,
        bloodPressure: recordData.bloodPressure,
        fundalHeight: recordData.fundalHeight ? Number(recordData.fundalHeight) : null,
        fetalHeartRate: recordData.fetalHeartRate ? Number(recordData.fetalHeartRate) : null,
        notes: recordData.notes,
        medicalAdvice: recordData.medicalAdvice,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'pregnancyRecords'), record);
      toast.success('Medical record added successfully');
      setShowNewRecordForm(false);
      setRecordData({
        weight: '',
        bloodPressure: '',
        fundalHeight: '',
        fetalHeartRate: '',
        notes: '',
        medicalAdvice: ''
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrevious = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const patient = profile.role === 'patient' ? profile : patients.find(p => p.uid === targetPatientId);
      if (!patient) throw new Error('Patient not found');

      const data: Omit<PreviousPregnancy, 'id'> = {
        patientId: patient.uid,
        year: previousData.year,
        outcome: previousData.outcome,
        gestationWeeks: previousData.gestationWeeks ? Number(previousData.gestationWeeks) : null,
        deliveryType: previousData.deliveryType,
        complications: previousData.complications,
        notes: previousData.notes,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'previousPregnancies'), data);
      toast.success('Previous pregnancy record added');
      setShowNewPreviousForm(false);
      setPreviousData({
        year: '',
        outcome: 'healthy',
        gestationWeeks: '',
        deliveryType: '',
        complications: '',
        notes: ''
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreviousRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreviousPregnancy) return;
    setLoading(true);
    try {
      const record: Omit<PreviousPregnancyMedicalRecord, 'id'> = {
        previousPregnancyId: selectedPreviousPregnancy.id,
        patientId: selectedPreviousPregnancy.patientId,
        type: prevRecordData.type,
        description: prevRecordData.description,
        date: prevRecordData.date,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'previousPregnancyRecords'), record);
      toast.success('Medical record added successfully');
      setShowNewPreviousRecordForm(false);
      setPrevRecordData({
        type: 'immunization',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Baby className="text-brand-primary" size={32} />
            Pregnancy Management
          </h1>
          <p className="text-slate-500 mt-1">Track and manage pregnancy sessions and medical records.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'current' ? (
            <button 
              onClick={() => setShowNewSessionForm(true)}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Plus size={20} /> Register Pregnancy
            </button>
          ) : (
            <button 
              onClick={() => setShowNewPreviousForm(true)}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Plus size={20} /> Add Previous Pregnancy
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'current' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Current Pregnancy
        </button>
        <button
          onClick={() => setActiveTab('previous')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'previous' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Obstetric History (Previous)
        </button>
      </div>

      {activeTab === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-brand-primary" />
              Pregnancy Sessions
            </h3>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="card text-center py-12">
                  <Baby className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-500">No sessions found</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full card text-left transition-all hover:border-brand-primary ${
                      selectedSession?.id === session.id ? 'ring-2 ring-brand-primary border-transparent' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        session.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {session.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="font-bold text-slate-900">{session.patientName}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} /> LMP: {session.lmp}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} /> EDD: {session.edd}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Session Details & Records */}
          <div className="lg:col-span-2">
            {!selectedSession ? (
              <div className="card h-full flex flex-col items-center justify-center text-center py-20">
                <ClipboardList size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-500">Select a pregnancy session to view details and medical records</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card bg-brand-bg/30 border-brand-primary/20">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedSession.patientName}</h3>
                      <p className="text-slate-500">Pregnancy Tracking Session</p>
                    </div>
                    {isStaff && (
                      <button 
                        onClick={() => setShowNewRecordForm(true)}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <Plus size={18} /> Add Medical Record
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">LMP</p>
                      <p className="font-bold text-slate-900">{selectedSession.lmp}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">EDD</p>
                      <p className="font-bold text-brand-primary">{selectedSession.edd}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                      <p className="font-bold text-slate-900 capitalize">{selectedSession.status}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Gestation</p>
                      <p className="font-bold text-slate-900">
                        {Math.floor((new Date().getTime() - new Date(selectedSession.lmp).getTime()) / (1000 * 60 * 60 * 24 * 7))} Weeks
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={24} className="text-brand-primary" />
                    Medical Records History
                  </h3>
                  {records.length === 0 ? (
                    <div className="card text-center py-12">
                      <p className="text-slate-500 italic">No medical records added yet for this session.</p>
                    </div>
                  ) : (
                    records.map((record) => (
                      <div key={record.id} className="card p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-lg text-slate-900">{new Date(record.date).toLocaleDateString()}</p>
                            <p className="text-xs text-slate-500">Recorded by Dr. {record.doctorName}</p>
                          </div>
                          <div className="flex gap-2">
                            {record.weight && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">{record.weight} kg</span>}
                            {record.bloodPressure && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">{record.bloodPressure} mmHg</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Clinical Findings</h4>
                            <div className="space-y-2">
                              {record.fundalHeight && <p className="text-sm"><span className="text-slate-500">Fundal Height:</span> {record.fundalHeight} cm</p>}
                              {record.fetalHeartRate && <p className="text-sm"><span className="text-slate-500">Fetal Heart Rate:</span> {record.fetalHeartRate} bpm</p>}
                              <p className="text-sm text-slate-700 mt-2">{record.notes}</p>
                            </div>
                          </div>
                          <div className="bg-brand-bg/20 p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-brand-primary uppercase mb-2">Medical Advice</h4>
                            <p className="text-sm text-slate-800 italic">"{record.medicalAdvice || 'No specific advice recorded.'}"</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Previous Pregnancies List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History size={20} className="text-brand-primary" />
              Obstetric History
            </h3>
            <div className="space-y-3">
              {previousPregnancies.length === 0 ? (
                <div className="card text-center py-12">
                  <History className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-500">No previous records found</p>
                </div>
              ) : (
                previousPregnancies.map((prev) => (
                  <button
                    key={prev.id}
                    onClick={() => setSelectedPreviousPregnancy(prev)}
                    className={`w-full card text-left transition-all hover:border-brand-primary ${
                      selectedPreviousPregnancy?.id === prev.id ? 'ring-2 ring-brand-primary border-transparent' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        prev.outcome === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {prev.outcome}
                      </span>
                      <span className="text-[10px] text-slate-400">{prev.year}</span>
                    </div>
                    <p className="font-bold text-slate-900">
                      {prev.deliveryType || 'Outcome: ' + prev.outcome}
                    </p>
                    <div className="mt-2 space-y-1">
                      {prev.gestationWeeks && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {prev.gestationWeeks} Weeks
                        </p>
                      )}
                      {prev.complications && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <Activity size={12} /> {prev.complications}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Previous Pregnancy Details & Records */}
          <div className="lg:col-span-2">
            {!selectedPreviousPregnancy ? (
              <div className="card h-full flex flex-col items-center justify-center text-center py-20">
                <ClipboardList size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-500">Select a previous pregnancy to view medical records</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card bg-brand-bg/30 border-brand-primary/20">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Year: {selectedPreviousPregnancy.year}</h3>
                      <p className="text-slate-500 capitalize">Outcome: {selectedPreviousPregnancy.outcome}</p>
                    </div>
                    {isStaff && (
                      <button 
                        onClick={() => setShowNewPreviousRecordForm(true)}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <Plus size={18} /> Add Medical Record
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Delivery Type</p>
                      <p className="font-bold text-slate-900">{selectedPreviousPregnancy.deliveryType || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Gestation</p>
                      <p className="font-bold text-slate-900">{selectedPreviousPregnancy.gestationWeeks || 'N/A'} Weeks</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Complications</p>
                      <p className="font-bold text-slate-900">{selectedPreviousPregnancy.complications || 'None'}</p>
                    </div>
                  </div>
                  {selectedPreviousPregnancy.notes && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{selectedPreviousPregnancy.notes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={24} className="text-brand-primary" />
                    Historical Medical Records
                  </h3>
                  {previousRecords.length === 0 ? (
                    <div className="card text-center py-12">
                      <p className="text-slate-500 italic">No medical records (immunizations/medicines) found for this pregnancy.</p>
                    </div>
                  ) : (
                    previousRecords.map((record) => (
                      <div key={record.id} className="card p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              record.type === 'immunization' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {record.type === 'immunization' ? <Syringe size={20} /> : <Pill size={20} />}
                            </div>
                            <div>
                              <p className="font-bold text-lg text-slate-900 capitalize">{record.type}</p>
                              <p className="text-xs text-slate-500">{new Date(record.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl">
                          <p className="text-sm text-slate-700">{record.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Session Modal */}
      <AnimatePresence>
        {showNewSessionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Register Pregnancy</h3>
                <button onClick={() => setShowNewSessionForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateSession} className="space-y-4">
                {isStaff && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                    <select 
                      value={targetPatientId}
                      onChange={(e) => setTargetPatientId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    >
                      <option value="">Choose a patient...</option>
                      {patients.map(p => (
                        <option key={p.uid} value={p.uid}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Menstrual Period (LMP)</label>
                  <input 
                    type="date" 
                    value={lmp}
                    onChange={handleLmpChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Delivery Date (EDD)</label>
                  <input 
                    type="date" 
                    value={edd}
                    onChange={(e) => setEdd(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary bg-slate-50"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">Automatically calculated based on LMP (280 days)</p>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                  {loading ? <Loading /> : 'Register Session'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Previous Pregnancy Modal */}
      <AnimatePresence>
        {showNewPreviousForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Add Previous Pregnancy</h3>
                <button onClick={() => setShowNewPreviousForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreatePrevious} className="space-y-4">
                {isStaff && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                    <select 
                      value={targetPatientId}
                      onChange={(e) => setTargetPatientId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    >
                      <option value="">Choose a patient...</option>
                      {patients.map(p => (
                        <option key={p.uid} value={p.uid}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                    <input 
                      type="text" 
                      value={previousData.year}
                      onChange={(e) => setPreviousData({...previousData, year: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder="e.g. 2022"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Outcome</label>
                    <select 
                      value={previousData.outcome}
                      onChange={(e) => setPreviousData({...previousData, outcome: e.target.value as any})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    >
                      <option value="healthy">Healthy</option>
                      <option value="abortion">Abortion</option>
                      <option value="stillbirth">Stillbirth</option>
                      <option value="miscarriage">Miscarriage</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gestation (Weeks)</label>
                  <input 
                    type="number" 
                    value={previousData.gestationWeeks}
                    onChange={(e) => setPreviousData({...previousData, gestationWeeks: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. 39"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Type</label>
                  <input 
                    type="text" 
                    value={previousData.deliveryType}
                    onChange={(e) => setPreviousData({...previousData, deliveryType: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Normal, C-Section"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Complications</label>
                  <input 
                    type="text" 
                    value={previousData.complications}
                    onChange={(e) => setPreviousData({...previousData, complications: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="e.g. Preeclampsia, None"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea 
                    value={previousData.notes}
                    onChange={(e) => setPreviousData({...previousData, notes: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                  {loading ? <Loading /> : 'Save Record'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Previous Record Modal */}
      <AnimatePresence>
        {showNewPreviousRecordForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Add Medical Record</h3>
                <button onClick={() => setShowNewPreviousRecordForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreatePreviousRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Record Type</label>
                  <select 
                    value={prevRecordData.type}
                    onChange={(e) => setPrevRecordData({...prevRecordData, type: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  >
                    <option value="immunization">Immunization</option>
                    <option value="medicine">Medicine</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    value={prevRecordData.date}
                    onChange={(e) => setPrevRecordData({...prevRecordData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea 
                    value={prevRecordData.description}
                    onChange={(e) => setPrevRecordData({...prevRecordData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-32"
                    placeholder="e.g. Tetanus Toxoid injection, Folic Acid 400mcg daily"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                  {loading ? <Loading /> : 'Save Record'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Record Modal */}
      <AnimatePresence>
        {showNewRecordForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Add Medical Record</h3>
                <button onClick={() => setShowNewRecordForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateRecord} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={recordData.weight}
                      onChange={(e) => setRecordData({...recordData, weight: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Blood Pressure (mmHg)</label>
                    <input 
                      type="text" 
                      value={recordData.bloodPressure}
                      onChange={(e) => setRecordData({...recordData, bloodPressure: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder="e.g. 120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fundal Height (cm)</label>
                    <input 
                      type="number" 
                      value={recordData.fundalHeight}
                      onChange={(e) => setRecordData({...recordData, fundalHeight: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fetal Heart Rate (bpm)</label>
                    <input 
                      type="number" 
                      value={recordData.fetalHeartRate}
                      onChange={(e) => setRecordData({...recordData, fetalHeartRate: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Clinical Notes</label>
                  <textarea 
                    value={recordData.notes}
                    onChange={(e) => setRecordData({...recordData, notes: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Medical Advice</label>
                  <textarea 
                    value={recordData.medicalAdvice}
                    onChange={(e) => setRecordData({...recordData, medicalAdvice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-24"
                    placeholder="Advice for the patient..."
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                  {loading ? <Loading /> : 'Save Medical Record'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PregnancyPage;
