
export type Difficulty = 'Easy' | 'Intermediate' | 'Hard';

export interface Exam {
  id: string;
  name: string;
  description: string;
  tests: string;
  questions: string;
  difficulty: Difficulty;
  icon?: string;
}

export interface State {
  id: string;
  name: string;
  slug: string;
  code: string;
  examCount: number;
}

export const CATEGORIES = [
  { id: 'ssc', title: 'SSC', slug: 'ssc', description: 'Staff Selection Commission' },
  { id: 'railway', title: 'Railway', slug: 'railway', description: 'RRB NTPC, Group D & more' },
  { id: 'banking', title: 'Banking', slug: 'banking', description: 'SBI, IBPS, RBI exams' },
  { id: 'upsc', title: 'UPSC', slug: 'upsc', description: 'Civil Services & IAS' },
  { id: 'defence', title: 'Defence', slug: 'defence', description: 'NDA, CDS, Air Force' },
  { id: 'state-exams', title: 'State Exams', slug: 'state', description: 'BPSC, UPPCS, WBPSC' },
  { id: 'police', title: 'Police', slug: 'police', description: 'SI, Constable exams' },
  { id: 'teaching', title: 'Teaching', slug: 'teaching', description: 'TET, CTET, B.Ed' },
  { id: 'engineering', title: 'Engineering', slug: 'engineering', description: 'GATE, IES, JE exams' },
  { id: 'medical', title: 'Medical', slug: 'medical', description: 'NEET, AIIMS, Nursing' }
];

export const EXAMS_BY_CATEGORY: Record<string, Exam[]> = {
  ssc: [
    { id: 'cgl', name: 'SSC CGL', description: 'Combined Graduate Level Exam', tests: '250+', questions: '15,000+', difficulty: 'Intermediate' },
    { id: 'chsl', name: 'SSC CHSL', description: 'Combined Higher Secondary Level', tests: '200+', questions: '14,000+', difficulty: 'Easy' },
    { id: 'gd', name: 'SSC GD', description: 'General Duty Constable', tests: '150+', questions: '10,000+', difficulty: 'Easy' },
    { id: 'mts', name: 'SSC MTS', description: 'Multi Tasking Staff', tests: '120+', questions: '8,000+', difficulty: 'Easy' },
    { id: 'cpo', name: 'SSC CPO', description: 'Central Police Organization', tests: '100+', questions: '7,500+', difficulty: 'Intermediate' },
    { id: 'steno', name: 'SSC Stenographer', description: 'Grade C & D Exam', tests: '80+', questions: '5,000+', difficulty: 'Intermediate' },
  ],
  railway: [
    { id: 'ntpc', name: 'RRB NTPC', description: 'Non-Technical Popular Categories', tests: '180+', questions: '10,000+', difficulty: 'Intermediate' },
    { id: 'group-d', name: 'RRB Group D', description: 'Level 1 Posts', tests: '150+', questions: '9,000+', difficulty: 'Easy' },
    { id: 'tech', name: 'RRB Technician', description: 'Technical Grade III', tests: '100+', questions: '7,000+', difficulty: 'Intermediate' },
    { id: 'je', name: 'RRB JE', description: 'Junior Engineer', tests: '120+', questions: '8,500+', difficulty: 'Hard' },
    { id: 'rpf', name: 'RPF Constable', description: 'Railway Protection Force', tests: '90+', questions: '6,000+', difficulty: 'Easy' },
    { id: 'alp', name: 'RRB ALP', description: 'Assistant Loco Pilot', tests: '110+', questions: '7,500+', difficulty: 'Intermediate' },
  ],
  banking: [
    { id: 'sbi-po', name: 'SBI PO', description: 'Probationary Officer', tests: '150+', questions: '12,000+', difficulty: 'Hard' },
    { id: 'ibps-po', name: 'IBPS PO', description: 'Institute of Banking Personnel Selection', tests: '140+', questions: '11,000+', difficulty: 'Hard' },
    { id: 'sbi-clerk', name: 'SBI Clerk', description: 'Junior Associates', tests: '160+', questions: '13,000+', difficulty: 'Easy' },
    { id: 'rbi-grade-b', name: 'RBI Grade B', description: 'Reserve Bank of India', tests: '80+', questions: '5,000+', difficulty: 'Hard' },
  ]
};

export const STATES: State[] = [
  { id: 'bihar', name: 'Bihar', slug: 'bihar', code: 'BH', examCount: 12 },
  { id: 'up', name: 'Uttar Pradesh', slug: 'up', code: 'UP', examCount: 15 },
  { id: 'wb', name: 'West Bengal', slug: 'wb', code: 'WB', examCount: 8 },
  { id: 'rj', name: 'Rajasthan', slug: 'rj', code: 'RJ', examCount: 10 },
  { id: 'mh', name: 'Maharashtra', slug: 'mh', code: 'MH', examCount: 14 },
  { id: 'mp', name: 'Madhya Pradesh', slug: 'mp', code: 'MP', examCount: 11 },
];

export const STATE_EXAMS: Record<string, Exam[]> = {
  bihar: [
    { id: 'bpsc', name: 'BPSC', description: 'Bihar Public Service Commission', tests: '100+', questions: '7,000+', difficulty: 'Hard' },
    { id: 'bihar-police', name: 'Bihar Police', description: 'Constable Recruitment', tests: '80+', questions: '5,000+', difficulty: 'Easy' },
    { id: 'bihar-si', name: 'Bihar SI', description: 'Sub Inspector', tests: '90+', questions: '6,500+', difficulty: 'Intermediate' },
    { id: 'bihar-daroga', name: 'Bihar Daroga', description: 'State SI Exam', tests: '75+', questions: '5,500+', difficulty: 'Intermediate' },
    { id: 'bihar-stet', name: 'Bihar STET', description: 'Teachers Eligibility Test', tests: '60+', questions: '4,000+', difficulty: 'Intermediate' },
    { id: 'bihar-court', name: 'Bihar Civil Court', description: 'Clerk, Peon & Stenographer', tests: '50+', questions: '3,500+', difficulty: 'Easy' },
  ],
  up: [
    { id: 'uppsc', name: 'UPPSC', description: 'UP Public Service Commission', tests: '110+', questions: '8,000+', difficulty: 'Hard' },
    { id: 'up-police', name: 'UP Police', description: 'Constable & SI', tests: '120+', questions: '9,000+', difficulty: 'Intermediate' },
  ]
};
