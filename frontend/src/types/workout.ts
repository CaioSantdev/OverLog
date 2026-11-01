export const SET_TYPES = { warmup: 'Aquecimento', feeder: 'Feeder', work: 'Work Set', backoff: 'Backoff Set', failure: 'Falha' } as const;
export type PlannedSet = { id?: string; set_type: keyof typeof SET_TYPES; target_repetitions: number; target_weight: string | null };
export type Exercise = { id?: string; name: string; sets: PlannedSet[] };
export type WorkoutInput = { name: string; exercises: Exercise[] };
export type Workout = WorkoutInput & { id: string; position: number; created_at: string; updated_at: string };
export function workoutInput(workout: Workout): WorkoutInput {
  return { name: workout.name, exercises: workout.exercises.map(exercise => ({
    id: exercise.id, name: exercise.name, sets: exercise.sets.map(set => ({
      id: set.id, set_type: set.set_type, target_repetitions: set.target_repetitions, target_weight: set.target_weight,
    })),
  })) };
}
