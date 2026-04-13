import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, ChevronLeft, MessageSquare, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const AppointmentDetailsPage = ({ profile }: { profile: UserProfile }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const isStaff = ['doctor', 'nurse', 'admin'].includes(profile.role);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'appointments', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Appointment;
        setAppointment(data);
        setFeedback(data.feedback || '');
        setDoctorNotes(data.doctorNotes || '');
      } else {
        toast.error('Appointment not found');
        navigate('/');
      }
      setLoading(false);
    });
    return unsub;
  }, [id, navigate]);

  const handleUpdateStatus = async (status: Appointment['status']) => {
    if (!appointment) return;
    setUpdating(true);
    try {
      const updateData: any = { status };
      if (status === 'accepted') {
        updateData.approvedBy = profile.uid;
        updateData.approvedByName = profile.displayName;
      }
      await updateDoc(doc(db, 'appointments', appointment.id), updateData);
      toast.success(`Appointment ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!appointment) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'appointments', appointment.id), {
        feedback,
        doctorNotes
      });
      toast.success('Notes updated successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-6"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointment Details</h1>
          <p className="text-slate-500 mt-1">Reference ID: {appointment.id}</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
          appointment.status === 'accepted' ? 'bg-green-100 text-green-600' :
          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
          appointment.status === 'completed' ? 'bg-blue-100 text-blue-600' :
          'bg-red-100 text-red-600'
        }`}>
          {appointment.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-brand-primary" />
              Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar size={18} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Date</p>
                    <p className="font-medium">{appointment.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={18} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Time</p>
                    <p className="font-medium">{appointment.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <ShieldCheck size={18} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Type</p>
                    <p className="font-medium capitalize">{appointment.type}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <User size={18} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Doctor/Service</p>
                    <p className="font-medium">{appointment.doctorName}</p>
                  </div>
                </div>
                {appointment.labService && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Activity size={18} className="text-brand-primary" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Lab Service</p>
                      <p className="font-medium">{appointment.labService}</p>
                    </div>
                  </div>
                )}
                {appointment.queueNumber && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-[18px] h-[18px] flex items-center justify-center font-bold text-[10px] bg-brand-primary text-white rounded-full">#</div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Queue Number</p>
                      <p className="font-bold text-brand-primary">{appointment.queueNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase font-bold mb-2">Reason for Visit</p>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl italic">"{appointment.reason || 'No reason provided.'}"</p>
            </div>
          </section>

          <section className="card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-brand-primary" />
              Doctor's Feedback & Notes
            </h3>
            {isStaff ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Feedback for Patient</label>
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-32"
                    placeholder="General feedback visible to the patient..."
                  />
                </div>
                {profile.role === 'doctor' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Internal Doctor Notes</label>
                    <textarea 
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary h-32"
                      placeholder="Private clinical notes..."
                    />
                  </div>
                )}
                <button 
                  onClick={handleSaveNotes}
                  disabled={updating}
                  className="btn-primary w-full py-3"
                >
                  {updating ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-brand-bg/20 p-6 rounded-2xl">
                  <p className="text-xs text-brand-primary uppercase font-bold mb-2">Feedback</p>
                  <p className="text-slate-800 italic">
                    {appointment.feedback || 'No feedback provided yet. Please wait for the doctor to review your appointment.'}
                  </p>
                </div>
                {appointment.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                    <CheckCircle size={18} />
                    Appointment completed and reviewed.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {isStaff && appointment.status === 'pending' && (
            <section className="card border-brand-primary/20 bg-brand-bg/10">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleUpdateStatus('accepted')}
                  disabled={updating}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle size={20} />
                  Approve Request
                </button>
                <button 
                  onClick={() => handleUpdateStatus('declined')}
                  disabled={updating}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <XCircle size={20} />
                  Decline Request
                </button>
              </div>
              {appointment.type === 'lab' && (
                <p className="text-[10px] text-slate-500 mt-4 text-center italic">
                  As a staff member, you can approve this medical check-up/lab request.
                </p>
              )}
            </section>
          )}

          {isStaff && appointment.status === 'accepted' && (
            <section className="card">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Status Update</h3>
              <button 
                onClick={() => handleUpdateStatus('completed')}
                disabled={updating}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle size={20} />
                Mark as Completed
              </button>
            </section>
          )}

          <section className="card">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Info</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900">{appointment.patientName}</p>
                <p className="text-xs text-slate-500">Patient ID: {appointment.patientId.slice(0, 8)}</p>
              </div>
            </div>
            {appointment.approvedByName && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Approved By</p>
                <p className="text-sm font-medium text-slate-700">{appointment.approvedByName}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;
