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
  
  // State
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [userData, setUserData] = useState<QuizUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // --- 1. Load Available Quizzes & User Data ---
  useEffect(() => {
    if (!user?.uid) return;

    // Load Quizzes
    const unsubQuizzes = db.collection('quizzes')
      .where('isActive', '==', true)
      .onSnapshot(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
        setActiveQuizzes(data);
      });

    // Load User Data (for progress)
    const unsubUser = db.collection('users').doc(user.uid)
      .onSnapshot(doc => {
        if (doc.exists) setUserData({ id: doc.id, ...doc.data() } as QuizUser);
      });

    return () => {
      unsubQuizzes();
      unsubUser();
    };
  }, [user]);

  // --- 2. Load Questions for Selected Quiz ---
  useEffect(() => {
    if (!selectedQuiz) return;
    setLoadingQuiz(true);
    const unsub = db.collection('quizzes').doc(selectedQuiz.id).collection('questions').orderBy('order')
      .onSnapshot(snap => {
        setCurrentQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        setLoadingQuiz(false);
      });
    return () => unsub();
  }, [selectedQuiz]);


  // --- HELPERS ---
  const getParticipation = (quizId: string) => userData?.participations?.[quizId];

  const handleAnswer = async (questionId: string, answer: string, correct: string) => {
    if (!user?.uid || !selectedQuiz) return;
    
    const isCorrect = answer === correct;
    const currentPart = getParticipation(selectedQuiz.id) || {
      score: 0,
      totalQuestions: currentQuestions.length,
      completedAt: 0,
      answers: {}
    };

    // Calculate new score state
    const newAnswers: QuizAttempt['answers'] = {
        ...currentPart.answers,
        [questionId]: { selectedAnswer: answer, isCorrect }
    };
    
    // Recalculate score
    const score = Object.values(newAnswers).filter(a => a.isCorrect).length;
    
    // Save to Firestore
    await db.collection('users').doc(user.uid).update({
      [`participations.${selectedQuiz.id}`]: {
        score,
        totalQuestions: currentQuestions.length,
        completedAt: Date.now(),
        answers: newAnswers
      }
    });
  };

  const getQuestionStatus = (qId: string) => {
    if (!selectedQuiz) return 'pending';
    const part = getParticipation(selectedQuiz.id);
    const ans = part?.answers?.[qId];
    if (!ans) return 'pending';
    return ans.isCorrect ? 'correct' : 'wrong';
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-blue-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               {selectedQuiz ? (
                 <button onClick={() => setSelectedQuiz(null)} className={`p-2 ${isRTL ? '-mr-2' : '-ml-2'} text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all`}>
                   <BackIcon className="w-6 h-6" />
                 </button>
               ) : (
                 <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="Logo" className="w-12 h-12 md:w-14 md:h-14 drop-shadow-sm" />
               )}
               
               <div className="flex flex-col">
                 <h1 className="text-blue-700 font-bold font-arabic text-sm md:text-lg leading-tight">{t('schoolNameAr')}</h1>
                 <h2 className="text-blue-500 font-semibold text-xs md:text-sm leading-tight tracking-tight">{t('schoolNameEn')}</h2>
               </div>
            </div>
            
            <button 
              onClick={() => logout()}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        
        {/* --- WELCOME BANNER (Only on list view) --- */}
        {!selectedQuiz && (
           <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="relative z-10">
                <h1 className="text-xl md:text-2xl font-medium text-blue-100 mb-1">{t('welcomeBack')}</h1>
                <div className="text-2xl md:text-4xl font-bold mb-6 tracking-tight">{user?.name}</div>
                
                <div className="flex items-start gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 max-w-xl">
                   <div className="bg-white/20 p-2 rounded-lg shrink-0">
                     <Save className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-white text-sm mb-1">{t('autoSaveTitle')}</h3>
                     <p className="text-blue-100 text-xs md:text-sm leading-relaxed">
                       {t('autoSaveDesc')}
                     </p>
                   </div>
                </div>
              </div>
              {/* Abstract shapes bg */}
              <div className={`absolute ${isRTL ? '-left-10' : '-right-10'} -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl`}></div>
              <div className={`absolute top-0 ${isRTL ? 'left-20' : 'right-20'} w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl`}></div>
           </div>
        )}
        
        {/* VIEW 1: QUIZ SELECTION */}
        {!selectedQuiz && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Award className="w-5 h-5 text-blue-500" />
                 {t('availableAssessments')}
               </h2>
            </div>
            
            {activeQuizzes.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                 <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-slate-400 font-medium">{t('noActiveQuizzes')}</p>
                 <p className="text-slate-300 text-sm mt-1">{t('checkBackLater')}</p>
               </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeQuizzes.map(quiz => {
                  const part = getParticipation(quiz.id);
                  const isStarted = !!part;
                  const total = part?.totalQuestions || 0;
                  const answered = part?.answers ? Object.keys(part.answers).length : 0;
                  const isCompleted = isStarted && answered >= total && total > 0;
                  const remaining = isStarted ? total - answered : 0;
                  const percentage = isStarted && total > 0 ? Math.round((answered / total) * 100) : 0;

                  return (
                    <button 
                      key={quiz.id}
                      onClick={() => setSelectedQuiz(quiz)}
                      className="group bg-white p-0 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-900/5 border border-slate-100 hover:border-blue-200 transition-all duration-300 text-start relative overflow-hidden flex flex-col h-full"
                    >
                      <div className="p-6 flex-1 w-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : isStarted ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> : isStarted ? <Clock className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                               {new Date(quiz.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                             </span>
                             {isCompleted ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">{t('completed')}</span>
                             ) : isStarted ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">{t('inProgress')}</span>
                             ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{t('pending')}</span>
                             )}
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">{quiz.title}</h3>
                        
                        <div className="space-y-3">
                           {isStarted ? (
                             <>
                               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                                 <span>{t('progress')}</span>
                                 <span>{formatNumber(percentage)}%</span>
                               </div>
                               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }}></div>
                               </div>
                               <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                                     <div className="text-xs text-slate-400">{t('completedCount')}</div>
                                     <div className="font-bold text-slate-700">{formatNumber(answered)} / {formatNumber(total)}</div>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                                     <div className="text-xs text-slate-400">{t('remainingCount')}</div>
                                     <div className="font-bold text-slate-700">{formatNumber(remaining)}</div>
                                  </div>
                               </div>
                             </>
                           ) : (
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-500 text-center italic">
                               {t('notStarted')}
                             </div>
                           )}
                        </div>
                      </div>

                      <div className={`px-6 py-4 border-t ${isCompleted ? 'bg-green-50/50 border-green-100' : isStarted ? 'bg-yellow-50/50 border-yellow-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex items-center justify-between text-sm font-bold">
                           <span className={`${isCompleted ? 'text-green-700' : isStarted ? 'text-yellow-700' : 'text-slate-600'}`}>
                              {isCompleted ? t('viewResults') : isStarted ? t('continue') : t('startAssessment')}
                           </span>
                           <ArrowIcon className={`w-4 h-4 ${isCompleted ? 'text-green-700' : isStarted ? 'text-yellow-700' : 'text-slate-600 group-hover:translate-x-1 group-hover:-translate-x-1'} transition-transform transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TAKING QUIZ */}
        {selectedQuiz && (
          <div className={`animate-in ${isRTL ? 'slide-in-from-left-8' : 'slide-in-from-right-8'} duration-500 ease-out`}>
             
             {/* COMPACT QUIZ HEADER & STATS */}
             <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-6 sticky top-20 z-20">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white relative overflow-hidden">
                   <div className="relative z-10 w-full">
                      {/* Title Row */}
                      <div className="flex justify-between items-center gap-3 mb-4">
                          <h2 className="text-lg font-bold leading-tight truncate flex-1">{selectedQuiz.title}</h2>
                          <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-1.5 shrink-0">
                             <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                             <span className="font-bold text-xs">{t('score')}: {formatNumber(getParticipation(selectedQuiz.id)?.score || 0)}</span>
                          </div>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2">
                          <div className="bg-black/20 rounded-lg p-2 backdrop-blur-sm border border-white/5 text-center">
                              <div className="text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('totalQuestions')}</div>
                              <div className="text-base font-bold leading-none">{formatNumber(currentQuestions.length)}</div>
                          </div>
                           <div className="bg-black/20 rounded-lg p-2 backdrop-blur-sm border border-white/5 text-center">
                              <div className="text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('done')}</div>
                              <div className="text-base font-bold leading-none">{formatNumber(Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length)}</div>
                          </div>
                           <div className="bg-black/20 rounded-lg p-2 backdrop-blur-sm border border-white/5 text-center">
                              <div className="text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('left')}</div>
                              <div className="text-base font-bold leading-none">{formatNumber(currentQuestions.length - Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length)}</div>
                          </div>
                      </div>
                   </div>
                   <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-0 w-32 h-32 bg-white/5 rounded-full blur-2xl ${isRTL ? '-ml-10' : '-mr-10'} -mb-10 pointer-events-none`}></div>
                </div>
                
                {/* Progress Bar Line */}
                {currentQuestions.length > 0 && (
                   <div className="h-1.5 w-full bg-slate-100">
                     <div 
                        className="h-full bg-green-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        style={{ width: `${(Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length / currentQuestions.length) * 100}%` }}
                     />
                   </div>
                )}
             </div>

             <div className="space-y-4 pb-20">
                {loadingQuiz ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p>{t('loadingQuestions')}</p>
                  </div>
                ) : currentQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100">
                    <p>{t('noQuestionsQuiz')}</p>
                  </div>
                ) : (
                  currentQuestions.map((q, idx) => {
                    const status = getQuestionStatus(q.id);
                    const answerData = getParticipation(selectedQuiz.id)?.answers?.[q.id];
                    const isOpen = expandedId === q.id || (status === 'pending' && expandedId === null && idx === 0); // Default open first if pending
                    
                    return (
                      <div 
                        key={q.id} 
                        className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                          isOpen 
                          ? 'ring-1 ring-blue-500/30 shadow-md border-blue-100' 
                          : 'border-slate-100 hover:border-blue-200'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedId(isOpen ? null : q.id)}
                          className="w-full px-5 py-5 flex items-start gap-4 text-start group"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {status === 'correct' && <div className="bg-green-100 text-green-600 rounded-full p-1"><CheckCircle className="w-6 h-6" /></div>}
                            {status === 'wrong' && <div className="bg-red-100 text-red-600 rounded-full p-1"><XCircle className="w-6 h-6" /></div>}
                            {status === 'pending' && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center text-sm font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {formatNumber(idx + 1)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 pt-1">
                            <span className={`text-base font-semibold ${status !== 'pending' ? 'text-slate-800' : 'text-slate-700'}`}>
                              {q.text}
                            </span>
                          </div>
                          
                          <div className="pt-1 text-slate-300">
                             {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className={`px-5 pb-6 ${isRTL ? 'pr-16' : 'pl-16'}`}>
                            <div className="space-y-3 mt-1">
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                const isSelected = answerData?.selectedAnswer === opt;
                                const isCorrectAnswer = q.correctAnswer === opt;
                                
                                let btnClass = "w-full text-start p-4 rounded-xl border text-sm transition-all duration-200 flex justify-between items-center relative overflow-hidden ";
                                
                                if (status !== 'pending') {
                                  if (isCorrectAnswer) btnClass += "bg-green-50 border-green-200 text-green-800 font-bold shadow-sm";
                                  else if (isSelected && !isCorrectAnswer) btnClass += "bg-red-50 border-red-200 text-red-800 opacity-80";
                                  else btnClass += "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                                } else {
                                  btnClass += "bg-white hover:bg-blue-50 hover:border-blue-200 border-slate-200 text-slate-600 font-medium hover:shadow-md active:scale-[0.99] group/opt";
                                }

                                return (
                                  <button
                                    key={opt}
                                    disabled={status !== 'pending'}
                                    onClick={() => handleAnswer(q.id, opt, q.correctAnswer)}
                                    className={btnClass}
                                  >
                                    <div className="flex items-center gap-3">
                                       <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border ${status !== 'pending' && isCorrectAnswer ? 'bg-green-200 border-green-300 text-green-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{opt}</span>
                                       <span>{q.options[opt]}</span>
                                    </div>
                                    
                                    {status !== 'pending' && isCorrectAnswer && <CheckCircle className="w-5 h-5 text-green-600" />}
                                    {status !== 'pending' && isSelected && !isCorrectAnswer && <XCircle className="w-5 h-5 text-red-600" />}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Feedback Message */}
                            <div className="mt-4 min-h-[24px]">
                               {status === 'correct' && (
                                 <div className={`inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 animate-in fade-in ${isRTL ? 'slide-in-from-right-2' : 'slide-in-from-left-2'}`}>
                                   <span role="img" aria-label="party">🎉</span> {t('correctMsg')}
                                 </div>
                               )}
                               {status === 'wrong' && (
                                 <div className={`inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 animate-in fade-in ${isRTL ? 'slide-in-from-right-2' : 'slide-in-from-left-2'}`}>
                                   {t('wrongMsg')} <span className="font-bold">{q.correctAnswer}</span>.
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};