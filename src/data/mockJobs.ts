export type JobStatus = 'active' | 'expiring' | 'expired';
export type JobCategory = 'latest' | 'admit-card' | 'results' | 'archived';

export interface Job {
  id: string;
  title: string;
  organization: string;
  department: string;
  category: JobCategory;
  status: JobStatus;
  posts: number | 'N/A';
  lastDate: string;
  notificationDate: string;
  sourceUrl: string;
  sourceDomain: string;
  isVerifiedSource: boolean;
  location: string;
  qualification: string;
  ageLimit: string;
  salary: string;
  isNew: boolean;
  tags: string[];
}

const today = new Date();
const future = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const past = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Railway Recruitment Board – Group D Vacancy',
    organization: 'Indian Railways',
    department: 'Ministry of Railways',
    category: 'latest',
    status: 'active',
    posts: 103769,
    lastDate: future(25),
    notificationDate: past(5),
    sourceUrl: 'https://www.rrbcdg.gov.in/notifications/groupd-2024.pdf',
    sourceDomain: 'rrbcdg.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: '10th Pass / ITI',
    ageLimit: '18–36 Years',
    salary: '₹18,000 – ₹56,900',
    isNew: true,
    tags: ['Railway', 'Group D', 'All India'],
  },
  {
    id: '2',
    title: 'UPSC Civil Services Examination 2025',
    organization: 'UPSC',
    department: 'Union Public Service Commission',
    category: 'latest',
    status: 'active',
    posts: 1056,
    lastDate: future(18),
    notificationDate: past(10),
    sourceUrl: 'https://upsc.gov.in/examinations/civil-services-2025',
    sourceDomain: 'upsc.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'Any Graduate',
    ageLimit: '21–32 Years',
    salary: '₹56,100 – ₹2,50,000',
    isNew: true,
    tags: ['IAS', 'IPS', 'UPSC', 'Central Govt'],
  },
  {
    id: '3',
    title: 'SSC CHSL Tier-I Recruitment 2025',
    organization: 'Staff Selection Commission',
    department: 'Ministry of Personnel',
    category: 'latest',
    status: 'expiring',
    posts: 3712,
    lastDate: future(4),
    notificationDate: past(20),
    sourceUrl: 'https://ssc.nic.in/SSCFileServer/PortalManagement/UploadedFiles/notice_chsl2025.pdf',
    sourceDomain: 'ssc.nic.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: '12th Pass',
    ageLimit: '18–27 Years',
    salary: '₹25,500 – ₹81,100',
    isNew: false,
    tags: ['SSC', 'CHSL', 'LDC', 'PA/SA'],
  },
  {
    id: '4',
    title: 'IBPS PO Recruitment – Probationary Officer',
    organization: 'IBPS',
    department: 'Banking Sector',
    category: 'latest',
    status: 'active',
    posts: 4455,
    lastDate: future(30),
    notificationDate: past(2),
    sourceUrl: 'https://www.ibps.in/wp-content/uploads/CRP_PO_XIV_Nov_2025.pdf',
    sourceDomain: 'ibps.in',
    isVerifiedSource: false,
    location: 'All India',
    qualification: 'Any Graduate',
    ageLimit: '20–30 Years',
    salary: '₹36,000 – ₹63,840',
    isNew: true,
    tags: ['Bank', 'PO', 'IBPS'],
  },
  {
    id: '5',
    title: 'NVS TGT/PGT Teacher Recruitment 2025',
    organization: 'Navodaya Vidyalaya Samiti',
    department: 'Ministry of Education',
    category: 'latest',
    status: 'active',
    posts: 1377,
    lastDate: future(15),
    notificationDate: past(7),
    sourceUrl: 'https://navodaya.gov.in/nvs/recruitment/2025/tgt-pgt.pdf',
    sourceDomain: 'navodaya.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'B.Ed / Post Graduate',
    ageLimit: '21–40 Years',
    salary: '₹47,600 – ₹1,51,100',
    isNew: false,
    tags: ['Teaching', 'TGT', 'PGT', 'Central School'],
  },
  // Admit Card Category
  {
    id: '6',
    title: 'RRB NTPC CBT-1 Admit Card 2025',
    organization: 'Indian Railways',
    department: 'Railway Recruitment Board',
    category: 'admit-card',
    status: 'active',
    posts: 'N/A',
    lastDate: future(12),
    notificationDate: past(3),
    sourceUrl: 'https://www.rrbcdg.gov.in/admit-card/ntpc-cbt1-2025.pdf',
    sourceDomain: 'rrbcdg.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: '10th / 12th / Graduate',
    ageLimit: 'N/A',
    salary: 'N/A',
    isNew: true,
    tags: ['Railway', 'NTPC', 'Admit Card'],
  },
  {
    id: '7',
    title: 'SSC CGL Tier-II Admit Card 2025',
    organization: 'Staff Selection Commission',
    department: 'Ministry of Personnel',
    category: 'admit-card',
    status: 'active',
    posts: 'N/A',
    lastDate: future(8),
    notificationDate: past(1),
    sourceUrl: 'https://ssc.nic.in/SSCFileServer/Admitcard/CGL-Tier2-2025.pdf',
    sourceDomain: 'ssc.nic.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'Graduate',
    ageLimit: 'N/A',
    salary: 'N/A',
    isNew: true,
    tags: ['SSC', 'CGL', 'Admit Card'],
  },
  // Results Category
  {
    id: '8',
    title: 'UPSC CDS (I) 2025 Written Exam Result',
    organization: 'UPSC',
    department: 'Union Public Service Commission',
    category: 'results',
    status: 'active',
    posts: 'N/A',
    lastDate: 'N/A',
    notificationDate: past(15),
    sourceUrl: 'https://upsc.gov.in/examinations/result-cds-i-2025.pdf',
    sourceDomain: 'upsc.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'N/A',
    ageLimit: 'N/A',
    salary: 'N/A',
    isNew: false,
    tags: ['UPSC', 'CDS', 'Result', 'Defence'],
  },
  {
    id: '9',
    title: 'SSC MTS Paper-I Result 2025 Declared',
    organization: 'Staff Selection Commission',
    department: 'Ministry of Personnel',
    category: 'results',
    status: 'active',
    posts: 'N/A',
    lastDate: 'N/A',
    notificationDate: past(8),
    sourceUrl: 'https://ssc.nic.in/SSCFileServer/Results/MTS-2025-Paper1.pdf',
    sourceDomain: 'ssc.nic.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'N/A',
    ageLimit: 'N/A',
    salary: 'N/A',
    isNew: true,
    tags: ['SSC', 'MTS', 'Result'],
  },
  // Archived (expired)
  {
    id: '10',
    title: 'DRDO JRF/RA Recruitment December 2024',
    organization: 'DRDO',
    department: 'Ministry of Defence',
    category: 'archived',
    status: 'expired',
    posts: 185,
    lastDate: past(45),
    notificationDate: past(90),
    sourceUrl: 'https://www.drdo.gov.in/jobs/recruitment-jrf-ra-2024.pdf',
    sourceDomain: 'drdo.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'M.Sc / M.Tech',
    ageLimit: '28–35 Years',
    salary: '₹31,000 – ₹54,000',
    isNew: false,
    tags: ['DRDO', 'Research', 'Defence', 'Expired'],
  },
  {
    id: '11',
    title: 'ISRO Scientist/Engineer SC 2024',
    organization: 'ISRO',
    department: 'Dept. of Space',
    category: 'archived',
    status: 'expired',
    posts: 526,
    lastDate: past(30),
    notificationDate: past(75),
    sourceUrl: 'https://www.isro.gov.in/Careers/isro-scientist-sc-2024.pdf',
    sourceDomain: 'isro.gov.in',
    isVerifiedSource: true,
    location: 'All India',
    qualification: 'B.E / B.Tech',
    ageLimit: '18–35 Years',
    salary: '₹56,100 – ₹1,77,500',
    isNew: false,
    tags: ['ISRO', 'Scientist', 'Space', 'Expired'],
  },
];

export const getJobsByCategory = (category: string): Job[] => {
  if (category === 'archived') {
    return mockJobs.filter(j => j.category === 'archived' || j.status === 'expired');
  }
  return mockJobs.filter(j => j.category === category && j.status !== 'expired');
};

export const getStats = () => ({
  total: mockJobs.filter(j => j.status !== 'expired').length,
  active: mockJobs.filter(j => j.status === 'active').length,
  expiringSoon: mockJobs.filter(j => j.status === 'expiring').length,
  archived: mockJobs.filter(j => j.status === 'expired').length,
  verifiedSources: mockJobs.filter(j => j.isVerifiedSource && j.status !== 'expired').length,
});
