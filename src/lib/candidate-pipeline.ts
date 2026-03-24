import type { CandidateFlowStatus } from '@/lib/types';

/** Normalize missing flowStatus to `imported` for funnel / filters. */
export function effectiveCandidateFlowStatus(
  flowStatus: string | undefined | null
): CandidateFlowStatus | 'imported' {
  if (!flowStatus || flowStatus === '') return 'imported';
  return flowStatus as CandidateFlowStatus;
}

/** Dashboard pipeline: ordered stages with labels. `interview` groups interview_sent + scheduled. */
export const PIPELINE_STAGES: readonly {
  id: string;
  label: string;
  /** Firestore flowStatus values counted in this stage (default: [id]) */
  statuses?: readonly string[];
}[] = [
  { id: 'imported', label: 'Imported' },
  { id: 'invited', label: 'Invited' },
  { id: 'registered', label: 'Registered' },
  { id: 'verified', label: 'Verified' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'interview', label: 'Interview', statuses: ['interview_sent', 'scheduled'] },
  { id: 'hired', label: 'Hired' },
];

export function statusesForPipelineStage(stageId: string): readonly string[] {
  const s = PIPELINE_STAGES.find((x) => x.id === stageId);
  return s?.statuses ?? [stageId];
}

export function candidateMatchesPipelineStage(
  flowStatus: string | undefined | null,
  stageId: string
): boolean {
  const eff = effectiveCandidateFlowStatus(flowStatus);
  const allowed = statusesForPipelineStage(stageId);
  return (allowed as readonly string[]).includes(eff);
}

export function countCandidatesByPipelineStage(
  candidates: { flowStatus?: string | null }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const stage of PIPELINE_STAGES) counts[stage.id] = 0;
  let notSelected = 0;
  for (const c of candidates) {
    const eff = effectiveCandidateFlowStatus(c.flowStatus);
    if (eff === 'not_selected') {
      notSelected += 1;
      continue;
    }
    const stage = PIPELINE_STAGES.find((st) =>
      (st.statuses ?? [st.id]).includes(eff)
    );
    if (stage) counts[stage.id] += 1;
  }
  return { ...counts, not_selected: notSelected };
}

export type FlowBadgeSpec = { label: string; bg: string; color: string };

const FLOW_BADGES: Record<string, FlowBadgeSpec> = {
  imported: { label: 'Imported', bg: '#E8E8E8', color: '#565656' },
  invited: { label: 'Invited', bg: '#E3F2FD', color: '#1565C0' },
  registered: { label: 'Registered', bg: '#EDE7F6', color: '#4D148C' },
  verified: { label: 'Verified', bg: '#E8F5E9', color: '#2E7D32' },
  in_progress: { label: 'In Progress', bg: '#FFF3E0', color: '#E65100' },
  submitted: { label: 'Submitted', bg: '#E8F5E9', color: '#2E7D32' },
  under_review: { label: 'Under Review', bg: '#EDE7F6', color: '#4D148C' },
  interview_sent: { label: 'Interview Sent', bg: '#E3F2FD', color: '#1565C0' },
  scheduled: { label: 'Scheduled', bg: '#E8F5E9', color: '#2E7D32' },
  hired: { label: 'Hired', bg: '#E8F5E9', color: '#2E7D32' },
  not_selected: { label: 'Not Selected', bg: '#FFEBEE', color: '#C62828' },
};

export function flowStatusBadge(flowStatus: string | undefined | null): FlowBadgeSpec {
  const eff = effectiveCandidateFlowStatus(flowStatus);
  return FLOW_BADGES[eff] ?? FLOW_BADGES.imported;
}

export function canStartCandidateFlow(flowStatus: string | undefined | null): boolean {
  const eff = effectiveCandidateFlowStatus(flowStatus);
  return eff === 'imported';
}
