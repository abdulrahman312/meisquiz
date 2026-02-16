
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { Question, QuizUser, Quiz, QuizAttempt } from '../types';
import { CheckCircle, XCircle, LogOut, ChevronDown, ChevronUp, Trophy, ArrowLeft, ArrowRight, PlayCircle, Clock, Award, Circle, Save, HelpCircle, AlertCircle } from 'lucide-react';
import { Footer } from './Footer';

export const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, formatNumber, isRTL } = useLanguage();
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [userData, setUserData] = useState<QuizUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubQuizzes = db.collection('quizzes').where('isActive', '==', true).onSnapshot(snap => {
      setActiveQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)));
    });
    const unsubUser = db.collection('users').doc(user.uid).onSnapshot(doc => {
      if (doc.exists) setUserData({ id: doc.id, ...doc.data() } as QuizUser);
    });
    return () => { unsubQuizzes(); unsubUser(); };
  }, [user]);

  useEffect(() => {
    if (!selectedQuiz) return;
    setLoadingQuiz(true);
    const unsub = db.collection('quizzes').doc(selectedQuiz.id).collection('questions').orderBy('order').onSnapshot(snap => {
      setCurrentQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
      setLoadingQuiz(false);
    });
    return () => unsub();
  }, [selectedQuiz]);

  const getParticipation = (quizId: string) => userData?.participations?.[quizId];

  const handleAnswer = async (questionId: string, answer: string, correct: string) => {
    if (!user?.uid || !selectedQuiz) return;
    const isCorrect = answer === correct;
    const currentPart = getParticipation(selectedQuiz.id) || { score: 0, totalQuestions: currentQuestions.length, completedAt: 0, answers: {} };
    const newAnswers: QuizAttempt['answers'] = { ...currentPart.answers, [questionId]: { selectedAnswer: answer, isCorrect } };
    const score = Object.values(newAnswers).filter(a => a.isCorrect).length;
    await db.collection('users').doc(user.uid).update({ [`participations.${selectedQuiz.id}`]: { score, totalQuestions: currentQuestions.length, completedAt: Date.now(), answers: newAnswers } });
  };

  const getQuestionStatus = (qId: string) => {
    const part = getParticipation(selectedQuiz!.id);
    const ans = part?.answers?.[qId];
    if (!ans) return 'pending';
    return ans.isCorrect ? 'correct' : 'wrong';
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-blue-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               {selectedQuiz ? (
                 <button onClick={() => setSelectedQuiz(null)} className={`p-2 ${isRTL ? '-mr-2' : '-ml-2'} text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all`}><BackIcon className="w-6 h-6" /></button>
               ) : (
                 <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="Logo" className="w-10 h-10 md:w-14 md:h-14" />
               )}
               <div className="flex flex-col">
                 <h1 className="text-blue-700 font-bold font-arabic text-[11px] md:text-lg leading-tight">{t('schoolNameAr')}</h1>
                 <h2 className="text-blue-500 font-semibold text-[10px] md:text-sm leading-tight tracking-tight">{t('schoolNameEn')}</h2>
               </div>
            </div>
            <button onClick={() => logout()} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        {!selectedQuiz && (
           <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="relative z-10">
                <h1 className="text-base md:text-2xl font-medium text-blue-100 mb-1">{t('welcomeBack')}</h1>
                <div className="text-xl md:text-4xl font-bold mb-6 tracking-tight">{user?.name}</div>
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/20 max-w-xl">
                   <Save className="w-4 h-4 md:w-5 md:h-5 text-white mt-0.5 shrink-0" />
                   <div>
                     <h3 className="font-bold text-white text-xs md:text-sm mb-1">{t('autoSaveTitle')}</h3>
                     <p className="text-blue-100 text-[10px] md:text-sm leading-relaxed">{t('autoSaveDesc')}</p>
                   </div>
                </div>
              </div>
              <div className={`absolute ${isRTL ? '-left-10' : '-right-10'} -bottom-20 w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full blur-3xl`}></div>
           </div>
        )}
        
        {!selectedQuiz ? (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Award className="w-5 h-5 text-blue-500" />{t('availableAssessments')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeQuizzes.map(quiz => {
                const part = getParticipation(quiz.id);
                const isStarted = !!part;
                const total = part?.totalQuestions || 0;
                const answered = part?.answers ? Object.keys(part.answers).length : 0;
                const isCompleted = isStarted && answered >= total && total > 0;
                const percentage = isStarted && total > 0 ? Math.round((answered / total) * 100) : 0;
                return (
                  <button key={quiz.id} onClick={() => setSelectedQuiz(quiz)} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all text-start flex flex-col h-full overflow-hidden group">
                    <div className="p-5 flex-1 w-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : isStarted ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{isCompleted ? <CheckCircle className="w-5 h-5" /> : isStarted ? <Clock className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-green-100 text-green-700' : isStarted ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{isCompleted ? t('completed') : isStarted ? t('inProgress') : t('pending')}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">{quiz.title}</h3>
                      {isStarted ? (
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold"><span>{t('progress')}</span><span>{formatNumber(percentage)}%</span></div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }} /></div>
                        </div>
                      ) : (<div className="text-[11px] text-slate-400 italic">{t('notStarted')}</div>)}
                    </div>
                    <div className="px-5 py-3 border-t bg-slate-50 text-[11px] font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 flex justify-between items-center transition-colors">
                       <span>{isCompleted ? t('viewResults') : isStarted ? t('continue') : t('startAssessment')}</span><ArrowIcon className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
            {activeQuizzes.length === 0 && (<div className="text-center py-20 bg-white rounded-2xl border border-slate-100"><Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">{t('noActiveQuizzes')}</p></div>)}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
             <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-6 sticky top-16 md:top-20 z-20">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                   <div className="flex justify-between items-center gap-3 mb-3">
                      <h2 className="text-sm md:text-lg font-bold truncate flex-1 leading-tight">{selectedQuiz.title}</h2>
                      <div className="bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-1 shrink-0"><Trophy className="w-3 h-3 text-yellow-300" /><span className="font-bold text-[10px] md:text-xs">{t('score')}: {formatNumber(getParticipation(selectedQuiz.id)?.score || 0)}</span></div>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                      {[ { l: t('totalQuestions'), v: currentQuestions.length }, { l: t('done'), v: Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length }, { l: t('left'), v: currentQuestions.length - Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length } ].map((s,i)=>(
                        <div key={i} className="bg-black/20 rounded-lg p-1.5 backdrop-blur-sm text-center"><div className="text-blue-200 text-[8px] md:text-[10px] uppercase font-bold leading-none mb-1">{s.l}</div><div className="text-xs md:text-base font-bold leading-none">{formatNumber(s.v)}</div></div>
                      ))}
                   </div>
                </div>
                {currentQuestions.length > 0 && (<div className="h-1 w-full bg-slate-100"><div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${(Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length / currentQuestions.length) * 100}%` }} /></div>)}
             </div>
             <div className="space-y-3 pb-16">
                {currentQuestions.map((q, idx) => {
                  const status = getQuestionStatus(q.id);
                  const ansData = getParticipation(selectedQuiz.id)?.answers?.[q.id];
                  const isOpen = expandedId === q.id || (status === 'pending' && expandedId === null && idx === 0);
                  return (
                    <div key={q.id} className={`bg-white rounded-xl shadow-sm border transition-all ${isOpen ? 'border-blue-200 ring-1 ring-blue-50' : 'border-slate-100'}`}>
                      <button onClick={() => setExpandedId(isOpen ? null : q.id)} className="w-full p-4 flex items-start gap-3 text-start">
                        <div className="shrink-0 mt-0.5">{status==='correct'?<CheckCircle className="w-5 h-5 text-green-500"/>:status==='wrong'?<XCircle className="w-5 h-5 text-red-500"/>:<div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold flex items-center justify-center border border-slate-200">{formatNumber(idx+1)}</div>}</div>
                        <span className="flex-1 text-sm md:text-base font-semibold text-slate-700 leading-snug">{q.text}</span>
                        <div className="shrink-0 text-slate-300">{isOpen?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</div>
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${isOpen?'max-h-[600px] opacity-100':'max-h-0 opacity-0'}`}><div className={`px-4 pb-5 ${isRTL?'pr-12':'pl-12'} space-y-2.5`}>
                        {(['A','B','C','D'] as const).map(opt=>{
                          const isSel = ansData?.selectedAnswer === opt;
                          const isCor = q.correctAnswer === opt;
                          let cl = "w-full text-start p-3.5 rounded-xl border text-[13px] transition-all flex justify-between items-center ";
                          if(status!=='pending'){
                            if(isCor) cl+="bg-green-50 border-green-200 text-green-700 font-bold";
                            else if(isSel) cl+="bg-red-50 border-red-200 text-red-700 opacity-80";
                            else cl+="bg-slate-50 border-slate-100 text-slate-300";
                          } else cl+="bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50";
                          return (
                            <button key={opt} disabled={status!=='pending'} onClick={()=>handleAnswer(q.id,opt,q.correctAnswer)} className={cl}>
                              <div className="flex items-center gap-3"><span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center border border-slate-200">{opt}</span><span>{q.options[opt]}</span></div>
                              {status!=='pending' && isCor && <CheckCircle className="w-4 h-4"/>}{status!=='pending' && isSel && !isCor && <XCircle className="w-4 h-4"/>}
                            </button>
                          );
                        })}
                        {status!=='pending' && (<div className={`mt-3 text-xs font-bold ${status==='correct'?'text-green-600':'text-red-600'}`}>{status==='correct'?t('correctMsg'):`${t('wrongMsg')} ${q.correctAnswer}`}</div>)}
                      </div></div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
