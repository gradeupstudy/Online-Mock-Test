import { TargetExam } from '../types';

export const DEFAULT_TARGET_EXAMS: TargetExam[] = [
  {
    id: 'hp-police-constable',
    title: 'HP Police Constable & SI',
    slug: 'hp-police-constable',
    category: 'Himachal State Exams',
    icon: 'Shield',
    description: 'Specialized test series for HP Police Constable & SI recruitment featuring Hindi, English, Reasoning, Maths, Science & HP GK.',
    badgeText: 'Trending',
    is_active: true,
    is_popular: true,
    order_index: 1,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: ['demo'],
      pyq: []
    }
  },
  {
    id: 'hp-patwari',
    title: 'HP Patwari & Revenue Exam',
    slug: 'hp-patwari',
    category: 'Himachal State Exams',
    icon: 'Landmark',
    description: 'Complete mock tests and chapter practice for HP Revenue Department Patwari examination with high accuracy metrics.',
    badgeText: 'Popular',
    is_active: true,
    is_popular: true,
    order_index: 2,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'hp-high-court',
    title: 'HP High Court Clerk & Process Server',
    slug: 'hp-high-court',
    category: 'Himachal State Exams',
    icon: 'Briefcase',
    description: 'Targeted test series for Himachal Pradesh High Court sub-ordinate courts recruitment.',
    badgeText: 'Upcoming',
    is_active: true,
    is_popular: true,
    order_index: 3,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'ssc-cgl-chsl',
    title: 'SSC CGL / CHSL / MTS / GD',
    slug: 'ssc-cgl-chsl',
    category: 'Staff Selection Commission',
    icon: 'Award',
    description: 'National level practice sets for SSC exams covering Quantitative Aptitude, Reasoning, English & General Awareness.',
    badgeText: 'All India',
    is_active: true,
    is_popular: true,
    order_index: 4,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: ['demo'],
      pyq: []
    }
  },
  {
    id: 'railway-rrb-ntpc',
    title: 'Railways RRB NTPC & Group D',
    slug: 'railway-rrb-ntpc',
    category: 'Railways',
    icon: 'Train',
    description: 'Comprehensive mock tests and CBT practice for Indian Railways recruitment exams.',
    badgeText: 'High Demand',
    is_active: true,
    is_popular: true,
    order_index: 5,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'banking-ibps-sbi',
    title: 'Banking IBPS / SBI PO & Clerk',
    slug: 'banking-ibps-sbi',
    category: 'Banking & Insurance',
    icon: 'Landmark',
    description: 'Speed drills and full length preliminary & mains mock tests for Public Sector Banks & SBI.',
    badgeText: 'Standard',
    is_active: true,
    is_popular: false,
    order_index: 6,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'hppsc-hpas-allied',
    title: 'HPPSC HPAS & Allied Services',
    slug: 'hppsc-hpas-allied',
    category: 'Himachal State Exams',
    icon: 'Compass',
    description: 'In-depth Prelims paper mock tests for Himachal Pradesh Administrative Services & Naib Tehsildar.',
    badgeText: 'Executive',
    is_active: true,
    is_popular: true,
    order_index: 7,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'hp-tet-tgt',
    title: 'HP TET & TGT Commission',
    slug: 'hp-tet-tgt',
    category: 'Teaching Exams',
    icon: 'GraduationCap',
    description: 'Targeted tests for Arts, Non-Medical & Medical streams with Teaching Aptitude & Pedagogy.',
    badgeText: 'Teaching',
    is_active: true,
    is_popular: false,
    order_index: 8,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  },
  {
    id: 'general-competitive-all',
    title: 'All Competitive Exams & General GK',
    slug: 'general-competitive-all',
    category: 'General & Mixed',
    icon: 'BookOpen',
    description: 'Universal subject-wise tests, topic MCQs, and mixed full syllabus papers for all state & central exams.',
    badgeText: 'Universal',
    is_active: true,
    is_popular: true,
    order_index: 9,
    created_at: new Date().toISOString(),
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: ['demo'],
      pyq: []
    }
  }
];
