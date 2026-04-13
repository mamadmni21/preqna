import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const NutritionPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'nutrition'),
      where('patientId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [profile]);

  const handleAddIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(collection(db, 'nutrition')), {
        patientId: profile.uid,
        foodName: food,
        calories: Number(calories),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
      setFood(''); setCalories('');
      toast.success('Food intake recorded');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('nutrition')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card sticky top-24">
            <h3 className="text-lg font-bold mb-4">Record Intake</h3>
            <form onSubmit={handleAddIntake} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Food Name</label>
                <input 
                  type="text" 
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. Avocado Toast"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Calories (kcal)</label>
                <input 
                  type="number" 
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. 350"
                  required
                />
              </div>
              <button type="submit" className="w-full btn-primary py-3">
                Add Record
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Recent History</h3>
            <div className="space-y-4">
              {records.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No records yet today.</p>
              ) : (
                records.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900">{rec.foodName}</p>
                      <p className="text-xs text-slate-500">{new Date(rec.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-primary">{rec.calories} kcal</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionPage;
