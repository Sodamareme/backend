export interface SessionStats {
  sessionId: string;
  name: string;
  totalLearners: number;
  activeModules: number;
}

export interface ReferentialStats {
  totalLearners: number;
  activeModules: number;
  totalCoaches: number;
  capacity: number;
  availableSpots: number;
  sessions: SessionStats[];
}