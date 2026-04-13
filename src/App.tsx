import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Calendar, Utensils, User, LogOut, 
  Globe, Activity, Clock, ArrowLeft
} from 'lucide-react';
import { Toaster } from 'sonner';
import './lib/i18n';
import { UserProfile, Role } from './types';

// Pages
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingPage from './pages/BookingPage';
import NutritionPage from './pages/NutritionPage';
import HistoryPage from './pages/HistoryPage';
import ClinicalNotesPage from './pages/ClinicalNotesPage';
import ProfilePage from './pages/ProfilePage';
import IntegrationsPage from './pages/IntegrationsPage';
import PregnancyPage from './pages/PregnancyPage';
import AppointmentDetailsPage from './pages/AppointmentDetailsPage';
import PatientDetailsPage from './pages/PatientDetailsPage';

// --- Components ---

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen bg-brand-bg">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full"
    />
  </div>
);

const Navbar = ({ user, profile }: { user: any, profile: UserProfile | null }) => {
  const { t, i18n } = useTranslation();
  const [showLang, setShowLang] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const languages = [
    { code: 'en', name: t('english') },
    { code: 'id', name: t('indonesia') },
    { code: 'ms', name: t('malaysia') },
    { code: 'ar', name: t('arabic') },
    { code: 'vi', name: t('vietnamese') },
  ];

  const isHome = location.pathname === '/';

  return (
    <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {!isHome && (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white">
            <Activity size={24} />
          </div>
          <span className="text-xl font-bold text-brand-primary">LapaqPregna</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-2 text-slate-600 hover:text-brand-primary transition-colors"
          >
            <Globe size={20} />
            <span className="uppercase font-medium">{i18n.language}</span>
          </button>
          <AnimatePresence>
            {showLang && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50"
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      setShowLang(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-brand-bg transition-colors text-slate-700"
                  >
                    {lang.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{profile?.displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{t(profile?.role || '')}</p>
            </div>
            <Link to="/profile">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-brand-primary/20"
              />
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const MobileTopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  if (location.pathname === '/login' || !auth.currentUser) return null;

  return (
    <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {!isHome ? (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white">
            <Activity size={18} />
          </div>
        )}
        <span className="font-bold text-brand-primary">LapaqPregna</span>
      </div>
    </div>
  );
};

const MobileNav = ({ role }: { role?: Role }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: t('home'), path: '/' },
    { icon: Calendar, label: t('booking'), path: '/booking' },
  ];

  if (role === 'patient') {
    navItems.push({ icon: Utensils, label: t('nutrition'), path: '/nutrition' });
  } else if (role === 'doctor') {
    navItems.push({ icon: Clock, label: t('schedule'), path: '/history' });
  }

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <item.icon size={24} />
          <span className="text-[10px] mt-1">{item.label}</span>
        </Link>
      ))}
      <button onClick={() => signOut(auth)} className="nav-item">
        <LogOut size={24} />
        <span className="text-[10px] mt-1">{t('logout')}</span>
      </button>
    </div>
  );
};

const DashboardWrapper = ({ profile }: { profile: UserProfile }) => {
  switch (profile.role) {
    case 'admin': return <AdminDashboard profile={profile} />;
    case 'doctor': return <DoctorDashboard profile={profile} />;
    case 'nurse': return <NurseDashboard profile={profile} />;
    case 'patient': return <PatientDashboard profile={profile} />;
    default: return <PatientDashboard profile={profile} />;
  }
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const docRef = doc(db, 'users', u.uid);
        unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile fetch error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        if (unsubProfile) unsubProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (loading) return <Loading />;

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-brand-bg">
        <Navbar user={user} profile={profile} />
        <MobileTopBar />
        
        <main className="pb-20 md:pb-0">
          <Routes>
            {!user || !profile ? (
              <Route path="*" element={<LoginPage user={user} profile={profile} />} />
            ) : (
              <>
                <Route path="/" element={profile ? <DashboardWrapper profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/booking" element={profile ? <BookingPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/nutrition" element={profile ? <NutritionPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/history" element={profile ? <HistoryPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/clinical-notes" element={profile ? <ClinicalNotesPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/pregnancy" element={profile ? <PregnancyPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/appointment/:id" element={profile ? <AppointmentDetailsPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/patient/:id" element={profile ? <PatientDetailsPage profile={profile} /> : <Navigate to="/login" />} />
                <Route path="/profile" element={profile ? <ProfilePage profile={profile} setProfile={setProfile} /> : <Navigate to="/login" />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>

        {user && <MobileNav role={profile?.role} />}
      </div>
    </Router>
  );
}
