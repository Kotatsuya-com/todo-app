export type Urgency = 'today' | 'tomorrow' | 'later';
export type Status = 'open' | 'done';
export type Quadrant = 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important';

export interface User {
  id: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title?: string;
  body: string;
  urgency: Urgency;
  deadline?: string;
  importance_score: number;
  status: Status;
  created_at: string;
  completed_at?: string;
}

export interface Comparison {
  id: string;
  user_id: string;
  winner_id: string;
  loser_id: string;
  created_at: string;
}

export interface CompletionLog {
  id: string;
  todo_id: string;
  quadrant: Quadrant;
  completed_at: string;
}

export interface TodoWithQuadrant extends Todo {
  quadrant: Quadrant;
}

export interface ComparisonPair {
  left: Todo;
  right: Todo;
}