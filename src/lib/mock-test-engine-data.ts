
export interface QuestionImage {
  url: string;
  type: 'dom' | 'memory';
}

export interface Option {
  id: string;
  en: string;
  hn: string;
  en_html?: string;
  hn_html?: string;
  image?: string;
}

export interface Question {
  id: string;
  sectionId: string;
  en: string;
  hn: string;
  en_html?: string;
  hn_html?: string;
  options: Option[];
  answer: string; // The ID of the correct option
  marks?: {
    positive: number;
    negative: number;
    skip: number;
  };
  dom_images?: string[];
  memory_images?: string[];
  explanation?: {
    en: string;
    hn: string;
    en_html?: string;
    hn_html?: string;
  };
}

export interface Section {
  id: string;
  title: {
    en: string;
    hn: string;
  };
}

export interface MockTestData {
  id: string;
  title: string;
  examId: string;
  examName: string;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  fullMarks: number;
  sections: Section[];
  questions: Question[];
}

export type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-review' | 'answered-marked-review';

export interface UserResponse {
  questionId: string;
  selectedOptionId: string | null;
  status: QuestionStatus;
  timeSpentSeconds: number;
}

// Sample Data matching the standardized schema
export const getSampleMockTest = (mockId: string): MockTestData => ({
  id: mockId,
  title: "RRB NTPC CBT-1 Full Mock 01",
  examId: "rrb-ntpc",
  examName: "RRB NTPC",
  durationMinutes: 90,
  totalQuestions: 1,
  marksPerQuestion: 1,
  negativeMarks: 0.33,
  fullMarks: 1,
  sections: [
    { id: 'sec-1', title: { en: 'Mathematics', hn: 'गणित' } },
  ],
  questions: [
    {
      id: 'q1',
      sectionId: 'sec-1',
      en: "What is the value of x in the equation 2x + 5 = 15?",
      hn: "समीकरण 2x + 5 = 15 में x का मान क्या है?",
      en_html: "<p>What is the value of <strong>x</strong> in the equation 2x + 5 = 15?</p>",
      hn_html: "<p>समीकरण 2x + 5 = 15 में <strong>x</strong> का मान क्या है?</p>",
      options: [
        { id: 'opt-a', en: '5', hn: '5' },
        { id: 'opt-b', en: '10', hn: '10' },
        { id: 'opt-c', en: '15', hn: '15' },
        { id: 'opt-d', en: '20', hn: '20' },
      ],
      answer: 'opt-a',
      marks: {
        positive: 1,
        negative: 0.33,
        skip: 0
      },
      explanation: {
        en: "To solve: 2x = 15 - 5 => 2x = 10 => x = 5.",
        hn: "हल करने के लिए: 2x = 15 - 5 => 2x = 10 => x = 5.",
        en_html: "<p>2x + 5 = 15<br/>2x = 10<br/><strong>x = 5</strong></p>"
      }
    }
  ]
});
