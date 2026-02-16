
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import firebase from "firebase/compat/app";
import { 
  Users, FileSpreadsheet, LogOut, Upload, Trash2, Plus, 
  ChevronRight, ArrowLeft, ArrowRight, MoreVertical, Edit2, PlayCircle, StopCircle, Save, X, Eye, Download, AlertTriangle, LayoutDashboard, CheckSquare, BarChart2, PieChart as PieChartIcon, RotateCcw, Check
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { parseUsersExcel, parseQuestionsExcel, exportReportsToExcel, downloadUserTemplate, downloadQuestionTemplate } from '../services/excelService';
import { QuizUser, Question, Quiz } from '../types';
import { Footer } from './Footer';

type Tab = 'users' | 'quiz' | 'reports';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const { t, formatNumber, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('quiz');
  const [loading, setLoading] = useState(false);

  // --- STATE ---
  const [users, setUsers] = useState<QuizUser[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  // Quiz Management State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  
  // Edit States
  const [editingUser, setEditingUser] = useState<QuizUser | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // Form Data
  const [userData, setUserData] = useState({ name: '', employeeId: '', department: '' });
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizActive, setNewQuizActive] = useState(false);
  const [questionData, setQuestionData] = useState<Omit<Question, 'id' | 'order'>>({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A'
  });

  // Reporting State
  const [reportQuizId, setReportQuizId] = useState<string>('');
  const [reportQuestions, setReportQuestions] = useState<Question[]>([]);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    fetchUsers();
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports' && reportQuizId) {
        const loadReportQs = async () => {
            const snap = await db.collection('quizzes').doc(reportQuizId).collection('questions').orderBy('order').get();
            setReportQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        };
        loadReportQs();
    }
  }, [activeTab, reportQuizId]);

  const fetchUsers = async () => {
    const snap = await db.collection('users').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizUser));
    setUsers(data.filter(u => u.role !== 'admin'));
  };

  const fetchQuizzes = async () => {
    const snap = await db.collection('quizzes').orderBy('createdAt', 'desc').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    setQuizzes(data);
    if (!reportQuizId && data.length > 0) setReportQuizId(data[0].id);
  };

  const fetchQuestions = async (quizId: string) => {
    setLoading(true);
    try {
      const snap = await db.collection('quizzes').doc(quizId).collection('questions').orderBy('order').get();
      setQuizQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await db.collection('users').doc(editingUser.id).update({
          name: userData.name,
          employeeId: userData.employeeId,
          department: userData.department
        });
      } else {
        await db.collection('users').add({
          ...userData,
          role: 'employee',
          participations: {}
        });
      }
      setShowUserModal(false);
      setUserData({ name: '', employeeId: '', department: '' });
      await fetchUsers();
    } catch (error) {
      alert("Error saving user");
    } finally {
      setLoading(false);
    }
  };

  const handleUserImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      const parsed = await parseUsersExcel(e.target.files[0]);
      if (parsed.length === 0) {
        alert("No valid users found in file. Please ensure columns match: Employee ID, Name, Department");
      } else {
        const batch = db.batch();
        parsed.forEach(u => {
          const ref = db.collection('users').doc();
          batch.set(ref, { ...u, role: 'employee', participations: {} });
        });
        await batch.commit();
        await fetchUsers();
        alert(`Successfully imported ${parsed.length} users.`);
      }
    } catch (err) {
      alert("Import failed. Please check the Excel file format.");
    } finally {
      setLoading(false);
      e.target.value = ''; 
    }
  };

  const handleDeleteUser = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('confirmDelete'),
      message: t('deleteUserMsg'),
      onConfirm: async () => {
        try {
          await db.collection('users').doc(id).delete();
          setUsers(prev => prev.filter(u => u.id !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete user error:", error);
        }
      }
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    try {
      await db.collection('quizzes').add({
        title: newQuizTitle,
        isActive: newQuizActive,
        createdAt: Date.now()
      });
      setShowCreateQuizModal(false);
      setNewQuizTitle('');
      setNewQuizActive(false);
      await fetchQuizzes();
    } catch (error) {
      alert("Error creating quiz");
    }
  };

  const handleToggleQuizStatus = async (quiz: Quiz) => {
    try {
      await db.collection('quizzes').doc(quiz.id).update({ isActive: !quiz.isActive });
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, isActive: !q.isActive } : q));
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleUpdateTitle = async () => {
    if (!selectedQuiz || !editTitleValue.trim()) return;
    try {
      await db.collection('quizzes').doc(selectedQuiz.id).update({
        title: editTitleValue
      });
      const updated = { ...selectedQuiz, title: editTitleValue };
      setSelectedQuiz(updated);
      setQuizzes(prev => prev.map(q => q.id === updated.id ? updated : q));
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  const handleDeleteQuiz = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('confirmDelete'),
      message: t('deleteQuizMsg'),
      onConfirm: async () => {
        try {
          await db.collection('quizzes').doc(id).delete();
          setQuizzes(prev => prev.filter(q => q.id !== id));
          if (selectedQuiz?.id === id) setSelectedQuiz(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete quiz error:", error);
        }
      }
    });
  };

  const selectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsEditingTitle(false);
    await fetchQuestions(quiz.id);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    try {
      if (editingQuestion) {
         await db.collection('quizzes').doc(selectedQuiz.id).collection('questions').doc(editingQuestion.id).update({
           ...questionData
         });
      } else {
         const order = quizQuestions.length + 1;
         await db.collection('quizzes').doc(selectedQuiz.id).collection('questions').add({
           ...questionData,
           order
         });
      }
      setShowQuestionModal(false);
      setQuestionData({ text: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A' });
      await fetchQuestions(selectedQuiz.id);
    } catch (error) {
      alert("Error saving question");
    }
  };

  const handleQuestionImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedQuiz) return;
    setLoading(true);
    try {
      const parsed = await parseQuestionsExcel(e.target.files[0]);
      if (parsed.length === 0) {
        alert("No valid questions found.");
      } else {
        const batch = db.batch();
        parsed.forEach((q, idx) => {
            const ref = db.collection('quizzes').doc(selectedQuiz.id).collection('questions').doc();
            batch.set(ref, { ...q, order: quizQuestions.length + idx + 1 });
        });
        await batch.commit();
        await fetchQuestions(selectedQuiz.id);
        alert(`Successfully imported ${parsed.length} questions.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      e.target.value = ''; 
    }
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!selectedQuiz) return;
    setConfirmModal({
      isOpen: true,
      title: t('confirmDelete'),
      message: t('deleteQuestionMsg'),
      onConfirm: async () => {
        try {
          await db.collection('quizzes').doc(selectedQuiz.id).collection('questions').doc(qId).delete();
          setQuizQuestions(prev => prev.filter(q => q.id !== qId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete question error:", error);
        }
      }
    });
  };

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserData({ name: '', employeeId: '', department: '' });
    setShowUserModal(true);
  };

  const openEditUserModal = (u: QuizUser) => {
    setEditingUser(u);
    setUserData({ name: u.name, employeeId: u.employeeId, department: u.department });
    setShowUserModal(true);
  };

  const openAddQuestionModal = () => {
    setEditingQuestion(null);
    setQuestionData({ text: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A' });
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q: Question) => {
    setEditingQuestion(q);
    setQuestionData({ text: q.text, options: { ...q.options }, correctAnswer: q.correctAnswer });
    setShowQuestionModal(true);
  };

  const reportStats = useMemo(() => {
    if (!reportQuizId) return null;
    const allParticipants = users.filter(u => u.participations && u.participations[reportQuizId]);
    const fullyCompletedUsers = allParticipants.filter(u => {
        const p = u.participations![reportQuizId];
        return p.answers && p.totalQuestions && Object.keys(p.answers).length === p.totalQuestions;
    });
    const totalCompleted = fullyCompletedUsers.length;
    let totalScore = 0;
    let maxScorePossible = 0; 
    let passedCount = 0;
    const deptStats: { [dept: string]: { totalScore: number, count: number } } = {};
    const scoreDistribution = [
        { name: '0-20%', count: 0, fill: '#ef4444' }, 
        { name: '21-40%', count: 0, fill: '#f97316' }, 
        { name: '41-60%', count: 0, fill: '#eab308' }, 
        { name: '61-80%', count: 0, fill: '#84cc16' }, 
        { name: '81-100%', count: 0, fill: '#22c55e' }
    ];
    const questionAnalysis: { [qId: string]: { correct: number, total: number } } = {};
    if (fullyCompletedUsers.length > 0) {
       maxScorePossible = fullyCompletedUsers[0].participations![reportQuizId].totalQuestions;
       fullyCompletedUsers.forEach(u => {
         const p = u.participations![reportQuizId];
         const percentage = (p.score / p.totalQuestions) * 100;
         totalScore += p.score;
         if (percentage >= 50) passedCount++;
         const dept = u.department || 'Unknown';
         if (!deptStats[dept]) deptStats[dept] = { totalScore: 0, count: 0 };
         deptStats[dept].totalScore += percentage;
         deptStats[dept].count++;
         if (percentage <= 20) scoreDistribution[0].count++;
         else if (percentage <= 40) scoreDistribution[1].count++;
         else if (percentage <= 60) scoreDistribution[2].count++;
         else if (percentage <= 80) scoreDistribution[3].count++;
         else scoreDistribution[4].count++;
         Object.entries(p.answers).forEach(([qId, ans]: [string, any]) => {
            if (!questionAnalysis[qId]) questionAnalysis[qId] = { correct: 0, total: 0 };
            questionAnalysis[qId].total++;
            if (ans.isCorrect) questionAnalysis[qId].correct++;
         });
       });
    }
    const avgScore = totalCompleted > 0 && maxScorePossible > 0 ? Math.round((totalScore / (totalCompleted * maxScorePossible)) * 100) : 0;
    const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0;
    const deptChartData = Object.entries(deptStats).map(([name, data]) => ({ name, avg: Math.round(data.totalScore / data.count), count: data.count })).sort((a,b) => b.avg - a.avg);
    const topDept = deptChartData.length > 0 ? deptChartData[0].name : '-';
    const questionAnalysisData = reportQuestions.map(q => {
        const stats = questionAnalysis[q.id] || { correct: 0, total: 0 };
        const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        return { ...q, correctRate: rate, attempts: stats.total };
    }).sort((a,b) => a.correctRate - b.correctRate);
    return { totalCompleted, avgScore, passRate, topDept, allParticipants, maxScorePossible, scoreDistribution, deptChartData, questionAnalysisData };
  }, [users, reportQuizId, reportQuestions]);

  const handleExportReport = () => {
    if (!reportStats) return;
    const data = users.map(u => {
      const part = u.participations?.[reportQuizId];
      const isComplete = part && part.answers && part.totalQuestions && Object.keys(part.answers).length === part.totalQuestions;
      return { 'Employee ID': u.employeeId, 'Name': u.name, 'Department': u.department, 'Status': isComplete ? 'Completed' : part ? 'In Progress' : 'Not Started', 'Score': part ? `${part.score}/${part.totalQuestions}` : '-', 'Date': part ? new Date(part.completedAt).toLocaleDateString() : '-' };
    });
    exportReportsToExcel(data, 'Quiz_Report');
  };

  const handleResetProgress = (userId: string) => {
    setConfirmModal({
        isOpen: true,
        title: t('resetConfirmTitle'),
        message: t('resetConfirmMsg'),
        onConfirm: async () => {
            try {
                await db.collection('users').doc(userId).update({ [`participations.${reportQuizId}`]: firebase.firestore.FieldValue.delete() });
                setUsers(prev => prev.map(u => {
                    if (u.id === userId && u.participations) {
                        const newParts = { ...u.participations };
                        delete newParts[reportQuizId];
                        return { ...u, participations: newParts };
                    }
                    return u;
                }));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            } catch (error) { console.error(error); }
        }
    });
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  if (loading && !users.length && !quizzes.length) return <div className="min-h-screen flex items-center justify-center text-slate-400">{t('loading')}</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Header Row - Branding & Logout */}
          <div className="flex items-center justify-between py-3 md:py-4 gap-4">
            {/* Constrain branding width to ensure logout button space */}
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 max-w-[70%]">
              <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="Logo" className="w-9 h-9 md:w-12 md:h-12 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <h1 className="text-blue-800 font-bold font-arabic text-[9px] md:text-sm leading-tight truncate">{t('schoolNameAr')}</h1>
                <h2 className="text-blue-600 font-medium text-[8px] md:text-xs leading-tight truncate">{t('schoolNameEn')}</h2>
              </div>
            </div>
            {/* Logout button container - guaranteed space */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="hidden lg:block text-slate-400 font-bold text-[10px] tracking-wider uppercase">{t('adminPortal')}</span>
              <button 
                onClick={() => logout()} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-100 hover:border-red-100 bg-slate-50/50 md:bg-transparent" 
                title={t('logout')}
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-[9px] md:text-xs font-bold uppercase tracking-tight">{t('logout')}</span>
              </button>
            </div>
          </div>
          
          {/* Bottom Header Row - Navigation Tabs */}
          <div className="pb-3 md:pb-4 overflow-x-auto scrollbar-hide">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full min-w-max md:min-w-0">
              <NavButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<CheckSquare className="w-4 h-4" />}>{t('manageQuizzes')}</NavButton>
              <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users className="w-4 h-4" />}>{t('manageStaff')}</NavButton>
              <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<LayoutDashboard className="w-4 h-4" />}>{t('reports')}</NavButton>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'quiz' && (
          <div>
            {!selectedQuiz ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t('manageQuizzes')}</h2>
                  </div>
                  <button 
                    onClick={() => setShowCreateQuizModal(true)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    <Plus className="w-5 h-5" /> {t('createQuiz')}
                  </button>
                </div>
                {quizzes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <LayoutDashboard className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">{t('noQuizzesAdmin')}</p>
                    <button onClick={() => setShowCreateQuizModal(true)} className="mt-4 text-blue-600 hover:underline">{t('createFirstQuiz')}</button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map(q => (
                      <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${q.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{q.isActive ? t('active') : t('draft')}</div>
                           <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteQuiz(q.id); }} className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">{q.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 font-mono">
                           <span>ID: {q.id.substring(0,6)}</span>
                           <span>•</span>
                           <span>{new Date(q.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-auto">
                          <button onClick={(e) => { e.stopPropagation(); handleToggleQuizStatus(q); }} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border ${q.isActive ? 'bg-white text-red-600 border-red-100 hover:bg-red-50' : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'}`}>
                             {q.isActive ? <StopCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                             {q.isActive ? t('stop') : t('publish')}
                          </button>
                          <button onClick={() => selectQuiz(q)} className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"><Edit2 className="w-3 h-3" /> {t('edit')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={`animate-in ${isRTL ? 'slide-in-from-left-4' : 'slide-in-from-right-4'} duration-300`}>
                <button onClick={() => setSelectedQuiz(null)} className="mb-6 text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"><BackIcon className="w-4 h-4" /> {t('back')}</button>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                  <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6">
                    <div className="flex-1">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input type="text" value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)} className="text-xl md:text-2xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none bg-transparent px-1 w-full md:w-auto min-w-[200px]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }} />
                          <button onClick={handleUpdateTitle} className="p-1.5 text-green-600 bg-green-50 rounded-lg"><Check className="w-5 h-5" /></button>
                          <button onClick={() => setIsEditingTitle(false)} className="p-1.5 text-red-600 bg-red-50 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 group mb-1">
                          <h2 className="text-xl md:text-2xl font-bold text-slate-900">{selectedQuiz.title}</h2>
                          <button onClick={() => { setEditTitleValue(selectedQuiz.title); setIsEditingTitle(true); }} className="text-slate-400 hover:text-blue-600 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-slate-100"><Edit2 className="w-4 h-4" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs md:text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{formatNumber(quizQuestions.length)} {t('questionsCount')}</span>
                        <span className={`text-xs md:text-sm font-bold flex items-center gap-1.5 ${selectedQuiz.isActive ? 'text-green-600' : 'text-slate-400'}`}><span className={`w-2 h-2 rounded-full ${selectedQuiz.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>{selectedQuiz.isActive ? t('live') : t('draft')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      <button onClick={downloadQuestionTemplate} className="flex-1 md:flex-none justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs md:text-sm font-medium transition-colors"><Download className="w-4 h-4" /> {t('template')}</button>
                      <label className="flex-1 md:flex-none justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-xs md:text-sm font-medium transition-colors"><Upload className="w-4 h-4" /> {t('import')}<input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleQuestionImport} /></label>
                      <button onClick={openAddQuestionModal} className="w-full xl:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"><Plus className="w-4 h-4" /> {t('addQuestion')}</button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50/30">
                    {quizQuestions.length === 0 ? (
                      <div className="p-16 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                        <p className="mb-1 font-medium text-slate-600">{t('emptyQuiz')}</p>
                        <p className="text-sm">{t('emptyQuizDesc')}</p>
                      </div>
                    ) : (
                      quizQuestions.map((q) => (
                        <div key={q.id} className={`p-4 md:p-5 hover:bg-white transition-all flex gap-4 md:gap-5 group ${isRTL ? 'border-r-4' : 'border-l-4'} border-transparent hover:border-indigo-500 relative`}>
                          <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm">{formatNumber(q.order)}</div>
                          <div className={`flex-1 ${isRTL ? 'pl-8 md:pl-16' : 'pr-8 md:pr-16'}`}>
                            <p className="font-semibold text-slate-800 mb-3 text-sm md:text-lg leading-relaxed">{q.text}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
                              {(['A', 'B', 'C', 'D'] as const).map((key) => (
                                <div key={key} className={`px-3 py-2 rounded-lg flex items-center gap-3 border ${key === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-white border-slate-100 text-slate-500'}`}>
                                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs border ${key === q.correctAnswer ? 'border-green-300 bg-white' : 'border-slate-200 bg-slate-50'}`}>{key}</span>
                                  <span>{q.options[key]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex flex-col md:flex-row gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button onClick={() => openEditQuestionModal(q)} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"><Edit2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-4">
              <h2 className="text-xl font-bold text-slate-800">{t('manageStaff')}</h2>
              <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
                 <button onClick={downloadUserTemplate} className="flex-1 md:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors"><Download className="w-4 h-4" /> {t('template')}</button>
                 <label className="flex-1 md:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-xs font-medium transition-colors"><Upload className="w-4 h-4" /> {t('importExcel')}<input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleUserImport} /></label>
                 <button onClick={openAddUserModal} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-md shadow-blue-500/20"><Plus className="w-4 h-4" /> {t('addStaff')}</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-start text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('employeeId')}</th>
                    <th className="px-6 py-4 text-start text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('staffName')}</th>
                    <th className="px-6 py-4 text-start text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('department')}</th>
                    <th className="px-6 py-4 text-end text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono text-start">{u.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-start">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{u.name.charAt(0)}</div>
                            {u.name}
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-start">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{u.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                        <button onClick={() => openEditUserModal(u)} className={`text-slate-300 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 ${isRTL ? 'ml-1' : 'mr-1'}`}><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                     <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">{t('noStaffFound')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{t('selectAssessment')}</label>
                <div className="relative">
                  <select value={reportQuizId} onChange={(e) => setReportQuizId(e.target.value)} className={`w-full md:w-80 border-slate-200 rounded-xl shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 py-2.5 ${isRTL ? 'pr-3 pl-10' : 'pl-3 pr-10'} bg-white text-slate-800`}>
                    {quizzes.length === 0 && <option>{t('noQuizzesAdmin')}</option>}
                    {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleExportReport} disabled={!reportStats} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"><FileSpreadsheet className="w-5 h-5" /> {t('downloadReport')}</button>
            </div>
            {reportStats ? (
              <div className="space-y-6">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ReportCard title={t('participation')} value={formatNumber(reportStats.totalCompleted)} subtitle={t('staffCompleted')} color="indigo" />
                    <ReportCard title={t('avgPerformance')} value={`${formatNumber(reportStats.avgScore)}%`} subtitle={t('avgScore')} color="blue" />
                    <ReportCard title={t('passRate')} value={`${formatNumber(reportStats.passRate)}%`} subtitle={"> 50%"} color="green" />
                    <ReportCard title={t('topDept')} value={reportStats.topDept} subtitle="" color="purple" />
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" dir="ltr">
                        <div className="mb-6"><h3 className={`text-lg font-bold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t('scoreDistribution')}</h3></div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%"><BarChart data={reportStats.scoreDistribution}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{fontSize: 10}} /><YAxis /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{reportStats.scoreDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Bar></BarChart></ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" dir="ltr">
                        <div className="mb-6"><h3 className={`text-lg font-bold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t('deptPerformance')}</h3></div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%"><BarChart data={reportStats.deptChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" domain={[0, 100]} /><YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} name={t('score')} /></BarChart></ResponsiveContainer>
                        </div>
                    </div>
                 </div>
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />{t('questionAnalysis')}</h3><span className="text-xs text-slate-400 font-medium">{t('questionsCount')}: {formatNumber(reportStats.questionAnalysisData.length)}</span></div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="min-w-full divide-y divide-slate-100">
                         <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase w-12">#</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase">{t('questionText')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase w-32">{t('correctRate')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase w-32 whitespace-nowrap">{t('studentsCount')}</th></tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-slate-100">
                            {reportStats.questionAnalysisData.map((q, idx) => (
                                <tr key={q.id} className="hover:bg-slate-50"><td className="px-6 py-3 text-sm font-bold text-slate-400">{formatNumber(idx + 1)}</td><td className="px-6 py-3 text-sm text-slate-700"><div className="line-clamp-2">{q.text}</div><div className="text-xs text-slate-400 mt-1">{t('correctAnswer')}: <b className="text-green-600">{q.correctAnswer}</b></div></td><td className="px-6 py-3"><div className="flex items-center gap-2"><span className={`text-sm font-bold ${q.correctRate < 50 ? 'text-red-600' : q.correctRate < 80 ? 'text-yellow-600' : 'text-green-600'}`}>{formatNumber(q.correctRate)}%</span></div></td><td className="px-6 py-3 text-sm text-slate-500 font-mono">{formatNumber(q.attempts)}</td></tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                 </div>
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">{t('detailedResults')}</h3></div>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                          <tr><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase">{t('staffName')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase">{t('department')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase">{t('score')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase">{t('status')}</th><th className="px-6 py-3 text-start text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{t('completionDate')}</th><th className="px-6 py-3 text-end text-xs font-bold text-slate-500 uppercase">{t('actions')}</th></tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                           {reportStats.allParticipants.map(u => {
                             const p = u.participations![reportQuizId];
                             const percentage = Math.round((p.score / p.totalQuestions) * 100);
                             const isComplete = p.answers && p.totalQuestions && Object.keys(p.answers).length === p.totalQuestions;
                             return (
                               <tr key={u.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-start">{u.name}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-start">{u.department}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-start"><div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-700">{formatNumber(p.score)} / {formatNumber(p.totalQuestions)}</span></div></td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-start">{isComplete ? (<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{t('completed')}</span>) : (<span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">{t('inProgress')}</span>)}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono text-xs text-start">{new Date(p.completedAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-end text-sm"><button onClick={() => handleResetProgress(u.id)} className="text-slate-300 hover:text-red-600 p-2 rounded-full hover:bg-red-50" title={t('reset')}><RotateCcw className="w-4 h-4" /></button></td>
                               </tr>
                             );
                           })}
                           {reportStats.allParticipants.length === 0 && (<tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('noParticipation')}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
            ) : (<div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400">{t('selectAssessment')}</p></div>)}
          </div>
        )}
      </main>
      <Footer />
      {/* --- MODALS --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-start gap-4 mb-4"><div className="bg-red-100 p-3 rounded-full flex-shrink-0"><AlertTriangle className="w-6 h-6 text-red-600" /></div><div><h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3><p className="text-sm text-slate-600 mt-1 leading-relaxed">{confirmModal.message}</p></div></div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold">{t('cancel')}</button><button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20">{t('delete')}</button></div>
          </div>
        </div>
      )}
      {showCreateQuizModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">{t('createQuiz')}</h3><button onClick={() => setShowCreateQuizModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div><form onSubmit={handleCreateQuiz}><div className="mb-5"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('quizTitle')}</label><input autoFocus type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none" value={newQuizTitle} onChange={e => setNewQuizTitle(e.target.value)} required /></div><div className="mb-8 flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100"><input type="checkbox" id="newQuizActive" checked={newQuizActive} onChange={(e) => setNewQuizActive(e.target.checked)} className="w-5 h-5 rounded" /><label htmlFor="newQuizActive" className="text-sm text-slate-700 font-medium cursor-pointer">{t('makeActive')}</label></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateQuizModal(false)} className="px-5 py-2.5 text-slate-600">{t('cancel')}</button><button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">{t('createQuiz')}</button></div></form></div>
        </div>
      )}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">{editingUser ? t('edit') : t('addStaff')}</h3><button onClick={() => setShowUserModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div><form onSubmit={handleSaveUser} className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('staffName')}</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} required /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('employeeId')}</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none" value={userData.employeeId} onChange={e => setUserData({...userData, employeeId: e.target.value})} required /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('department')}</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none" value={userData.department} onChange={e => setUserData({...userData, department: e.target.value})} required /></div><div className="flex justify-end gap-3 mt-8"><button type="button" onClick={() => setShowUserModal(false)} className="px-5 py-2.5 text-slate-600">{t('cancel')}</button><button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">{t('save')}</button></div></form></div>
        </div>
      )}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8 animate-in zoom-in-95"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">{editingQuestion ? t('edit') : t('addQuestion')}</h3><button onClick={() => setShowQuestionModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div><form onSubmit={handleSaveQuestion} className="space-y-5"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('questionText')}</label><textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none" rows={3} value={questionData.text} onChange={e => setQuestionData({...questionData, text: e.target.value})} required /></div><div className="grid grid-cols-1 gap-4">{(['A', 'B', 'C', 'D'] as const).map(opt => (<div key={opt} className="relative"><span className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-3.5 text-[10px] font-bold text-slate-400 uppercase`}>{t('option')} {opt}</span><input type="text" className={`w-full ${isRTL ? 'pr-20 pl-4' : 'pl-20 pr-4'} py-3 border border-slate-200 rounded-xl outline-none text-sm font-medium`} value={questionData.options[opt]} onChange={e => setQuestionData({...questionData, options: {...questionData.options, [opt]: e.target.value}})} required /></div>))}</div><div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('correctAnswer')}</label><div className="flex gap-2">{(['A', 'B', 'C', 'D'] as const).map(opt => (<button type="button" key={opt} onClick={() => setQuestionData({...questionData, correctAnswer: opt})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${questionData.correctAnswer === opt ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600'}`}>{opt}</button>))}</div></div><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setShowQuestionModal(false)} className="px-5 py-2.5 text-slate-600">{t('cancel')}</button><button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold">{t('saveQuestion')}</button></div></form></div>
        </div>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, children, icon }: { active: boolean, onClick: () => void, children?: React.ReactNode, icon: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 py-2.5 rounded-lg text-[11px] md:text-sm font-bold transition-all flex items-center gap-2 flex-1 md:flex-none justify-center whitespace-nowrap ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
    {icon} {children}
  </button>
);

const ReportCard = ({ title, value, subtitle, color }: { title: string, value: string, subtitle: string, color: string }) => {
    const { isRTL } = useLanguage();
    const colorClasses: Record<string, string> = { indigo: 'from-indigo-500 to-indigo-600', blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-emerald-600', purple: 'from-purple-500 to-fuchsia-600' };
    return (
        <div className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} p-4 md:p-5 rounded-2xl shadow-lg text-white relative overflow-hidden`}>
            <div className="relative z-10"><h3 className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-wider">{title}</h3><div className="mt-2 flex flex-col"><span className="text-xl md:text-3xl font-bold tracking-tight">{value}</span>{subtitle && <span className="text-[10px] text-white/70 mt-1 font-medium">{subtitle}</span>}</div></div>
            <div className={`absolute ${isRTL ? '-left-6' : '-right-6'} -bottom-6 w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full blur-2xl`}></div>
        </div>
    );
};
