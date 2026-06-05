export interface DashboardStats {
  activeQuestionnaires: number;
  completedAssessments: number;
  currentLevel:         string | null;
  profileCompletion:    number;
}

export interface RecentActivity {
  id:          number;
  type:        string;
  description: string;
  date:        string; // ISO; el componente la formatea a relativo
  icon:        string;
}

export interface PendingAction {
  id:       number;
  title:    string;
  subtitle: string;
  route:    string;
  type:     'primary' | 'warning' | 'success' | 'info';
  icon:     string;
}

export interface SkillSummary {
  skill:          string;
  dimension:      string;
  prePercentage:  number | null;
  postPercentage: number | null;
  level:          'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | null;
  delta:          number | null;
}