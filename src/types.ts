export interface Quiz {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Question {
  id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  order: number;
}

export interface QuizAttempt {
  score: number;
  totalQuestions: number;
  completedAt: number;
  answers: {
    [questionId: string]: {
      selectedAnswer: string;
      isCorrect: boolean;
    };
  };
}

export interface QuizUser {
  id: string; // Firestore Doc ID
  employeeId: string;
  name: string;
  department: string;
  role: 'admin' | 'employee';
  // Map quizId to attempt data
  participations?: {
    [quizId: string]: QuizAttempt;
  };
}

export interface AppUser {
  uid: string;
  role: 'admin' | 'employee';
  displayName?: string;
  employeeId?: string;
  department?: string;
  name?: string;
  email?: string;
}
