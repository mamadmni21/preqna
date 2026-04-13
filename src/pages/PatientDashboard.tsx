import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Appointment } from '../types';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Check, Plus, Utensils, ExternalLink, LogOut, Baby } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const PatientDashboard = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    const q = query(
      collection(db, 'appointments'),
      where('patientId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data);
      setStats({
        total: data.length,
        pending: data.filter((a) => a.status === 'pending').length,
        completed: data.filter((a) => a.status === 'completed').length
      });
    });
  }, [profile]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t('welcome')}, {profile.displayName}!</h1>
        <p className="text-slate-500 mt-1">Your pregnancy journey dashboard.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-brand-primary to-indigo-400 text-white border-none">
          <p className="text-brand-bg/80 font-medium uppercase tracking-wider text-xs">{t('appointments')}</p>
          <h2 className="text-4xl font-bold mt-2">{stats.total}</h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-brand-bg/90">
            <Clock size={16} />
            <span>{stats.pending} {t('pending')}</span>
          </div>
        </div>
        <div className="card">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-xs">{t('completed')}</p>
          <h2 className="text-4xl font-bold mt-2 text-slate-900">{stats.completed}</h2>
          <p className="mt-4 text-sm text-green-500 flex items-center gap-1">
            <Check size={16} />
            <span>Health records up to date</span>
          </p>
        </div>
        <div className="card">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-xs">Patient ID</p>
          <h2 className="text-xl font-bold mt-2 text-slate-900 truncate">{profile.uid.slice(0, 12)}...</h2>
          <p className="mt-4 text-sm text-slate-500">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">{t('appointments')}</h3>
            <Link to="/history" className="text-brand-primary text-sm font-semibold hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="card text-center py-12">
                <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500">No appointments found</p>
                <Link to="/booking" className="btn-primary mt-4 inline-block">Book Now</Link>
              </div>
            ) : (
              appointments.slice(0, 5).map((apt) => (
                <Link 
                  key={apt.id} 
                  to={`/appointment/${apt.id}`}
                  className="card flex items-center justify-between p-4 hover:border-brand-primary transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{apt.doctorName}</p>
                        {apt.queueNumber && (
                          <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            Queue #{apt.queueNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{apt.date} at {apt.time}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">{apt.type}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    apt.status === 'accepted' ? 'bg-green-100 text-green-600' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {t(apt.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Pregnancy Menu</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/pregnancy" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Baby size={24} />
              </div>
              <span className="font-bold text-slate-700">Pregnancy</span>
            </Link>
            <Link to="/booking" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Plus size={24} />
              </div>
              <span className="font-bold text-slate-700">{t('booking')}</span>
            </Link>
            <Link to="/nutrition" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Utensils size={24} />
              </div>
              <span className="font-bold text-slate-700">{t('nutrition')}</span>
            </Link>
            <Link to="/integrations" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <ExternalLink size={24} />
              </div>
              <span className="font-bold text-slate-700">{t('integrations')}</span>
            </Link>
            <button onClick={() => signOut(auth)} className="card hover:border-red-200 transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <LogOut size={24} />
              </div>
              <span className="font-bold text-slate-700">{t('logout')}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PatientDashboard;
