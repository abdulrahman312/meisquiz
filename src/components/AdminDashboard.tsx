import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  Users, FileSpreadsheet, LogOut, Upload, Trash2, Plus, 
  ChevronRight, ArrowLeft, MoreVertical, Edit2, PlayCircle, StopCircle, Save, X, Eye, Download, AlertTriangle, LayoutDashboard, CheckSquare
} from 'lucide-react';
import { parseUsersExcel, parseQuestionsExcel, exportReportsToExcel, downloadUserTemplate, downloadQuestionTemplate } from '../services/excelService';
import { QuizUser, Question, Quiz } from '../types';

type Tab = 'users' | 'quiz' | 'reports';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('quiz');
  const [loading, setLoading] = useState(false);

  // --- STATE ---
  const [users, setUsers] = useState<QuizUser[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  // Quiz Management State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  
  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  
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
  const [newUser, setNewUser] = useState({ name: '', employeeId: '', department: '' });
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizActive, setNewQuizActive] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Omit<Question, 'id' | 'order'>>({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A'
  });

  // Reporting State
  const [reportQuizId, setReportQuizId] = useState<string>('');

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    fetchUsers();
    fetchQuizzes();
  }, []);

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

  // --- STAFF ACTIONS ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.collection('users').add({
        ...newUser,
        role: 'employee',
        participations: {}
      });
      setShowAddUserModal(false);
      setNewUser({ name: '', employeeId: '', department: '' });
      await fetchUsers();
    } catch (error) {
      alert("Error adding user");
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
      title: 'Remove Staff Member',
      message: 'Are you sure you want to remove this staff member? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await db.collection('users').doc(id).delete();
          setUsers(prev => prev.filter(u => u.id !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete user error:", error);
          alert("Failed to delete user. " + (error.message || ""));
        }
      }
    });
  };

  // --- QUIZ ACTIONS ---
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
      alert("Failed to update status.");
    }
  };

  const handleDeleteQuiz = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Quiz',
      message: 'Are you sure you want to delete this quiz? This will permanently delete all questions and staff results associated with it.',
      onConfirm: async () => {
        try {
          await db.collection('quizzes').doc(id).delete();
          setQuizzes(prev => prev.filter(q => q.id !== id));
          if (selectedQuiz?.id === id) setSelectedQuiz(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete quiz error:", error);
          alert("Failed to delete quiz. " + (error.message || ""));
        }
      }
    });
  };

  const selectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    await fetchQuestions(quiz.id);
  };

  // --- QUESTION ACTIONS (Inside Quiz) ---
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    try {
      const order = quizQuestions.length + 1;
      await db.collection('quizzes').doc(selectedQuiz.id).collection('questions').add({
        ...newQuestion,
        order
      });
      setShowAddQuestionModal(false);
      setNewQuestion({ text: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A' });
      await fetchQuestions(selectedQuiz.id);
    } catch (error) {
      alert("Error adding question");
    }
  };

  const handleQuestionImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedQuiz) return;
    setLoading(true);
    try {
      const parsed = await parseQuestionsExcel(e.target.files[0]);
      
      if (parsed.length === 0) {
        alert("No valid questions found. Please ensure your Excel file matches the template format.\n\nRequired Columns:\n- Question\n- Option A\n- Option B\n- Option C\n- Option D\n- Correct Answer");
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
      alert("Import failed. Please check the file format.");
    } finally {
      setLoading(false);
      e.target.value = ''; 
    }
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!selectedQuiz) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      onConfirm: async () => {
        try {
          await db.collection('quizzes').doc(selectedQuiz.id).collection('questions').doc(qId).delete();
          setQuizQuestions(prev => prev.filter(q => q.id !== qId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error("Delete question error:", error);
          alert("Failed to delete question. " + (error.message || ""));
        }
      }
    });
  };

  // --- REPORT GENERATION ---
  const getReportStats = () => {
    if (!reportQuizId) return null;
    const relevantUsers = users.filter(u => u.participations && u.participations[reportQuizId]);
    const completedUsers = relevantUsers.filter(u => u.participations![reportQuizId].score !== undefined); 
    const totalAttempts = relevantUsers.length;
    let totalScore = 0;
    let maxScorePossible = 0; 
    
    if (completedUsers.length > 0) {
       maxScorePossible = completedUsers[0].participations![reportQuizId].totalQuestions;
       completedUsers.forEach(u => {
         totalScore += u.participations![reportQuizId].score;
       });
    }

    const avgScore = totalAttempts > 0 && maxScorePossible > 0
      ? Math.round((totalScore / (totalAttempts * maxScorePossible)) * 100) 
      : 0;

    return { totalAttempts, avgScore, relevantUsers, maxScorePossible };
  };

  const reportStats = getReportStats();

  const handleExportReport = () => {
    if (!reportStats) return;
    const data = users.map(u => {
      const part = u.participations?.[reportQuizId];
      return {
        'Employee ID': u.employeeId,
        'Name': u.name,
        'Department': u.department,
        'Status': part ? 'Attempted' : 'Not Started',
        'Score': part ? `${part.score}/${part.totalQuestions}` : '-',
        'Date': part ? new Date(part.completedAt).toLocaleDateString() : '-'
      };
    });
    exportReportsToExcel(data, 'Quiz_Report');
  };


  // --- RENDER HELPERS ---
  
  if (loading && !users.length && !quizzes.length) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Branding */}
            <div className="flex items-center gap-4">
               <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="Logo" className="w-12 h-12" />
               <div className="hidden md:flex flex-col">
                 <h1 className="text-blue-800 font-bold font-arabic text-sm leading-tight">مدرسة الشرق الأوسط العالمية - المروج</h1>
                 <h2 className="text-blue-600 font-medium text-xs leading-tight">Middle East International School - AlMuruj</h2>
               </div>
               <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
               <span className="text-slate-400 font-semibold text-sm tracking-wider uppercase hidden md:block">Admin Portal</span>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
               {/* Nav Pills */}
               <div className="flex bg-slate-100 p-1 rounded-xl">
                <NavButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<CheckSquare className="w-4 h-4" />}>Quizzes</NavButton>
                <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users className="w-4 h-4" />}>Staff</NavButton>
                <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<LayoutDashboard className="w-4 h-4" />}>Reports</NavButton>
               </div>

              <button onClick={() => logout()} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- QUIZZES TAB --- */}
        {activeTab === 'quiz' && (
          <div>
            {!selectedQuiz ? (
              // LIST VIEW
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quiz Management</h2>
                    <p className="text-slate-500 mt-1">Create and manage assessments for staff.</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateQuizModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
                  >
                    <Plus className="w-5 h-5" /> Create Quiz
                  </button>
                </div>
                
                {quizzes.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LayoutDashboard className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-lg">No quizzes created yet.</p>
                    <button onClick={() => setShowCreateQuizModal(true)} className="mt-4 text-blue-600 hover:underline">Create your first quiz</button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map(q => (
                      <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${q.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                             {q.isActive ? 'Active' : 'Draft'}
                           </div>
                           
                           <button 
                             type="button"
                             onClick={(e) => { 
                               e.preventDefault();
                               e.stopPropagation(); 
                               handleDeleteQuiz(q.id); 
                             }} 
                             className="text-slate-300 hover:text-red-500 p-2 -mr-2 rounded-full hover:bg-red-50 transition-all"
                             title="Delete Quiz"
                           >
                             <Trash2 className="w-5 h-5 pointer-events-none" />
                           </button>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">{q.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 font-mono">
                           <span>ID: {q.id.substring(0,6)}</span>
                           <span>•</span>
                           <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-auto">
                          <button 
                             onClick={(e) => { e.stopPropagation(); handleToggleQuizStatus(q); }}
                             className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                               q.isActive 
                               ? 'bg-white text-red-600 border-red-100 hover:bg-red-50' 
                               : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
                             }`}
                          >
                             {q.isActive ? <StopCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                             {q.isActive ? 'Stop' : 'Publish'}
                          </button>
                          
                          <button 
                            onClick={() => selectQuiz(q)}
                            className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // DETAIL VIEW
              <div className="animate-in slide-in-from-right-4 duration-300">
                <button onClick={() => setSelectedQuiz(null)} className="mb-6 text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Quizzes
                </button>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                  {/* Detail Header */}
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedQuiz.title}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{quizQuestions.length} Questions</span>
                        <span className={`text-sm font-bold flex items-center gap-1.5 ${selectedQuiz.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${selectedQuiz.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          {selectedQuiz.isActive ? 'Live' : 'Draft Mode'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={downloadQuestionTemplate}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" /> Template
                      </button>
                      <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" /> Import
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleQuestionImport} />
                      </label>
                      <button 
                        onClick={() => setShowAddQuestionModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        <Plus className="w-4 h-4" /> Add Question
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 bg-slate-50/30">
                    {quizQuestions.length === 0 ? (
                      <div className="p-16 text-center text-slate-400">
                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                           <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="mb-1 font-medium text-slate-600">This quiz is empty.</p>
                        <p className="text-sm">Import questions from Excel or add them manually.</p>
                      </div>
                    ) : (
                      quizQuestions.map((q) => (
                        <div key={q.id} className="p-5 hover:bg-white hover:shadow-sm transition-all flex gap-5 group border-l-4 border-transparent hover:border-indigo-500">
                          <div className="flex-shrink-0 w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm">
                            {q.order}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 mb-3 text-lg">{q.text}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {Object.entries(q.options).map(([key, val]) => (
                                <div key={key} className={`px-3 py-2 rounded-lg flex items-center gap-3 border ${key === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-white border-slate-100 text-slate-500'}`}>
                                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs border ${key === q.correctAnswer ? 'border-green-300 bg-white' : 'border-slate-200 bg-slate-50'}`}>{key}</span>
                                  <span>{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              handleDeleteQuestion(q.id); 
                            }} 
                            className="text-slate-300 hover:text-red-500 self-start p-2 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Question"
                          >
                            <Trash2 className="w-5 h-5 pointer-events-none" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Staff Management</h2>
              <div className="flex gap-3">
                 <button 
                    onClick={downloadUserTemplate}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                 >
                    <Download className="w-4 h-4" /> Template
                 </button>
                 <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors">
                  <Upload className="w-4 h-4" /> Import Excel
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleUserImport} />
                </label>
                <button 
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Add Staff
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono">{u.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{u.name.charAt(0)}</div>
                        {u.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{u.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            handleDeleteUser(u.id); 
                          }} 
                          className="text-slate-300 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                     <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">No staff found. Add manually or import Excel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {/* --- REPORTS TAB --- */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Select Assessment Report</label>
                <div className="relative">
                  <select 
                    value={reportQuizId} 
                    onChange={(e) => setReportQuizId(e.target.value)}
                    className="w-full md:w-80 border-slate-200 rounded-xl shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 pl-3 pr-10 bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                  >
                    {quizzes.length === 0 && <option>No Quizzes Available</option>}
                    {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                  </select>
                </div>
              </div>
              <button 
                onClick={handleExportReport}
                disabled={!reportStats}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:shadow-none"
              >
                <FileSpreadsheet className="w-5 h-5" /> Download Excel Report
              </button>
            </div>

            {reportStats ? (
              <div className="grid gap-6 md:grid-cols-2">
                 {/* Stat Cards */}
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-indigo-100 text-sm font-semibold uppercase tracking-wider">Participation</h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{reportStats.totalAttempts}</span>
                        <span className="text-sm text-indigo-200">staff completed</span>
                      </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-6 -mb-6"></div>
                 </div>

                 <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Average Performance</h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{reportStats.avgScore}%</span>
                        <span className="text-sm text-blue-200">avg score</span>
                      </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-6 -mb-6"></div>
                 </div>
                 
                 <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Detailed Results</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                          <tr>
                             <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Staff Name</th>
                             <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Department</th>
                             <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Score</th>
                             <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Completion Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                           {reportStats.relevantUsers.map(u => {
                             const p = u.participations![reportQuizId];
                             const percentage = Math.round((p.score / p.totalQuestions) * 100);
                             return (
                               <tr key={u.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{u.name}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.department}</td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div className={`h-full rounded-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                                      </div>
                                      <span className="text-sm font-bold text-slate-700">{p.score} / {p.totalQuestions}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono text-xs">{new Date(p.completedAt).toLocaleDateString()}</td>
                               </tr>
                             );
                           })}
                           {reportStats.relevantUsers.length === 0 && (
                             <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No participation recorded yet.</td></tr>
                           )}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400">Please select an assessment from the dropdown above to generate reports.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Quiz Modal */}
      {showCreateQuizModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom-8">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">New Assessment</h3>
               <button onClick={() => setShowCreateQuizModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleCreateQuiz}>
               <div className="mb-5">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quiz Title</label>
                 <input 
                   autoFocus 
                   type="text" 
                   className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800" 
                   placeholder="e.g. Safety Protocols 2024"
                   value={newQuizTitle} 
                   onChange={e => setNewQuizTitle(e.target.value)} 
                   required 
                 />
               </div>
               
               <div className="mb-8 flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                 <input 
                    type="checkbox" 
                    id="newQuizActive"
                    checked={newQuizActive}
                    onChange={(e) => setNewQuizActive(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                 />
                 <label htmlFor="newQuizActive" className="text-sm text-slate-700 font-medium cursor-pointer select-none">Make active immediately</label>
               </div>

               <div className="flex justify-end gap-3">
                 <button type="button" onClick={() => setShowCreateQuizModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-transform active:scale-95">Create Quiz</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom-8">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">Add Staff Member</h3>
               <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleAddUser} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                 <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Employee ID</label>
                 <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="EMP-001" value={newUser.employeeId} onChange={e => setNewUser({...newUser, employeeId: e.target.value})} required />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Department</label>
                 <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="IT Dept" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} required />
               </div>
               <div className="flex justify-end gap-3 mt-8">
                 <button type="button" onClick={() => setShowAddUserModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">Add Staff</button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">Add Question</h3>
               <button onClick={() => setShowAddQuestionModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleAddQuestion} className="space-y-5">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Question Text</label>
                 <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="What is the..." value={newQuestion.text} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} required />
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => (
                    <div key={opt} className="relative">
                      <span className="absolute left-4 top-3.5 text-xs font-bold text-slate-400">Option {opt}</span>
                      <input type="text" className="w-full pl-20 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={newQuestion.options[opt]} onChange={e => setNewQuestion({...newQuestion, options: {...newQuestion.options, [opt]: e.target.value}})} required />
                    </div>
                  ))}
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correct Answer</label>
                 <div className="flex gap-2">
                   {(['A', 'B', 'C', 'D'] as const).map(opt => (
                     <button
                        type="button"
                        key={opt}
                        onClick={() => setNewQuestion({...newQuestion, correctAnswer: opt})}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newQuestion.correctAnswer === opt ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                     >
                       {opt}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => setShowAddQuestionModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">Save Question</button>
               </div>
             </form>
           </div>
        </div>
      )}

    </div>
  );
};

const NavButton = ({ active, onClick, children, icon }: { active: boolean, onClick: () => void, children: React.ReactNode, icon: React.ReactNode }) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
  >
    {icon}
    {children}
  </button>
);
