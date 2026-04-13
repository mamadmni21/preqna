import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Calendar, Clock, Check, X } from 'lucide-react';

const HistoryPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    let q;
    if (profile.role === 'patient') {
      q = query(collection(db, 'appointments'), where('patientId', '==', profile.uid), orderBy('createdAt', 'desc'));
    } else if (profile.role === 'doctor') {
      q = query(collection(db, 'appointments'), where('doctorId', '==', profile.uid), orderBy('createdAt', 'desc'));
    } else {
      // Admin and Nurse see all appointments
      q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    }
    
    return onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [profile]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await setDoc(doc(db, 'appointments', id), { status }, { merge: true });
      toast.success(`Appointment ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('history')}</h1>
      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="card text-center py-20">
            <Clock className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-500">No appointment history found.</p>
          </div>
        ) : (
          appointments.map((apt) => (
            <div key={apt.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand-bg rounded-2xl flex items-center justify-center text-brand-primary">
                    <Calendar size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900">{profile.role === 'patient' ? apt.doctorName : apt.patientName}</h3>
                      {apt.queueNumber && (
                        <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Queue #{apt.queueNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500">{apt.date} at {apt.time}</p>
                    {apt.reason && <p className="text-sm text-slate-400 mt-1 italic">"{apt.reason}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${
                    apt.status === 'accepted' ? 'bg-green-100 text-green-600' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {t(apt.status)}
                  </span>
                  {profile.role !== 'patient' && apt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(apt.id, 'accepted')}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(apt.id, 'declined')}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
