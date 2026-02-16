import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Lock, User, AlertCircle, X, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Footer } from './Footer';

export const Login: React.FC = () => {
  const { loginEmployee, loginAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginEmployee(employeeId.trim());
    } catch (err: any) {
      console.error(err);
      setError(t('employeeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginAdmin(adminEmail, adminPass);
      setShowAdminModal(false);
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      setError(t('adminError'));
    } finally {
      setIsLoading(false);
    }
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4 relative">
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-indigo-900/80 backdrop-blur-sm"></div>

        <div className="relative w-full max-w-md">
          {/* School Header */}
          <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-700">
             <img 
               src="https://i.ibb.co/bgFrgXkW/meis.png" 
               alt="MEIS Logo" 
               className="w-24 h-24 mx-auto mb-4 drop-shadow-lg"
             />
             <h1 className="text-lg md:text-2xl font-bold text-white font-arabic tracking-wide drop-shadow-md whitespace-nowrap">
               {t('schoolNameAr')}
             </h1>
             <h2 className="text-lg font-medium text-blue-100 mt-1 tracking-tight drop-shadow-md">
               {t('schoolNameEn')}
             </h2>
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-500">
            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-white mb-1">{t('staffPortal')}</h3>
              <p className="text-blue-200 text-sm">{t('identifyYourself')}</p>
            </div>

            {error && !showAdminModal && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-50 rounded-xl flex items-start gap-3 text-sm backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmployeeLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-100 mx-1 uppercase tracking-wider">{t('employeeId')}</label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    <User className="h-5 w-5 text-blue-200 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="number"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:ring-2 focus:ring-blue-400 focus:bg-white/20 focus:border-transparent outline-none transition-all`}
                    placeholder={t('enterEmployeeId')}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('startAssessment')}</span>
                    <ArrowIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
              <button 
                onClick={() => {
                  setShowAdminModal(true);
                  setError('');
                }}
                className="text-xs text-blue-200 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <ShieldCheck className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span>{t('adminAccess')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Modal */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => {
                  setShowAdminModal(false);
                  setError('');
                }}
                className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center mb-6">
                <div className="bg-gray-900 p-3 rounded-full mb-3">
                   <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('adminLogin')}</h2>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{t('email')}</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white focus:bg-white"
                    placeholder="admin@school.com"
                    dir="ltr" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{t('password')}</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white focus:bg-white"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl shadow-lg transition-transform transform active:scale-95 disabled:opacity-70 mt-2"
                >
                  {isLoading ? t('verifying') : t('accessDashboard')}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};