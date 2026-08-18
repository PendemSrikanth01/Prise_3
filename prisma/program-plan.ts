import { ProgramActionCategory, ProgramActionLifecycle, ProgramActionStatus, ProgramCoverageType } from '@prisma/client';

export const PROGRAM_PHASES = [
  { phase: 1, name: 'Foundation & Alignment', items: [
    'Outreach & Lead Generation', 'Application Management', 'Screening Process', 'Jury & Pitch Process', 'Onboarding & Cohort Setup',
    'Preparatory works for Program Kickoff & Workshop', 'PrISE 3.0 Launch (24th July)', 'W1: Introduction to Impact Model & Pitch Fundamentals',
    'Collecting Signed Agreements', 'Baseline & Data Collections', 'Baseline Analysis', 'Payment Commitments', 'Mentor Onboarding',
    'Milestones Setting & Discussion with Incubatees', 'Intern Onboarding', 'Mentor Mapping & Alignment',
  ] },
  { phase: 2, name: 'Impact Model', items: [
    'Preparatory works for W2', 'W2: Theory of Change & Impact Metrics', 'Collecting Feedback and Assigned Tasks',
    'Problem & Beneficiary Clarity', 'Theory of Change Development', 'Brand Positioning & Impact Communication — Masterclass', 'Impact Metrics Design',
  ] },
  { phase: 3, name: 'Business Model & Financial Basics', items: [
    'Preparatory works for W3', 'W3: Business Model & Unit Economics', 'Business Model Structuring', 'Value Chain Mapping', 'Unit Economics Deep Dive',
    'Impact–Finance Linkage — Masterclass', 'Financial Modelling', 'Break-Even & Sustainability', 'Cash Flow Management',
  ] },
  { phase: 4, name: 'Marketing & Sales Strategy', items: [
    'Preparatory works for W4', 'W4: Go-To-Market Strategy', 'Customer Understanding', 'Competitive Analysis', 'Value Proposition',
    'Customer Journey Mapping', 'Pricing Validation', 'Sales Metrics Tracking', 'Partnership Building, Ecosystem Mapping & Network Building — Masterclass',
  ] },
  { phase: 5, name: 'Growth Plan', items: [
    'Preparatory works for W5', 'W5: Growth Strategy & Scaling', 'Growth Strategy Design', 'Financial Integration', 'Scenario Planning',
    'Growth Narrative', 'Data-Driven Decision Making — Masterclass',
  ] },
  { phase: 6, name: 'Operations & Governance', items: [
    'Preparatory works for W6', 'W6: Building Scalable Operations', 'Organization Structuring', 'HR Planning', 'Operations Audit',
    'Operational Improvements', 'AI & Digital Tools for Scaling Operations — Masterclass', 'KPI System', 'Dashboard / Automation Setup', 'Governance Strengthening',
  ] },
  { phase: 7, name: 'Fundraising & Investor Readiness', items: [
    'Preparatory works for W7', 'W7: Investor Readiness & Pitching', 'Capital Strategy', 'Fundraising Ask', 'Pitch Deck Development',
    'Investor Mapping', 'Outreach Strategy', "Due Diligence from an Investor's Perspective — Masterclass",
  ] },
  { phase: 8, name: 'Demo Day & Graduation', items: ['Mock Pitching', 'Demo Day', 'Graduation'] },
] as const;

export const BASELINE_SUBTASKS = [
  'Design and confirm the baseline template',
  'Collect baseline data from every active startup',
  'Validate gaps and inconsistent responses',
  'Store the approved baseline centrally',
  'Publish the cohort baseline summary dashboard',
] as const;

function category(title: string): ProgramActionCategory {
  const value = title.toLowerCase();
  if (value.includes('masterclass')) return ProgramActionCategory.MASTERCLASS;
  if (/^w\d:/.test(value)) return ProgramActionCategory.WORKSHOP;
  if (value.includes('mentor')) return ProgramActionCategory.MENTORING;
  if (value.includes('outreach') || value.includes('lead generation')) return ProgramActionCategory.OUTREACH;
  if (value.includes('launch') || value.includes('demo') || value.includes('graduation') || value.includes('pitching')) return ProgramActionCategory.EVENT;
  if (value.includes('baseline') || value.includes('agreement') || value.includes('payment') || value.includes('milestone')) return ProgramActionCategory.STARTUP_PROGRESS;
  if (value.includes('feedback') || value.includes('analysis') || value.includes('dashboard')) return ProgramActionCategory.REPORTING;
  return ProgramActionCategory.OPERATIONS;
}

function coverage(title: string): ProgramCoverageType {
  if (title === 'Collecting Signed Agreements') return ProgramCoverageType.AGREEMENT;
  if (title === 'Baseline & Data Collections') return ProgramCoverageType.BASELINE;
  if (title === 'Payment Commitments') return ProgramCoverageType.PAYMENT;
  if (title === 'Milestones Setting & Discussion with Incubatees') return ProgramCoverageType.MILESTONE_ASSIGNMENT;
  return ProgramCoverageType.NONE;
}

export const PROGRAM_ACTIONS = PROGRAM_PHASES.flatMap((phase) => phase.items.map((title, index) => ({
  cohort: 'PrISE 3.0', phase: phase.phase, phaseName: phase.name, title, position: index + 1,
  category: category(title), coverageType: coverage(title), isMandatory: true,
  lifecycle: phase.phase === 1 ? ProgramActionLifecycle.ACTIVE : ProgramActionLifecycle.PLANNED,
  status: title === 'Baseline & Data Collections' ? ProgramActionStatus.IN_PROGRESS : ProgramActionStatus.NOT_STARTED,
})));
