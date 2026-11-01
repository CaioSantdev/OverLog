import type { PlannedSet } from './workout';

export type PerformedSet = { id: string; position: number; set_type: PlannedSet['set_type']; weight: string | null; repetitions: number; is_completed: boolean };
export type SessionExercise = { id: string; name_snapshot: string; position: number; sets: PerformedSet[] };
export type SessionSummary = { id: string; name_snapshot: string; workout_template_id: string | null; status: 'in_progress' | 'completed' | 'discarded'; started_at: string; finished_at: string | null; duration_seconds: number | null; completed_sets: number; weight_progressions?: number | null; repetition_progressions?: number | null; revision: number };
export type WorkoutSession = SessionSummary & { last_mutation_id: string | null; exercises: SessionExercise[] };
export type DraftSet = Omit<PerformedSet, 'repetitions' | 'weight'> & { repetitions: string; weight: string };
export type DraftExercise = Omit<SessionExercise, 'sets'> & { sets: DraftSet[] };
export function sessionDraft(session: WorkoutSession): DraftExercise[] {
  return session.exercises.map(ex => ({ ...ex, sets: ex.sets.map(set => ({ ...set, repetitions: String(set.repetitions), weight: set.weight ?? '' })) }));
}
export function normalizedWeight(weight: string): string {
  return weight.trim().replace(',', '.');
}
export function validDraft(draft: DraftExercise[]): boolean {
  return draft.every(ex => ex.sets.every(set => /^\d{1,3}$/.test(set.repetitions) && (set.weight.trim() === '' ? !set.is_completed : /^\d{1,5}(\.\d{1,2})?$/.test(normalizedWeight(set.weight)))));
}
export function duration(seconds: number | null): string {
  if (seconds === null) return 'Em andamento';
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
