// prisma/seed.ts
//
// Seeds real data from Incubatee_Tracker_-_PrISE_3_0.xlsx:
//   - 19 startups (startupsheets tab) with actual founder/contact/fee/onboarding data
//   - 52 milestone templates across 7 phases (Key Milestones tab)
//
// Run once after migrate: npx prisma db seed
// Re-running is safe — upserts on unique keys, won't duplicate.

import { PrismaClient, OnboardingStatus, OnboardingItemType, StartupStatus, EffortLevel, MilestoneScope } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PROGRAM_MILESTONE_TITLES = new Set([
  'Notification for incubation',
  '1st level scrutiny',
  'Jury Formation',
  'Formation of PrISE 3.0 cohort',
]);

// -----------------------------------------------------------------------
// 1. Onboarding status mapping — normalizes the sheet's raw strings
// -----------------------------------------------------------------------
function mapOnboardingStatus(raw: string | null): OnboardingStatus {
  if (!raw) return OnboardingStatus.PENDING;
  const v = raw.trim().toLowerCase();
  if (v === 'sumitted' || v === 'submitted') return OnboardingStatus.SUBMITTED;
  if (v === 'yet to submit') return OnboardingStatus.PENDING;
  if (v === 'asked to discontinue' || v === 'withdrawn') return OnboardingStatus.NA;
  return OnboardingStatus.PENDING;
}

function mapStartupStatus(agreementRaw: string | null): StartupStatus {
  if (!agreementRaw) return StartupStatus.ACTIVE;
  const v = agreementRaw.trim().toLowerCase();
  if (v === 'asked to discontinue') return StartupStatus.DISCONTINUED;
  if (v === 'withdrawn') return StartupStatus.WITHDRAWN;
  return StartupStatus.ACTIVE;
}

