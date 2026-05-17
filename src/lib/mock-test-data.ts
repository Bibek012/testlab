
export type TestType = 'Full Test' | 'Chapter Test' | 'Subject Test' | 'Previous Year' | 'Daily Quiz' | 'Mini Mock';
export type Difficulty = 'Easy' | 'Intermediate' | 'Hard';

export interface MockTest {
  id: string;
  title: string;
  questions: number;
  marks: number;
  duration: number; // in minutes
  difficulty: Difficulty;
  language: string[];
  attempts: number;
  rating: number;
  type: TestType;
  subject?: string;
  isFree?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

export const SUBJECTS_BY_EXAM: Record<string, string[]> = {
  cgl: ['Mathematics', 'Reasoning', 'English', 'General Awareness'],
  ntpc: ['Mathematics', 'General Intelligence', 'General Awareness', 'Science', 'Current Affairs'],
  bpsc: ['General Studies', 'History', 'Geography', 'Polity', 'Economics', 'Science'],
};

export const MOCK_TESTS: MockTest[] = [
  {
    id: 'ntpc-full-1',
    title: 'RRB NTPC Full Mock Test 01',
    questions: 100,
    marks: 100,
    duration: 90,
    difficulty: 'Intermediate',
    language: ['English', 'Hindi'],
    attempts: 45000,
    rating: 4.8,
    type: 'Full Test',
    isFree: true,
    isPopular: true
  },
  {
    id: 'ntpc-full-2',
    title: 'RRB NTPC Full Mock Test 02',
    questions: 100,
    marks: 100,
    duration: 90,
    difficulty: 'Hard',
    language: ['English', 'Hindi'],
    attempts: 32000,
    rating: 4.7,
    type: 'Full Test',
    isNew: true
  },
  {
    id: 'ntpc-math-1',
    title: 'Number System Practice Set',
    questions: 25,
    marks: 25,
    duration: 20,
    difficulty: 'Easy',
    language: ['English', 'Hindi'],
    attempts: 12000,
    rating: 4.5,
    type: 'Subject Test',
    subject: 'Mathematics'
  },
  {
    id: 'ntpc-sci-1',
    title: 'Physics: Laws of Motion',
    questions: 20,
    marks: 20,
    duration: 15,
    difficulty: 'Intermediate',
    language: ['English', 'Hindi'],
    attempts: 8000,
    rating: 4.6,
    type: 'Chapter Test',
    subject: 'Science'
  },
  {
    id: 'ntpc-pyq-1',
    title: 'NTPC CBT-1 2021 Previous Year',
    questions: 100,
    marks: 100,
    duration: 90,
    difficulty: 'Intermediate',
    language: ['English', 'Hindi'],
    attempts: 55000,
    rating: 4.9,
    type: 'Previous Year',
    isPopular: true
  }
];

export const LEADERBOARD = [
  { name: 'Amit Sharma', rank: 1, score: 98.5, time: '72m', avatar: 'https://picsum.photos/seed/user1/100/100' },
  { name: 'Sneha Gupta', rank: 2, score: 97.2, time: '75m', avatar: 'https://picsum.photos/seed/user2/100/100' },
  { name: 'Rahul Varma', rank: 3, score: 96.8, time: '70m', avatar: 'https://picsum.photos/seed/user3/100/100' },
  { name: 'Priya Das', rank: 4, score: 95.5, time: '78m', avatar: 'https://picsum.photos/seed/user4/100/100' },
];
