export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ITERATE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AttendanceStatus = 'NOT_STARTED' | 'WORKING' | 'PAUSED' | 'CHECKED_OUT';

export type MeetingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'SCHEDULED' | 'INSTANT';
export type ParticipantResponseStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'JOINED';

export type NotificationType =
  | 'ANNOUNCEMENT'
  | 'CHAT_MESSAGE'
  | 'MEETING_INVITE'
  | 'GROUP_INVITE'
  | 'PROJECT_INVITE'
  | 'TASK_ASSIGNED'
  | 'SYSTEM';

export interface Department {
  id: string;
  name: string;
  workspaceId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  workspaceId: string;
  employeeId?: string | null;
  phone?: string | null;
  position?: string | null;
  joiningDate?: string | null;
  location?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  profilePhoto?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string; // 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED'
  priority: string; // 'LOW', 'MEDIUM', 'HIGH'
  progress: number;
  startDate?: string | null;
  deadline?: string | null;
  isArchived: boolean;
  workspaceId: string;
  createdById?: string | null;
  createdBy?: User | null;
  managerId?: string | null;
  manager?: User | null;
  members?: ProjectMember[];
  tasks?: Task[];
  _count?: {
    tasks?: number;
    members?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  projectId: string;
  project?: Project;
  createdById?: string | null;
  createdBy?: User | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimerSegment {
  id: string;
  attendanceId: string;
  startedAt: string;
  endedAt?: string | null;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  totalSeconds: number;
  status: AttendanceStatus;
  timerSegments?: TimerSegment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string | null;
  user?: User | null;
  email?: string | null;
  participantType: 'INTERNAL' | 'EXTERNAL';
  responseStatus: ParticipantResponseStatus;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  agenda?: string | null;
  workspaceId: string;
  organizerId: string;
  organizer?: User;
  meetingType: MeetingType;
  status: MeetingStatus;
  googleEventId?: string | null;
  googleMeetSpaceId?: string | null;
  meetingUrl?: string | null;
  startTime: string;
  endTime: string;
  participants?: MeetingParticipant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  message?: string | null;
  link?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthLoginResponse {
  user: User;
  accessToken: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType?: string;
  size?: number;
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  snippet?: string;
  body?: string;
  date?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
  attachments?: EmailAttachment[];
  draftId?: string;
}