// -----------------------------------------------------------------------
// 2. Real startup roster — extracted directly from startupsheets tab
//    (agreement, baseline, pitch video, logo statuses map 1:1 to sheet)
// -----------------------------------------------------------------------
const STARTUPS = [
  { sNo: 1, name: 'Varahi Medicare', founderName: 'Eati Venkata Naveen Kumar', founderEmail: 'drnk9999@gmail.com', founderPhone: '9959133469', location: 'Vishakapatnam', state: 'Andhra Pradesh', sector: 'Health', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 2, name: 'MyCheckStore Private Limited', founderName: 'Satya Sai Rajeev Reddy', founderEmail: 'satyasairajeevreddygade@gmail.com', founderPhone: '8333984828', location: 'Nellore', state: 'Andhra Pradesh', sector: 'E-Commerce', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 12500, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 3, name: 'Gowar Craft LLP', founderName: 'Roushan Kumar', founderEmail: 'gowarcraftsllp@gmail.com', founderPhone: '7004121435', location: 'Ranchi', state: 'Jharkhand', sector: 'Livelihoods', legalStructure: 'Partnership', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 4, name: 'Pravikshya Education Foundation', founderName: 'Veeresh Pani', founderEmail: 'pravikshyaeducation.foundation@gmail.com', founderPhone: '9945892414', location: 'Shahapur Town', state: 'Karnataka', sector: 'Education/Skill Development', legalStructure: 'Section 8 company', actualFee: 25000, agreedFee: 15000, agreedFeeRemarks: 'Agreed to give discount of 40%, to pay 1250 for 12 months', totalFeePaid: 0, agreement: 'Sumitted', baseline: 'Yet to Submit', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 5, name: 'Tell me', founderName: 'Dr. Siddhant R. Vairagar', founderEmail: 'info@thetellme.com', founderPhone: '7588513526', location: 'Pune', state: 'Maharashtra', sector: 'Health', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 6, name: 'Wooferzz', founderName: 'Aniruddh Lakha', founderEmail: 'aniruddhlakha16@gmail.com', founderPhone: '7620839823', location: 'Nagpur', state: 'Maharashtra', sector: 'Health', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 7, name: 'Marktech Creations Private Limited (PADVERSE)', founderName: 'Manish Sagar Ramarapu', founderEmail: 'ramarapumanish@gmail.com', founderPhone: '9346833224', location: 'Hyderabad', state: 'Telangana', sector: 'Waste Management/Environment', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 20000, agreedFeeRemarks: 'Agreed to pay 2000 for 10 months', totalFeePaid: 2000, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 8, name: 'Vasanthi Electricals Pvt Ltd', founderName: 'Akhil', founderEmail: 'sales@vasanthielectricals.com', founderPhone: '7660006354', location: 'Patancheru', state: 'Telangana', sector: 'Electricity', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 20000, agreedFeeRemarks: 'Agreed to pay 20000 in two installments', totalFeePaid: 20000, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 9, name: 'Edu Roboverse', founderName: 'Visshal Srivastava', founderEmail: 'srivastavavishal491@gmail.com', founderPhone: '8452910187', location: 'Varanasi', state: 'Uttar Pradesh', sector: 'Education/Skill Development', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Yet to Submit', baseline: 'Yet to Submit', pitch: 'Yet to Submit', logo: 'Yet to Submit' },
  { sNo: 10, name: "Late Hari Dada Gare Public Library & Study Center's 'Guidance Gurukul'", founderName: 'Siddhesh Pawar', founderEmail: 'siddhesh.pawar1@gmail.com', founderPhone: '8828225656', location: 'Nashik', state: 'Uttar Pradesh', sector: 'Education/Skill Development', legalStructure: 'Non-profit organization', actualFee: 25000, agreedFee: 25000, totalFeePaid: 6250, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 11, name: 'DigitalInfraTech', founderName: 'Raj Soni', founderEmail: 'rajsonicareer01@gmail.com', founderPhone: '7051514790', location: 'Lucknow', state: 'Uttar Pradesh', sector: 'Livelihoods', legalStructure: 'Not Registered', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 12, name: 'Raasa Karts India Private Limited', founderName: 'Manik Sehgal', founderEmail: 'manik.sehgal@raasakarts.com', founderPhone: '9811259603', location: 'Noida', state: 'Uttar Pradesh', sector: 'Health', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 20000, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 13, name: 'Resha Pirul', founderName: 'Arjun Mehra', founderEmail: 'mehraarjun4286@gmail.com', founderPhone: '9084427782', location: 'Nainital', state: 'Uttarakhand', sector: 'Livelihoods', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 12500, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 14, name: 'Aqua HT', founderName: 'Jerra Swamynathan', founderEmail: 'jerraswamynathan@gmail.com', founderPhone: '9390756095', location: 'Siddipet', state: 'Telangana', sector: 'Health', legalStructure: 'Not Registered', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Yet to Submit' },
  { sNo: 15, name: 'VETFARM', founderName: 'Dr. Nileshbhai Shambhubhai Patel', founderEmail: 'pateldrnilesh@gmail.com', founderPhone: '9979857189', location: 'Panchmahal', state: 'Gujarat', sector: 'Agriculture', legalStructure: 'Partnership', actualFee: 25000, agreedFee: 25000, totalFeePaid: 25000, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
  { sNo: 16, name: 'Sahasti Solutions and Services Private Limited', founderName: 'Ushanna Shivaram Bandaru', founderEmail: 'sahastipvt.ltd2024@gmail.com', founderPhone: '9985477736', location: 'Hyderabad', state: 'Telangana', sector: 'Agriculture', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: 10000, agreedFeeRemarks: 'Agreed to pay 1000 for 10 months', totalFeePaid: 0, agreement: 'Withdrawn', baseline: 'Withdrawn', pitch: 'Withdrawn', logo: 'Withdrawn' },
  { sNo: 17, name: 'GreyMinute Dynamics Pvt Ltd', founderName: 'Sathiya Lakshmi', founderEmail: 'psathiyalakshmi5@gmail.com', founderPhone: '9384965741', location: 'Pudukkottai', state: 'Tamil Nadu', sector: 'Health', legalStructure: 'For-profit company', actualFee: 25000, agreedFee: null, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 18, name: 'Bacce Foundation', founderName: 'Sandeep Ramesh', founderEmail: 'baccetraining@gmail.com', founderPhone: '9739440889', location: 'Bengaluru', state: 'Karnataka', sector: 'Education', legalStructure: 'Non-profit organization', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Asked to Discontinue', baseline: 'Asked to Discontinue', pitch: 'Asked to Discontinue', logo: 'Asked to Discontinue' },
  { sNo: 19, name: 'Hive Harbor', founderName: 'Sushanth L Ram', founderEmail: 'sisgaya@gmail.com', founderPhone: '8978699668', location: 'Hyderabad', state: 'Telangana', sector: 'Livelihoods', legalStructure: 'Private Limited Company', actualFee: 25000, agreedFee: 25000, totalFeePaid: 0, agreement: 'Sumitted', baseline: 'Sumitted', pitch: 'Sumitted', logo: 'Sumitted' },
];

// -----------------------------------------------------------------------
// 3. Full 52-item milestone library — direct from the Key Milestones tab
// -----------------------------------------------------------------------
const MILESTONE_LIBRARY: {
  phase: number; phaseName: string; title: string; keyActivity: string; deliverable: string; effort: EffortLevel;
}[] = [
  // Phase 1 - Foundation & Alignment (11)
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Notification for incubation', keyActivity: 'Promoting PrISE 3.0 through webinars, social media posts', deliverable: 'Notification, campaign completion', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: '1st level scrutiny', keyActivity: 'Scrutinizing the suitable SEs for 2nd round application', deliverable: 'Scrutiny & sending 2nd level applications', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Jury Formation', keyActivity: 'Reachout, meetings with potential mentors', deliverable: 'Forming a jury', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Formation of PrISE 3.0 cohort', keyActivity: 'Pitch-in for the shortlisted SEs', deliverable: 'Finalised PrISE 3.0 Cohort', effort: 'HIGH' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Program Onboarding', keyActivity: 'Understand accelerator expectations and process', deliverable: 'Orientation completion', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Mentor Alignment', keyActivity: 'Introductory mentor call and relationship building', deliverable: 'Mentor agreement note', effort: 'HIGH' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Meeting Rhythm', keyActivity: 'Fix weekly meeting schedule and communication channels', deliverable: 'Meeting calendar', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Pitch Readiness', keyActivity: 'Practice 2-3 min enterprise pitch', deliverable: 'Recorded pitch', effort: 'LOW' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Enterprise Baseline', keyActivity: 'Conduct self-assessment of enterprise status', deliverable: 'Baseline assessment report', effort: 'MEDIUM' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Financial Direction', keyActivity: 'Select suitable financial model', deliverable: 'Financial model template chosen', effort: 'MEDIUM' },
  { phase: 1, phaseName: 'Foundation & Alignment', title: 'Financial Data Readiness', keyActivity: 'Compile historical financial data', deliverable: 'Financial data sheet', effort: 'MEDIUM' },

  // Phase 2 - Impact Model (4)
  { phase: 2, phaseName: 'Impact Model (Purpose & Measurement)', title: 'Mission Clarity', keyActivity: 'Define mission, problem and solution', deliverable: 'Mission-Problem-Solution statement', effort: 'MEDIUM' },
  { phase: 2, phaseName: 'Impact Model (Purpose & Measurement)', title: 'Theory of Change', keyActivity: 'Develop impact pathway and assumptions', deliverable: 'Theory of Change diagram', effort: 'MEDIUM' },
  { phase: 2, phaseName: 'Impact Model (Purpose & Measurement)', title: 'Impact Metrics', keyActivity: 'Select key indicators aligned to impact', deliverable: 'Impact metric list', effort: 'HIGH' },
  { phase: 2, phaseName: 'Impact Model (Purpose & Measurement)', title: 'Impact Communication', keyActivity: 'Visualize key impact indicators', deliverable: 'Impact metrics slide', effort: 'LOW' },

  // Phase 3 - Business Model & Financial Basics (8)
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Business Model Definition', keyActivity: 'Describe value creation and revenue logic', deliverable: 'Business model narrative / graphic', effort: 'MEDIUM' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Value Chain Mapping', keyActivity: 'Identify stakeholders and incentives', deliverable: 'Value chain diagram', effort: 'MEDIUM' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Unit Economics', keyActivity: 'Define core economic unit', deliverable: 'Unit economics model', effort: 'HIGH' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Unit Sensitivity', keyActivity: 'Test profitability variations', deliverable: 'Sensitivity analysis', effort: 'MEDIUM' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Baseline Financials', keyActivity: 'Prepare historical + projected financials', deliverable: 'Financial projections sheet', effort: 'HIGH' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Break-Even Analysis', keyActivity: 'Forecast P&L and break-even', deliverable: 'Break-even report', effort: 'MEDIUM' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Impact-Finance Link', keyActivity: 'Connect impact metrics with financial performance', deliverable: 'Impact-financial linkage note', effort: 'MEDIUM' },
  { phase: 3, phaseName: 'Business Model & Financial Basics (Viability)', title: 'Cash Flow Planning', keyActivity: 'Project cash flow and funding gap', deliverable: 'Cash flow statement', effort: 'HIGH' },

  // Phase 4 - Marketing & Sales Strategy (8)
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Target Market Clarity', keyActivity: 'Segment customers and define personas', deliverable: 'Target market profile', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Competitive Positioning', keyActivity: 'Identify competitive advantage', deliverable: 'Competitive advantage graphic', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Value Proposition', keyActivity: 'Define clear customer value', deliverable: 'Value proposition statement', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Customer Journey', keyActivity: 'Map acquisition to retention journey', deliverable: 'Customer journey map', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Channel Strategy', keyActivity: 'Identify distribution & sales channels', deliverable: 'Channel strategy plan', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Promotion Strategy', keyActivity: 'Prioritize marketing actions', deliverable: 'Promotional priorities list', effort: 'LOW' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Pricing Model', keyActivity: 'Define pricing & financing approach', deliverable: 'Pricing model document', effort: 'MEDIUM' },
  { phase: 4, phaseName: 'Marketing & Sales Strategy (Market Fit)', title: 'Sales Metrics', keyActivity: 'Define CAC, CLV and conversion indicators', deliverable: 'Marketing metrics dashboard', effort: 'MEDIUM' },

  // Phase 5 - Growth Plan & Financial Forecast (4)
  { phase: 5, phaseName: 'Growth Plan & Financial Forecast (Scaling Roadmap)', title: 'Strategic Initiatives', keyActivity: 'Identify growth drivers and milestones', deliverable: 'Strategic initiative plan', effort: 'HIGH' },
  { phase: 5, phaseName: 'Growth Plan & Financial Forecast (Scaling Roadmap)', title: 'Financial Integration', keyActivity: 'Integrate initiatives into financial model', deliverable: 'Updated projections', effort: 'HIGH' },
  { phase: 5, phaseName: 'Growth Plan & Financial Forecast (Scaling Roadmap)', title: 'Scenario Comparison', keyActivity: 'Compare growth vs baseline forecast', deliverable: 'Scenario analysis', effort: 'MEDIUM' },
  { phase: 5, phaseName: 'Growth Plan & Financial Forecast (Scaling Roadmap)', title: 'Growth Narrative', keyActivity: 'Create growth plan summary', deliverable: 'Growth strategy deck', effort: 'MEDIUM' },

  // Phase 6 - Scalable Operations & Governance (9)
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Current Organization Mapping', keyActivity: 'Develop current org chart', deliverable: 'Org structure chart', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'HR Growth Planning', keyActivity: 'Define hiring and capability needs', deliverable: 'HR plan', effort: 'HIGH' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Partner Ecosystem', keyActivity: 'Identify vendors and partners', deliverable: 'Partnership map', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Operational Gap Analysis', keyActivity: 'Assess systems and processes', deliverable: 'Gap analysis report', effort: 'HIGH' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Operational Priorities', keyActivity: 'Define top 3 operational improvements', deliverable: 'Action plan', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'KPI System', keyActivity: 'Select performance indicators', deliverable: 'KPI list', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'KPI Dashboard', keyActivity: 'Create monitoring system', deliverable: 'KPI dashboard', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Governance Strengthening', keyActivity: 'Review board effectiveness', deliverable: 'Governance review note', effort: 'MEDIUM' },
  { phase: 6, phaseName: 'Scalable Operations & Governance (Institution Building)', title: 'Board Expansion Plan', keyActivity: 'Identify skills needed in board', deliverable: 'Board composition plan', effort: 'MEDIUM' },

  // Phase 7 - Fundraising Strategy & Investor Readiness (8)
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Capital Strategy', keyActivity: 'Identify suitable funding instruments', deliverable: 'Capital comparison sheet', effort: 'MEDIUM' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Justifiable Ask', keyActivity: 'Define funding requirement logic', deliverable: 'Fundraising ask note', effort: 'MEDIUM' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Investment Deck', keyActivity: 'Develop full business plan deck', deliverable: 'Investor presentation', effort: 'HIGH' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Target Investor Mapping', keyActivity: 'Identify priority investors', deliverable: 'Investor pipeline list', effort: 'MEDIUM' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Fundraising Initiative', keyActivity: 'Design fundraising campaign', deliverable: 'Fundraising strategy', effort: 'MEDIUM' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Investor Outreach System', keyActivity: 'Create tracking dashboard', deliverable: 'Outreach tracker', effort: 'LOW' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Investor Communication', keyActivity: 'Prepare intro email & update campaign', deliverable: 'Communication templates', effort: 'LOW' },
  { phase: 7, phaseName: 'Fundraising Strategy & Investor Readiness (Capital Mobilisation)', title: 'Due Diligence Readiness', keyActivity: 'Prepare data room', deliverable: 'Due diligence checklist', effort: 'HIGH' },
];

async function main() {
  console.log('Seeding PRISE 3.0...');

  // --- 1. Program lead account (change password after first login) ---
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminEmail || !adminInitialPassword || adminInitialPassword.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_INITIAL_PASSWORD of at least 12 characters before seeding.');
  }
  const adminPasswordHash = await bcrypt.hash(adminInitialPassword, 12);
  const admin = await prisma.person.upsert({
    where: { email: adminEmail },
    update: { name: 'Program Lead', role: 'PROGRAM_LEAD', isActive: true },
    create: {
      name: 'Program Lead',
      email: adminEmail,
      role: 'PROGRAM_LEAD',
      passwordHash: adminPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`Admin account prepared: ${admin.email}`);

  // --- 2. Milestone library ---
  for (const m of MILESTONE_LIBRARY) {
    const template = {
      ...m,
      scope: PROGRAM_MILESTONE_TITLES.has(m.title) ? MilestoneScope.PROGRAM : MilestoneScope.STARTUP,
    };
    await prisma.milestoneTemplate.upsert({
      where: { phase_title: { phase: m.phase, title: m.title } },
      update: template,
      create: template,
    });
  }
  console.log(`Seeded ${MILESTONE_LIBRARY.length} milestone templates across 7 phases.`);

  // --- 3. Startups + onboarding items ---
  let startupCount = 0;
  let onboardingCount = 0;

  for (const s of STARTUPS) {
    const startupData = {
      name: s.name,
      founderName: s.founderName,
      founderEmail: s.founderEmail,
      founderPhone: s.founderPhone,
      operationLocation: s.location,
      state: s.state,
      sector: s.sector,
      legalStructure: s.legalStructure,
      actualFee: s.actualFee,
      agreedFee: s.agreedFee,
      agreedFeeRemarks: s.agreedFeeRemarks ?? null,
      totalFeePaid: s.totalFeePaid,
      status: mapStartupStatus(s.agreement),
    };
    const startup = await prisma.startup.upsert({
      where: { sNo: s.sNo },
      update: startupData,
      create: {
        sNo: s.sNo,
        ...startupData,
      },
    });
    startupCount++;

    const items: { type: OnboardingItemType; raw: string }[] = [
      { type: OnboardingItemType.AGREEMENT, raw: s.agreement },
      { type: OnboardingItemType.BASELINE, raw: s.baseline },
      { type: OnboardingItemType.PITCH_VIDEO, raw: s.pitch },
      { type: OnboardingItemType.LOGO, raw: s.logo },
      { type: OnboardingItemType.FEE_PAYMENT, raw: s.totalFeePaid && s.totalFeePaid > 0 ? 'Sumitted' : 'Yet to Submit' },
      { type: OnboardingItemType.DOCUMENT_FOLDER, raw: 'Yet to Submit' }, // not populated in source sheet yet
    ];

    for (const item of items) {
      const itemData = {
        status: mapOnboardingStatus(item.raw),
        // The source workbook contains status, but no trustworthy submission date.
        submittedAt: null,
      };
      await prisma.onboardingItem.upsert({
        where: { startupId_type: { startupId: startup.id, type: item.type } },
        update: itemData,
        create: {
          startupId: startup.id,
          type: item.type,
          ...itemData,
        },
      });
      onboardingCount++;
    }
  }

  console.log(`Seeded ${startupCount} startups with ${onboardingCount} onboarding items.`);
  console.log('Done. Store the initial administrator password securely and rotate it after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
