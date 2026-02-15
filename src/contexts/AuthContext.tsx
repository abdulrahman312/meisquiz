import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { AppUser, QuizUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  loginEmployee: (employeeId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase Auth changes (Admins)
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          role: 'admin',
          email: firebaseUser.email || '',
        });
        setLoading(false);
      } else {
        // If not admin, check if we have a persisted employee session in localStorage
        const storedEmployee = localStorage.getItem('employeeSession');
        if (storedEmployee) {
          setUser(JSON.parse(storedEmployee));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    await auth.signInWithEmailAndPassword(email, pass);
    localStorage.removeItem('employeeSession'); // Clear employee session if admin logs in
  };

  const loginEmployee = async (employeeId: string) => {
    setLoading(true);
    try {
      // v8 syntax: db.collection().where().get()
      const querySnapshot = await db.collection('users').where('employeeId', '==', employeeId).get();
      
      if (querySnapshot.empty) {
        throw new Error('Employee ID not found.');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as QuizUser;
      
      const appUser: AppUser = {
        uid: userDoc.id,
        role: 'employee',
        name: userData.name,
        employeeId: userData.employeeId,
        department: userData.department
      };

      setUser(appUser);
      localStorage.setItem('employeeSession', JSON.stringify(appUser));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user?.role === 'admin') {
      await auth.signOut();
    } else {
      localStorage.removeItem('employeeSession');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAdmin, loginEmployee, logout }}>
      {children}
    </AuthContext.Provider>
  );
};