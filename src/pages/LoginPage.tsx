import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Role } from '../types';

const LoginPage = ({ user, profile }: { user?: any, profile?: any }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('patient');
  const [completing, setCompleting] = useState(false);

  const handleCompleteProfile = async () => {
    if (!user) return;
    setCompleting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || name || 'User',
        role: role,
        createdAt: new Date().toISOString(),
      });
      toast.success('Profile created');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: role,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email,
          displayName: name,
          role,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success(isLogin ? 'Logged in' : 'Account created');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-primary/20">
              <Activity size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t('completeProfile')}</h1>
            <p className="text-slate-500 mt-2">{t('selectRoleContinue')}</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('role')}</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              >
                <option value="patient">{t('patient')}</option>
                <option value="doctor">{t('doctor')}</option>
                <option value="nurse">{t('nurse')}</option>
                <option value="admin">{t('admin')}</option>
              </select>
            </div>

            {!user.displayName && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            )}

            <button 
              onClick={handleCompleteProfile} 
              disabled={completing}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {completing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('completeProfile')}
            </button>
            
            <button onClick={() => signOut(auth)} className="w-full text-slate-400 text-sm hover:text-slate-600">
              {t('signOut')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-primary/20">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">LapaqPregna</h1>
          <p className="text-slate-500 mt-2">{isLogin ? t('loginWelcome') : t('joinCommunity')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('role')}</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
            >
              <option value="patient">{t('patient')}</option>
              <option value="doctor">{t('doctor')}</option>
              <option value="nurse">{t('nurse')}</option>
              <option value="admin">{t('admin')}</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Note: Role selection is only required for new accounts.</p>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('emailAddress')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <button type="submit" className="w-full btn-primary py-3 mt-2">
            {isLogin ? t('signIn') : t('createAccount')}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">{t('orContinueWith')}</span></div>
        </div>

        <p className="text-center text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">{t('selectRole')}</p>
        <button 
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-medium text-slate-700"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="text-center mt-8 text-slate-600">
          {isLogin ? t('noAccount') : t('alreadyHaveAccount')}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-brand-primary font-semibold hover:underline"
          >
            {isLogin ? t('signUp') : t('signIn')}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
