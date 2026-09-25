export type UserRole = 'user' | 'admin' | 'moderator';

export interface UserAccount {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  fullName: string;
  gender: 'woman' | 'man' | 'other';
  dateOfBirth: string;
}

export interface FaithDetails {
  religion: string;
  denomination: string;
  church: string;
  baptismStatus: string;
  baptismYear?: number | null;
  churchInvolvement: string;
  ministryInvolvement: string;
  spiritualExpectations: string;
  faithDescription: string;
}

export interface EducationDetails {
  qualification: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
}

export interface CareerDetails {
  occupation: string;
  company: string;
  workLocation: string;
  employmentStatus: string;
  workingAbroad: boolean;
  country: string;
}

export interface FamilyDetails {
  familyStatus: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblings: string;
  background: string;
  values: string;
}

export interface PartnerPreferences {
  ageMin: number;
  ageMax: number;
  locations: string[];
  denomination: string;
  education: string;
  occupation: string;
  workLocation: string;
  familyValues: string;
  spiritualExpectations: string;
  other: string;
}

export interface ProfilePhoto {
  id: string;
  objectPath?: string;
  url: string;
  isPrimary: boolean;
  visibility: 'all_members' | 'connections_only' | 'private';
  sortOrder?: number;
}

export interface MatrimonyProfile {
  id: string;
  userId?: string;
  displayName: string;
  dateOfBirth: string;
  age: number;
  gender: 'woman' | 'man' | 'other';
  heightCm: number;
  weightKg?: number | null;
  motherTongue: string;
  maritalStatus: string;
  location: string;
  country: string;
  introduction: string;
  published: boolean;
  verificationStatus: 'unverified' | 'under_review' | 'verified' | 'rejected';
  verificationNote?: string;
  faith: FaithDetails;
  education: EducationDetails;
  career: CareerDetails;
  family: FamilyDetails;
  preferences: PartnerPreferences;
  photos: ProfilePhoto[];
  reasons?: string[];
  saved?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  delivered?: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAge: number;
  participantLocation: string;
  participantPhoto: string;
  participantOccupation: string;
  participantDenomination: string;
  status: 'active' | 'ended' | 'blocked';
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface NotificationItemData {
  id: string;
  type: 'new_interest' | 'interest_accepted' | 'new_message' | 'profile_verified' | 'profile_viewed' | 'new_match';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface InterestRecord {
  id: string;
  profileId: string;
  displayName: string;
  age: number;
  location: string;
  primaryPhotoUrl?: string;
  status: 'pending' | 'accepted' | 'declined';
  direction: 'incoming' | 'outgoing';
  mutual: boolean;
  createdAt: string;
}

export interface PrivacySettingsState {
  profileVisible: boolean;
  photoVisibility: 'all_members' | 'connections_only' | 'private';
  contactVisibility: 'connections_only' | 'private';
  showOnlineStatus: boolean;
  interestPermissions: 'all_members' | 'preferred_matches';
}

export interface SubscriptionInfo {
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  interestsQuota: number;
  interestsRemaining: number;
  canViewContact: boolean;
  canUseAdvancedFilters: boolean;
  hasProfileBoost: boolean;
}
