import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Appointment } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const BookingPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'consultation' | 'lab'>('consultation');
  const [labService, setLabService] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const labServices = ['USG', 'Kemo', 'CTscan', 'Blood Test', 'Urine Test', 'Other'];

  const specialties = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)));

  const filteredDoctors = specialtyFilter 
    ? doctors.filter(d => d.specialization === specialtyFilter)
    : doctors;

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    return onSnapshot(q, (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const appointmentsRef = collection(db, 'appointments');
      let queueNumber = 1;

      if (type === 'consultation') {
        const q = query(
          appointmentsRef, 
          where('doctorId', '==', selectedDoctor),
          where('date', '==', date)
        );
        const querySnapshot = await getDocs(q);
        queueNumber = querySnapshot.size + 1;
      } else {
        const q = query(
          appointmentsRef,
          where('type', '==', 'lab'),
          where('date', '==', date)
        );
        const querySnapshot = await getDocs(q);
        queueNumber = querySnapshot.size + 1;
      }

      const doctor = doctors.find(d => d.id === selectedDoctor);
      const newAppointmentRef = doc(appointmentsRef);
      
      await setDoc(newAppointmentRef, {
        id: newAppointmentRef.id,
        patientId: profile.uid,
        patientName: profile.displayName,
        doctorId: type === 'consultation' ? selectedDoctor : null,
        doctorName: type === 'consultation' ? (doctor?.displayName || 'Unknown Doctor') : 'Medical Lab',
        date,
        time,
        reason,
        type,
        labService: type === 'lab' ? labService : null,
        status: 'pending',
        queueNumber,
        createdAt: new Date().toISOString(),
      });

      // Automatically assign primary doctor if not set
      if (type === 'consultation' && !profile.primaryDoctorId) {
        await setDoc(doc(db, 'users', profile.uid), {
          primaryDoctorId: selectedDoctor,
          primaryDoctorName: doctor?.displayName || ''
        }, { merge: true });
      }

      toast.success(`Booking confirmed! Your queue number is ${queueNumber}`);
      setDate(''); setTime(''); setReason(''); setSelectedDoctor(''); setLabService('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('booking')}</h1>
      <div className="card">
        <form onSubmit={handleBooking} className="space-y-6">
          <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('consultation')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                type === 'consultation' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'
              }`}
            >
              Consultation
            </button>
            <button
              type="button"
              onClick={() => setType('lab')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                type === 'lab' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'
              }`}
            >
              Medical Check-up / Lab
            </button>
          </div>

          {type === 'consultation' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Specialty</label>
                <select 
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(s => (
                    <option key={s as string} value={s as string}>{s as string}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Doctor</label>
                <select 
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                >
                  <option value="">Choose a doctor...</option>
                  {filteredDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.displayName} {doc.specialization ? `(${doc.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Lab Service</label>
              <select 
                value={labService}
                onChange={(e) => setLabService(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Choose a service...</option>
                {labServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
              <select 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                required
              >
                <option value="">Choose time...</option>
                {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => (
                  <React.Fragment key={hour}>
                    <option value={`${hour.toString().padStart(2, '0')}:00`}>{hour.toString().padStart(2, '0')}:00</option>
                    <option value={`${hour.toString().padStart(2, '0')}:30`}>{hour.toString().padStart(2, '0')}:30</option>
                  </React.Fragment>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Visit</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-32"
              placeholder="Briefly describe your symptoms or reason for visit..."
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Confirm Booking'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
