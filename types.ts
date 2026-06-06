
export interface LabEnvironment {
  projectId: string;
  username: string;
  region: string;
  zone: string;
  projectId2?: string;
  username2?: string;
}

export interface LabFix {
  remediation: string;
  commands: string[];
}

export interface LabFile {
  path: string;
  content: string;
  language: string;
}

export interface LabTask {
  id: number;
  title: string;
  description: string;
  commands: string[];
  terraformCode?: string;
  codeFiles?: LabFile[];
  framework: 'bash' | 'terraform' | 'gcloud' | 'python' | 'k8s' | 'code';
  assignedUser?: 'User 1' | 'User 2' | 'Both';
  status: 'pending' | 'completed';
  errorFeedback?: string;
  fix?: LabFix;
}

export interface LabAnalysis {
  labName: string;
  overview: string;
  strategy: string;
  infrastructureSummary: string;
  tasks: LabTask[];
  estimatedTime: string;
  workflowType: 'Native Build' | 'Full Development';
}

export interface CredlyProfile {
  name: string;
  badgeCount: number;
  isVerified: boolean;
}
