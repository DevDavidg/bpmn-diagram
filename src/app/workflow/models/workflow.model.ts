export type NodeType = 'start' | 'end' | 'task' | 'subtask' | 'decision';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  text: string;
  x: number;
  y: number;
  color: string;
  input: string | null;
  output: string | null;
  peso?: number;
  incidents?: number;
  time?: number;
  instances?: number
  description?: string;
  assignedRole?: string;
  priority?: 'Baja' | 'Media' | 'Alta';
  status?: string;
  estimatedTime?: string;
  dueDate?: string;

  decisionType?: string;
  decisionCriteria?: string;

  caseGUID?: string;
  idWorkflow?: string;
  wiCreationDate?: string;
  tskDisplayName?: string;
  tskDescription?: string;
  tskHelpText?: string;

  [key: string]: any;
}

export type TransitionType = 'Automática' | 'Condicional' | 'Manual';

export interface WorkflowTransition {
  idTransition: string;
  trName: string;
  trDescription: string;
  idTaskFrom: string;
  idTaskTo: string;
  DiagramXPos: number;
  DiagramYPos: number;
  DiagramWidth: number;
  DiagramHeight: number;

  transitionType?: TransitionType;
  conditions?: string;
  systemRule?: string;
  timeoutDays?: number;
  timeoutAction?: string;
  priority?: string;
  notificationType?: string;
  acceptanceTypes?: string;
  followUpDays?: number;
  reminderTemplate?: string;
  frequency?: string;
  requiresApproval?: boolean;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  createdBy?: string;
  createdDate?: string;
  lastModified?: string;
  tags?: string[];
  category?: string;
}

export const NODE_CONFIG = {
  width: 120,
  height: 60,
  zIndex: 10,
  types: {
    start: {
      width: 120,
      height: 60,
      borderRadius: '30px',
      color: '#28a745',
    },
    end: {
      width: 120,
      height: 60,
      borderRadius: '30px',
      color: '#343a40',
    },
    task: {
      width: 120,
      height: 60,
      borderRadius: '5px',
      color: '#007bff',
    },
    subtask: {
      width: 100,
      height: 50,
      borderRadius: '5px',
      color: '#6c757d',
    },
    decision: {
      width: 120,
      height: 60,
      borderRadius: '5px',
      color: '#ffc107',
    },
  },

  stateColors: {
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    primary: '#007bff',
    secondary: '#6c757d',
    dark: '#343a40',
    orange: '#fd7e14',
    teal: '#20c997',
    purple: '#6f42c1',
  },
};

export const CONNECTION_CONFIG = {
  zIndex: 5,
  padding: 30,
  minWidth: 100,
  minHeight: 50,

  types: {
    standard: {
      stroke: '#666',
      strokeWidth: 2,
      markerSize: 6,
    },
    highlighted: {
      stroke: '#007bff',
      strokeWidth: 3,
      markerSize: 7,
    },
    conditional: {
      stroke: '#ffc107',
      strokeWidth: 2,
      markerSize: 6,
      dashArray: '5,3',
    },
    automated: {
      stroke: '#28a745',
      strokeWidth: 2,
      markerSize: 6,
    },
  },

  text: {
    fontSize: 10,
    padding: 2,
    backgroundColor: 'black',
  },
};
