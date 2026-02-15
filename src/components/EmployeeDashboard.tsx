import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Question, QuizUser, Quiz } from '../types';
import { CheckCircle, XCircle, LogOut, ChevronDown, ChevronUp, Trophy, ArrowLeft, PlayCircle, Clock, Award, Circle, ArrowRight } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
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
    const newAnswers = {
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

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-blue-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               {selectedQuiz ? (
                 <button onClick={() => setSelectedQuiz(null)} className="p-2 -ml-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                   <ArrowLeft className="w-6 h-6" />
                 </button>
               ) : (
                 <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="Logo" className="w-12 h-12 md:w-14 md:h-14 drop-shadow-sm" />
               )}
               
               <div className="flex flex-col">
                 <h1 className="text-blue-700 font-bold font-arabic text-sm md:text-lg leading-tight">مدرسة الشرق الأوسط العالمية - المروج</h1>
                 <h2 className="text-blue-500 font-semibold text-xs md:text-sm leading-tight tracking-tight">Middle East International School - AlMuruj</h2>
               </div>
            </div>
            
            <button 
              onClick={() => logout()}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Logout"
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
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-blue-100 max-w-lg">Ready to test your knowledge? Check out the active quizzes below and keep your skills sharp.</p>
              </div>
              {/* Abstract shapes bg */}
              <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute top-0 right-20 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
           </div>
        )}
        
        {/* VIEW 1: QUIZ SELECTION */}
        {!selectedQuiz && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Award className="w-5 h-5 text-blue-500" />
                 Available Assessments
               </h2>
            </div>
            
            {activeQuizzes.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                 <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-slate-400 font-medium">No active quizzes at the moment.</p>
                 <p className="text-slate-300 text-sm mt-1">Check back later.</p>
               </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeQuizzes.map(quiz => {
                  const part = getParticipation(quiz.id);
                  const isStarted = !!part;
                  const score = part?.score || 0;
                  const total = part?.totalQuestions || '?';

                  return (
                    <button 
                      key={quiz.id}
                      onClick={() => setSelectedQuiz(quiz)}
                      className="group bg-white p-0 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-900/5 border border-slate-100 hover:border-blue-200 transition-all duration-300 text-left relative overflow-hidden flex flex-col h-full"
                    >
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-xl ${isStarted ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isStarted ? <Trophy className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                          </div>
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            {new Date(quiz.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{quiz.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">Click to {isStarted ? 'view your results' : 'start this assessment'}.</p>
                      </div>

                      <div className={`px-6 py-4 border-t ${isStarted ? 'bg-green-50/50 border-green-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        {isStarted ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-green-700">Completed</span>
                            <span className="text-sm font-bold text-green-700 bg-white px-3 py-1 rounded-full shadow-sm">
                              {score} / {total}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-blue-600 group-hover:translate-x-1 transition-transform">
                            <span className="text-sm font-bold">Start Quiz</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
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
          <div className="animate-in slide-in-from-right-8 duration-500 ease-out">
             
             {/* Progress Card */}
             <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-6 sticky top-24 z-10">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                   <div className="relative z-10">
                      <h2 className="text-xl md:text-2xl font-bold truncate pr-4">{selectedQuiz.title}</h2>
                      <div className="flex items-center gap-4 mt-2 text-blue-100 text-sm font-medium">
                          <span className="flex items-center gap-1"><Circle className="w-3 h-3 fill-current" /> {currentQuestions.length} Questions</span>
                          <span className="bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                            Score: {getParticipation(selectedQuiz.id)?.score || 0}
                          </span>
                      </div>
                   </div>
                   <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mb-10"></div>
                </div>
                
                {/* Progress Bar */}
                {currentQuestions.length > 0 && (
                   <div className="h-1.5 w-full bg-slate-100">
                     <div 
                        className="h-full bg-green-500 transition-all duration-700 ease-out"
                        style={{ width: `${(Object.keys(getParticipation(selectedQuiz.id)?.answers || {}).length / currentQuestions.length) * 100}%` }}
                     />
                   </div>
                )}
             </div>

             <div className="space-y-4 pb-20">
                {loadingQuiz ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p>Loading questions...</p>
                  </div>
                ) : currentQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100">
                    <p>No questions found in this quiz.</p>
                  </div>
                ) : (
                  currentQuestions.map((q, idx) => {
                    const status = getQuestionStatus(q.id);
                    const answerData = getParticipation(selectedQuiz.id)?.answers?.[q.id];
                    const isOpen = expandedId === q.id || (status === 'pending' && expandedId === null && idx === 0); // Default open first if pending
                    
                    // Auto-expand next logic could go here, but manual is fine for now
                    
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
                          className="w-full px-5 py-5 flex items-start gap-4 text-left group"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {status === 'correct' && <div className="bg-green-100 text-green-600 rounded-full p-1"><CheckCircle className="w-6 h-6" /></div>}
                            {status === 'wrong' && <div className="bg-red-100 text-red-600 rounded-full p-1"><XCircle className="w-6 h-6" /></div>}
                            {status === 'pending' && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center text-sm font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {idx + 1}
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
                          <div className="px-5 pb-6 pl-16">
                            <div className="space-y-3 mt-1">
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                const isSelected = answerData?.selectedAnswer === opt;
                                const isCorrectAnswer = q.correctAnswer === opt;
                                
                                let btnClass = "w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex justify-between items-center relative overflow-hidden ";
                                
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
                                 <div className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 animate-in fade-in slide-in-from-left-2">
                                   <span role="img" aria-label="party">🎉</span> Excellent! That's correct.
                                 </div>
                               )}
                               {status === 'wrong' && (
                                 <div className="inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 animate-in fade-in slide-in-from-left-2">
                                   The correct answer was <span className="font-bold">{q.correctAnswer}</span>.
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
    </div>
  );
};