/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User and Profile types
export interface IUser {
  _id: string;
  email: string;
  passwordHash?: string;
  name: string;
  bio?: string;
  occupation?: string;
  experience?: string;
  skills?: string[];
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  profilePic?: string; // base64 or URL
  coverImage?: string; // base64 or URL
  createdAt: string;
  updatedAt: string;
}

// Session planner details
export interface ISession {
  _id: string;
  userId: string;
  sessionName: string;
  topicName: string;
  sessionType: 'Tutorial' | 'Class' | 'Workshop' | 'Meeting' | 'Seminar' | 'Training';
  date: string;
  time: string;
  duration: number; // in minutes
  
  // Audience
  audienceAgeGroup: string;
  isBeginner: boolean;
  isIntermediate: boolean;
  isAdvanced: boolean;
  attendeesCount: number;
  
  // Details
  description: string;
  learningObjectives: string;
  keyConcepts: string;
  topicsToCover: string;
  expectedOutcome: string;
  
  // Style & Level
  teachingStyle: 'Formal' | 'Friendly' | 'Interactive' | 'Story Based' | 'Practical';
  difficultyLevel: 'Easy' | 'Medium' | 'Advanced';
  additionalNotes?: string;

  // Generated AI Content
  aiPlan?: IAISessionPlan;
  
  createdAt: string;
  updatedAt: string;
}

// AI Plan structure
export interface IAISessionPlan {
  timeline: {
    title: string;
    duration: number; // minutes
    description: string;
  }[];
  speakerNotes: {
    section: string;
    whatToSpeak: string;
    howToExplain: string;
    examples: string[];
    questionsToAsk: string[];
  }[];
  teachingStrategy: {
    iceBreakers: string[];
    activities: string[];
    engagementIdeas: string[];
  };
  generatedAt: string;
}

// Speaker coaching/evaluation details
export interface IPracticeEvaluation {
  _id: string;
  userId: string;
  sessionId?: string; // optional reference to a planned session
  sessionTitle: string;
  transcript: string;
  durationSeconds: number;
  
  // Scores
  overallScore: number;
  confidenceScore: number;
  communicationScore: number;
  engagementScore: number;
  
  // Speech Quality
  speechQuality: {
    clarity: string;
    confidence: string;
    speed: string; // e.g. "Optimal (~130 wpm)", "Too fast"
    fillerWords: string[];
    fillerCount: number;
    tone: string;
  };
  
  // Analysis
  presentationAnalysis: {
    topicCoverage: string;
    engagementLevel: string;
    communicationStyle: string;
  };
  
  // Bulleted lists of feedback
  feedback: {
    pros: string[];
    cons: string[];
    suggestions: string[];
  };
  
  evaluatedAt: string;
}

// Upcoming sessions list view & notifications settings
export interface IUpcomingSession {
  _id: string;
  userId: string;
  title: string;
  topic: string;
  date: string;
  time: string;
  duration: number;
  description?: string;
  location?: string;
  alertReminder?: boolean;
  notifiedOneDay?: boolean;
  notifiedOneHour?: boolean;
  notifiedTenMinutes?: boolean;
}

// Notification history logs
export interface INotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'reminder';
  read: boolean;
  createdAt: string;
}

// Client theme states
export type ThemeMode = 'light' | 'dark';

export interface IProfileSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  reminderIntervals: {
    oneDay: boolean;
    oneHour: boolean;
    tenMinutes: boolean;
  };
}
