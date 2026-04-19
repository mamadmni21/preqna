import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ConsultationMessage } from '../types';
import { useTranslation } from 'react-i18next';
import { Send, Mic, StopCircle, User, MessageSquare, ChevronLeft } from 'lucide-react';
import { transcribeSimpleAudio } from '../services/qwenService';
import { toast } from 'sonner';

const ConsultationPage = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If patient, consultationId is patientId_doctorId
  // If doctor, we need to select a patient first
  const consultationId = profile.role === 'patient' 
    ? `${profile.uid}_${profile.primaryDoctorId}`
    : selectedPatient ? `${selectedPatient.uid}_${profile.uid}` : null;

  useEffect(() => {
    if (profile.role === 'doctor') {
      const q = query(collection(db, 'users'), where('primaryDoctorId', '==', profile.uid));
      return onSnapshot(q, (snapshot) => {
        setPatients(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      });
    }
  }, [profile]);

  useEffect(() => {
    if (consultationId) {
      const q = query(
        collection(db, 'consultations', consultationId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsultationMessage)));
      }, (error) => {
        console.error("Consultation messages error:", error);
        toast.error(t('errorLoadingChat'));
      });
    } else {
      setMessages([]);
    }
  }, [consultationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string, type: 'text' | 'audio' = 'text') => {
    if (!text.trim() || !consultationId) return;

    const receiverId = profile.role === 'patient' ? profile.primaryDoctorId : selectedPatient?.uid;
    if (!receiverId) return;

    try {
      await addDoc(collection(db, 'consultations', consultationId, 'messages'), {
        consultationId,
        senderId: profile.uid,
        senderName: profile.displayName,
        receiverId,
        text,
        type,
        createdAt: new Date().toISOString()
      });
      setInputText('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const transcription = await transcribeSimpleAudio(base64, 'audio/webm');
            if (transcription) {
              sendMessage(transcription, 'audio');
            } else {
              toast.error(t('errorTranscription'));
            }
          };
        } catch (error) {
          toast.error(t('errorTranscription'));
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      toast.error(t('errorMicAccess'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (profile.role === 'doctor' && !selectedPatient) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('patientConsultations')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.length === 0 ? (
            <div className="card text-center py-12 col-span-2">
              <User className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-500">{t('noPatients')}</p>
            </div>
          ) : (
            patients.map(p => (
              <button 
                key={p.uid} 
                onClick={() => setSelectedPatient(p)}
                className="card flex items-center gap-4 p-4 hover:border-brand-primary transition-all text-left group"
              >
                <img 
                  src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} 
                  alt={p.displayName} 
                  className="w-12 h-12 rounded-full border-2 border-brand-primary/20 group-hover:border-brand-primary transition-colors"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{p.displayName}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
                <MessageSquare className="text-slate-300 group-hover:text-brand-primary transition-colors" size={20} />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (profile.role === 'patient' && !profile.primaryDoctorId) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto text-center">
        <div className="card py-12">
          <User className="mx-auto text-slate-200 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('noPrimaryDoctor')}</h2>
          <p className="text-slate-500 mb-6">{t('selectDoctorPrompt')}</p>
          <button onClick={() => window.location.href = '/profile'} className="btn-primary">{t('goToProfile')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-brand-bg">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {profile.role === 'doctor' && (
            <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <img 
              src={profile.role === 'patient' ? `https://ui-avatars.com/api/?name=${profile.primaryDoctorName}` : (selectedPatient?.photoURL || `https://ui-avatars.com/api/?name=${selectedPatient?.displayName}`)} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-brand-primary/20"
            />
            <div>
              <p className="font-bold text-slate-900">
                {profile.role === 'patient' ? `Dr. ${profile.primaryDoctorName}` : selectedPatient?.displayName}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{t('onlineConsultation')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 text-sm italic">{t('startConsultationPrompt')}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === profile.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                isMe ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'
              }`}>
                {msg.type === 'audio' && (
                  <div className="flex items-center gap-2 mb-1 opacity-80">
                    <Mic size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{t('voiceNoteTranscribed')}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className={`text-[10px] mt-2 font-medium flex items-center gap-1 ${isMe ? 'text-brand-bg/60' : 'text-slate-400'}`}>
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-100 p-4 md:p-6">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="flex items-center gap-3 max-w-4xl mx-auto"
        >
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('typeMessage')}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary pr-14 transition-all"
            />
            <button 
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${
                isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 'text-slate-400 hover:text-brand-primary hover:bg-brand-bg'
              }`}
            >
              {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          </div>
          <button 
            type="submit" 
            disabled={!inputText.trim() || transcribing}
            className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {transcribing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
          </button>
        </form>
        {isRecording && (
          <p className="text-center text-[10px] text-red-500 font-bold mt-3 animate-pulse uppercase tracking-widest">{t('recordingPrompt')}</p>
        )}
      </div>
    </div>
  );
};

export default ConsultationPage;
