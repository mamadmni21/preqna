import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Appointment } from '../types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Check, Users, Settings, LogOut, ExternalLink, ShieldCheck, Baby } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AdminDashboard = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({ totalApts: 0, totalUsers: 0, pendingApts: 0 });

  useEffect(() => {
    const aptsQ = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    const usersQ = query(collection(db, 'users'));

    const unsubApts = onSnapshot(aptsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data);
      setStats(prev => ({ 
        ...prev, 
        totalApts: data.length,
        pendingApts: data.filter(a => a.status === 'pending').length 
      }));
    });

    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setUsers(data);
      setStats(prev => ({ ...prev, totalUsers: data.length }));
    });

    return () => {
      unsubApts();
      unsubUsers();
    };
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t('welcome')}, Admin {profile.displayName}!</h1>
        <p className="text-slate-500 mt-1">System-wide clinical data management.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-brand-primary to-indigo-400 text-white border-none">
          <p className="text-brand-bg/80 font-medium uppercase tracking-wider text-xs">Total Appointments</p>
          <h2 className="text-4xl font-bold mt-2">{stats.totalApts}</h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-brand-bg/90">
            <Clock size={16} />
            <span>{stats.pendingApts} {t('pending')}</span>
          </div>
        </div>
        <div className="card">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-xs">Total Users</p>
          <h2 className="text-4xl font-bold mt-2 text-slate-900">{stats.totalUsers}</h2>
          <p className="mt-4 text-sm text-brand-primary flex items-center gap-1">
            <Users size={16} />
            <span>Active accounts</span>
          </p>
        </div>
        <div className="card">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-xs">System Status</p>
          <h2 className="text-2xl font-bold mt-2 text-green-500 flex items-center gap-2">
            <ShieldCheck size={24} />
            Operational
          </h2>
          <p className="mt-4 text-sm text-slate-500">All services running</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">System Appointments</h3>
            <Link to="/history" className="text-brand-primary text-sm font-semibold hover:underline">Manage all</Link>
          </div>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="card text-center py-12">
                <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500">No system appointments</p>
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
                        <p className="font-bold text-slate-900">{apt.patientName} → {apt.doctorName}</p>
                        {apt.queueNumber && (
                          <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            Queue #{apt.queueNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{apt.date} at {apt.time}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                        {apt.type} {apt.labService ? `- ${apt.labService}` : ''}
                      </p>
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
          <h3 className="text-xl font-bold text-slate-900 mb-4">Admin Menu</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/pregnancy" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Baby size={24} />
              </div>
              <span className="font-bold text-slate-700">Pregnancy Data</span>
            </Link>
            <Link to="/history" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Settings size={24} />
              </div>
              <span className="font-bold text-slate-700">Manage Data</span>
            </Link>
            <Link to="/integrations" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <ExternalLink size={24} />
              </div>
              <span className="font-bold text-slate-700">{t('integrations')}</span>
            </Link>
            <Link to="/profile" className="card hover:border-brand-primary transition-colors flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary">
                <Users size={24} />
              </div>
              <span className="font-bold text-slate-700">User Profiles</span>
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

export default AdminDashboard;
