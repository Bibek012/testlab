
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
  marks: number;
  negativeMarks: number;
  dom_images?: string[];
  memory_images?: string[];
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
  examName: string;
  durationMinutes: number;
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

// Sample Data matching the specific JSON requirements
export const getSampleMockTest = (mockId: string): MockTestData => ({
  id: mockId,
  title: "RRB NTPC CBT-1 Full Mock 01",
  examName: "RRB NTPC",
  durationMinutes: 90,
  sections: [
    { id: 'sec-1', title: { en: 'Mathematics', hn: 'गणित' } },
    { id: 'sec-2', title: { en: 'General Intelligence', hn: 'सामान्य बुद्धिमत्ता' } },
    { id: 'sec-3', title: { en: 'General Awareness', hn: 'सामान्य जागरूकता' } },
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
      marks: 1,
      negativeMarks: 0.33,
    },
    {
      id: 'q2',
      sectionId: 'sec-1',
      en: "Identify the missing number in the following sequence based on the image.",
      hn: "छवि के आधार पर निम्नलिखित अनुक्रम में लुप्त संख्या की पहचान करें।",
      options: [
        { id: 'opt-2a', en: '45', hn: '45' },
        { id: 'opt-2b', en: '50', hn: '50' },
        { id: 'opt-2c', en: '55', hn: '55' },
        { id: 'opt-2d', en: '60', hn: '60' },
      ],
      answer: 'opt-2c',
      marks: 1,
      negativeMarks: 0.33,
      dom_images: ["https://picsum.photos/seed/math1/400/200"],
    },
    {
      id: 'q3',
      sectionId: 'sec-2',
      en: "Which of the following figures is the odd one out?",
      hn: "निम्नलिखित में से कौन सी आकृति विषम है?",
      options: [
        { id: 'opt-3a', en: 'Figure A', hn: 'आकृति A', image: "https://picsum.photos/seed/reasoning1/100/100" },
        { id: 'opt-3b', en: 'Figure B', hn: 'आकृति B', image: "https://picsum.photos/seed/reasoning2/100/100" },
        { id: 'opt-3c', en: 'Figure C', hn: 'आकृति C', image: "https://picsum.photos/seed/reasoning3/100/100" },
        { id: 'opt-3d', en: 'Figure D', hn: 'आकृति D', image: "https://picsum.photos/seed/reasoning4/100/100" },
      ],
      answer: 'opt-3b',
      marks: 1,
      negativeMarks: 0.33,
    }
  ]
});
