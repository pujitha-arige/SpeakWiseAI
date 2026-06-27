/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, ISession, IUpcomingSession, IPracticeEvaluation, INotification, ISimulatedEmail } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db_store.json');

// Global Database Connection State
export let isUsingMongoDB = false;

// Initialize Mongo if URI is present
const MONGODB_URI = process.env.MONGODB_URI;

// Definitions for Mongoose Schemas if MongoDB is active
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  bio: { type: String, default: '' },
  occupation: { type: String, default: '' },
  experience: { type: String, default: '' },
  skills: { type: [String], default: [] },
  socialLinks: {
    website: String,
    linkedin: String,
    twitter: String,
    github: String,
  },
  profilePic: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String, default: '' },
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  sessionName: { type: String, required: true },
  topicName: { type: String, required: true },
  sessionType: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true },
  audienceAgeGroup: { type: String, required: true },
  isBeginner: { type: Boolean, default: false },
  isIntermediate: { type: Boolean, default: false },
  isAdvanced: { type: Boolean, default: false },
  attendeesCount: { type: Number, required: true },
  description: { type: String, required: true },
  learningObjectives: { type: String, required: true },
  keyConcepts: { type: String, required: true },
  topicsToCover: { type: String, required: true },
  expectedOutcome: { type: String, required: true },
  teachingStyle: { type: String, required: true },
  difficultyLevel: { type: String, required: true },
  additionalNotes: String,
  aiPlan: {
    timeline: [{
      title: String,
      duration: Number,
      description: String,
    }],
    speakerNotes: [{
      section: String,
      whatToSpeak: String,
      howToExplain: String,
      examples: [String],
      questionsToAsk: [String],
    }],
    teachingStrategy: {
      iceBreakers: [String],
      activities: [String],
      engagementIdeas: [String],
    },
    generatedAt: String,
  },
}, { timestamps: true });

const UpcomingSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true },
  description: String,
  notifiedOneDay: { type: Boolean, default: false },
  notifiedOneHour: { type: Boolean, default: false },
  notifiedTenMinutes: { type: Boolean, default: false },
}, { timestamps: true });

const PracticeEvaluationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  sessionId: String,
  sessionTitle: { type: String, required: true },
  transcript: { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  overallScore: { type: Number, required: true },
  confidenceScore: { type: Number, required: true },
  communicationScore: { type: Number, required: true },
  engagementScore: { type: Number, required: true },
  speechQuality: {
    clarity: String,
    confidence: String,
    speed: String,
    fillerWords: [String],
    fillerCount: Number,
    tone: String,
  },
  presentationAnalysis: {
    topicCoverage: String,
    engagementLevel: String,
    communicationStyle: String,
  },
  feedback: {
    pros: [String],
    cons: [String],
    suggestions: [String],
  },
  evaluatedAt: { type: String, required: true },
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const SimulatedEmailSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  sentAt: { type: String, required: true },
}, { timestamps: true });

// Declare Mongoose Models
let MongoUser: mongoose.Model<any>;
let MongoSession: mongoose.Model<any>;
let MongoUpcomingSession: mongoose.Model<any>;
let MongoPracticeEvaluation: mongoose.Model<any>;
let MongoNotification: mongoose.Model<any>;
let MongoSimulatedEmail: mongoose.Model<any>;

export async function connectDB() {
  if (MONGODB_URI) {
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      await mongoose.connect(MONGODB_URI);
      isUsingMongoDB = true;
      console.log('Mongoose connected successfully to MongoDB Atlas.');
      
      // Initialize Models
      MongoUser = mongoose.model('User', UserSchema);
      MongoSession = mongoose.model('Session', SessionSchema);
      MongoUpcomingSession = mongoose.model('UpcomingSession', UpcomingSessionSchema);
      MongoPracticeEvaluation = mongoose.model('PracticeEvaluation', PracticeEvaluationSchema);
      MongoNotification = mongoose.model('Notification', NotificationSchema);
      MongoSimulatedEmail = mongoose.model('SimulatedEmail', SimulatedEmailSchema);
    } catch (err) {
      console.error('Failed to connect to MongoDB. Falling back to local JSON database storage.', err);
      isUsingMongoDB = false;
      initJsonDB();
    }
  } else {
    console.log('No MONGODB_URI found. Utilizing local JSON file-based database fallback.');
    isUsingMongoDB = false;
    initJsonDB();
  }
}

// Local JSON DB interface structure
interface ILocalDB {
  users: IUser[];
  sessions: ISession[];
  upcomingSessions: IUpcomingSession[];
  practiceEvaluations: IPracticeEvaluation[];
  notifications: INotification[];
  simulatedEmails: ISimulatedEmail[];
}

// Seed mock database with rich, realistic Pinterest-coaching sample data
const defaultHashedPassword = bcrypt.hashSync('password123', 10);

const sampleDB: ILocalDB = {
  users: [
    {
      _id: 'demo-user-id',
      email: 'demo@speakwise.ai',
      passwordHash: defaultHashedPassword,
      name: 'Elena Rostova',
      bio: 'Professional keynote speaker and corporate coach passionate about storytelling and dynamic presentation design.',
      occupation: 'Lead Communication Consultant',
      experience: '8+ Years',
      skills: ['Storytelling', 'Vocal Variety', 'Interactive Q&A', 'Slide Design', 'Anxiety Management'],
      socialLinks: {
        website: 'https://speakwise.ai',
        linkedin: 'https://linkedin.com/in/demo',
        twitter: 'https://twitter.com/demo',
        github: 'https://github.com/demo'
      },
      profilePic: '', // base64 placeholder or clean visual default
      coverImage: '',
      isVerified: true,
      verificationCode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  sessions: [
    {
      _id: 'session-1',
      userId: 'demo-user-id',
      sessionName: 'Interactive Storytelling in Corporate Seminars',
      topicName: 'Corporate Communication & Narrative Strategy',
      sessionType: 'Seminar',
      date: '2026-06-30',
      time: '14:00',
      duration: 45,
      audienceAgeGroup: 'Corporate Professionals (25-45)',
      isBeginner: false,
      isIntermediate: true,
      isAdvanced: true,
      attendeesCount: 50,
      description: 'A deeply engaging masterclass designed to show middle and senior managers how to weave compelling story frameworks into statistical slide presentations to boost memory retention.',
      learningObjectives: '1. Master the 3-act story arc for slide design\n2. Avoid death-by-bullet-points\n3. Leverage emotional anchors to close partnerships',
      keyConcepts: 'Story Arc, Hero\'s Journey in corporate, Emotional Resonance, Slide minimalism',
      topicsToCover: 'The Hero\'s Journey model, Data translation to stories, Audience-first framing, Vocal dynamics during climax',
      expectedOutcome: 'Attendees will be able to rewrite a boring financial update slide into a high-impact narrative pitch.',
      teachingStyle: 'Story Based',
      difficultyLevel: 'Medium',
      additionalNotes: 'Requires a clicker and microphone. Print handout PDFs for the workshop breakout session.',
      aiPlan: {
        timeline: [
          { title: 'The Hook & Welcome', duration: 5, description: 'Begin with a shocking statistic about human attention spans. Introduce yourself and outline the goal of the seminar.' },
          { title: 'Core Framework: The 3-Act Structure', duration: 15, description: 'Introduce the Setup, Confrontation, and Resolution template. Walk through a bad vs. good corporate pitch side-by-side.' },
          { title: 'Data Storytelling Drill', duration: 15, description: 'Form quick groups. Give them a dry spreadsheet on budget cuts and challenge them to frame it around a single human hero.' },
          { title: 'Wrap-up & Interactive Q&A', duration: 10, description: 'Summarize the three key story beats. Take questions from the audience and hand out downloadable resources.' }
        ],
        speakerNotes: [
          {
            section: 'Introduction',
            whatToSpeak: 'Before you show a single slide, look the audience in the eye and say: "In the next 45 minutes, we will double the persuasive power of your presentations."',
            howToExplain: 'Speak with deliberate, warm authority. Avoid pacing too quickly. Keep hands visible and open.',
            examples: ['Instead of saying "Here is our quarterly sales growth," say "This is the story of how three developers in Seattle saved our launch."'],
            questionsToAsk: ['Raise your hand if you have ever fallen asleep during a slide presentation.', 'What was the last memorable story you heard?']
          }
        ],
        teachingStrategy: {
          iceBreakers: ['The 30-Second Life Pitch: Have neighbors pitch their partner as an action movie hero.'],
          activities: ['Slide Redesign Challenge: Show a cluttered slide and have them sketch a 3-word version.'],
          engagementIdeas: ['Live audience hand polls', 'Staggered pauses before declaring key takeaways']
        },
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  upcomingSessions: [
    {
      _id: 'upcoming-1',
      userId: 'demo-user-id',
      title: 'Mastering the Impromptu Pitch',
      topic: 'Speaking Under Pressure',
      date: '2026-06-25',
      time: '10:00',
      duration: 30,
      description: 'Active webinar training session about dynamic Q&A defense and high-stakes elevator pitching.',
      notifiedOneDay: false,
      notifiedOneHour: false,
      notifiedTenMinutes: false,
    },
    {
      _id: 'upcoming-2',
      userId: 'demo-user-id',
      title: 'Voice Modulation and Breath Control',
      topic: 'Physical Performance',
      date: '2026-07-02',
      time: '15:30',
      duration: 60,
      description: 'Physical workshop focusing on vocal variety, pitch scales, and projection techniques.',
      notifiedOneDay: false,
      notifiedOneHour: false,
      notifiedTenMinutes: false,
    }
  ],
  practiceEvaluations: [
    {
      _id: 'eval-1',
      userId: 'demo-user-id',
      sessionId: 'session-1',
      sessionTitle: 'Interactive Storytelling in Corporate Seminars',
      transcript: 'So basically what we want to do is we want to tell a story because a story is super important. Like, we need to draw the user in, you know? And when we do that, we, um, avoid slide death. So anyway, today we will talk about the Hero\'s Journey and how it basically fits corporate presentations perfectly.',
      durationSeconds: 45,
      overallScore: 82,
      confidenceScore: 85,
      communicationScore: 80,
      engagementScore: 81,
      speechQuality: {
        clarity: 'Clear pronunciation, though vocal projection could be slightly stronger.',
        confidence: 'Strong, friendly presence. Steady pacing with pleasant inflections.',
        speed: 'Optimal (~125 words per minute). Good pacing.',
        fillerWords: ['basically', 'like', 'um', 'anyway', 'super'],
        fillerCount: 5,
        tone: 'Friendly and conversational'
      },
      presentationAnalysis: {
        topicCoverage: 'Successfully introduced the Hero\'s Journey and corporate alignment.',
        engagementLevel: 'Good conversational tone, but could use rhetorical questions early on to hook listeners.',
        communicationStyle: 'Accessible and helpful, perfect for friendly teaching styles.'
      },
      feedback: {
        pros: [
          'Excellent friendly and warm vocal tone',
          'Perfect speech speed, very easy to follow',
          'Good logical outline introduced at the start'
        ],
        cons: [
          'Used filler words like "basically" and "like" repeatedly',
          'The conclusion felt a bit rushed without a strong summary statement'
        ],
        suggestions: [
          'Practice speaking with a slow, deliberate pause instead of filler words',
          'Prepare a precise 1-sentence sign-off to wrap up with impact'
        ]
      },
      evaluatedAt: new Date().toISOString()
    }
  ],
  notifications: [
    {
      _id: 'noti-1',
      userId: 'demo-user-id',
      title: 'Welcome to SpeakWise AI!',
      message: 'Explore your pastel Pinterest-inspired coaching platform. Plan your first session or practice your delivery in real-time!',
      type: 'success',
      read: false,
      createdAt: new Date().toISOString()
    }
  ],
  simulatedEmails: []
};

// Initialize file DB
function initJsonDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(sampleDB, null, 2));
    console.log('Seeded local JSON database file at:', JSON_DB_PATH);
  } else {
    // Read and merge any structural changes
    try {
      const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf-8'));
      // Ensure essential fields exist
      if (!data.users) data.users = sampleDB.users;
      if (!data.sessions) data.sessions = sampleDB.sessions;
      if (!data.upcomingSessions) data.upcomingSessions = sampleDB.upcomingSessions;
      if (!data.practiceEvaluations) data.practiceEvaluations = sampleDB.practiceEvaluations;
      if (!data.notifications) data.notifications = sampleDB.notifications;
      if (!data.simulatedEmails) data.simulatedEmails = sampleDB.simulatedEmails;
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(sampleDB, null, 2));
    }
  }
}

// Helpers for reading/writing local JSON DB
function readLocalDB(): ILocalDB {
  try {
    return JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf-8'));
  } catch (e) {
    return sampleDB;
  }
}

function writeLocalDB(data: ILocalDB) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing JSON DB:', err);
  }
}

// Global DB CRUD abstraction wrapper
export const db = {
  users: {
    async findOne(filter: { email?: string; _id?: string }): Promise<IUser | null> {
      if (isUsingMongoDB) {
        return await MongoUser.findOne(filter).lean();
      } else {
        const local = readLocalDB();
        if (filter.email) {
          return local.users.find(u => u.email.toLowerCase() === filter.email!.toLowerCase()) || null;
        }
        if (filter._id) {
          return local.users.find(u => u._id === filter._id) || null;
        }
        return null;
      }
    },
    async create(userData: Partial<IUser>): Promise<IUser> {
      if (isUsingMongoDB) {
        const created = await MongoUser.create(userData);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newUser: IUser = {
          _id: userData._id || 'user-' + Math.random().toString(36).substr(2, 9),
          email: userData.email!,
          passwordHash: userData.passwordHash,
          name: userData.name || 'Anonymous',
          bio: userData.bio || '',
          occupation: userData.occupation || '',
          experience: userData.experience || '',
          skills: userData.skills || [],
          socialLinks: userData.socialLinks || {},
          profilePic: userData.profilePic || '',
          coverImage: userData.coverImage || '',
          isVerified: !!userData.isVerified,
          verificationCode: userData.verificationCode || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        local.users.push(newUser);
        writeLocalDB(local);
        return newUser;
      }
    },
    async findByIdAndUpdate(id: string, update: Partial<IUser>): Promise<IUser | null> {
      if (isUsingMongoDB) {
        return await MongoUser.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      } else {
        const local = readLocalDB();
        const index = local.users.findIndex(u => u._id === id);
        if (index === -1) return null;
        
        local.users[index] = {
          ...local.users[index],
          ...update,
          updatedAt: new Date().toISOString()
        };
        writeLocalDB(local);
        return local.users[index];
      }
    }
  },

  sessions: {
    async find(filter: { userId: string }): Promise<ISession[]> {
      if (isUsingMongoDB) {
        return await MongoSession.find(filter).sort({ createdAt: -1 }).lean();
      } else {
        const local = readLocalDB();
        return local.sessions
          .filter(s => s.userId === filter.userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    async findById(id: string): Promise<ISession | null> {
      if (isUsingMongoDB) {
        return await MongoSession.findById(id).lean();
      } else {
        const local = readLocalDB();
        return local.sessions.find(s => s._id === id) || null;
      }
    },
    async create(sessionData: Partial<ISession>): Promise<ISession> {
      if (isUsingMongoDB) {
        const created = await MongoSession.create(sessionData);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newSession: ISession = {
          _id: 'session-' + Math.random().toString(36).substr(2, 9),
          userId: sessionData.userId!,
          sessionName: sessionData.sessionName!,
          topicName: sessionData.topicName!,
          sessionType: sessionData.sessionType!,
          date: sessionData.date!,
          time: sessionData.time!,
          duration: Number(sessionData.duration!),
          audienceAgeGroup: sessionData.audienceAgeGroup!,
          isBeginner: !!sessionData.isBeginner,
          isIntermediate: !!sessionData.isIntermediate,
          isAdvanced: !!sessionData.isAdvanced,
          attendeesCount: Number(sessionData.attendeesCount || 0),
          description: sessionData.description || '',
          learningObjectives: sessionData.learningObjectives || '',
          keyConcepts: sessionData.keyConcepts || '',
          topicsToCover: sessionData.topicsToCover || '',
          expectedOutcome: sessionData.expectedOutcome || '',
          teachingStyle: sessionData.teachingStyle!,
          difficultyLevel: sessionData.difficultyLevel!,
          additionalNotes: sessionData.additionalNotes || '',
          aiPlan: sessionData.aiPlan,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        local.sessions.push(newSession);
        writeLocalDB(local);
        return newSession;
      }
    },
    async findByIdAndUpdate(id: string, update: Partial<ISession>): Promise<ISession | null> {
      if (isUsingMongoDB) {
        return await MongoSession.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      } else {
        const local = readLocalDB();
        const index = local.sessions.findIndex(s => s._id === id);
        if (index === -1) return null;
        local.sessions[index] = {
          ...local.sessions[index],
          ...update,
          updatedAt: new Date().toISOString()
        };
        writeLocalDB(local);
        return local.sessions[index];
      }
    },
    async findByIdAndDelete(id: string): Promise<boolean> {
      if (isUsingMongoDB) {
        const result = await MongoSession.findByIdAndDelete(id);
        return !!result;
      } else {
        const local = readLocalDB();
        const initialLen = local.sessions.length;
        local.sessions = local.sessions.filter(s => s._id !== id);
        writeLocalDB(local);
        return local.sessions.length < initialLen;
      }
    }
  },

  upcomingSessions: {
    async find(filter: { userId?: string }): Promise<IUpcomingSession[]> {
      if (isUsingMongoDB) {
        return await MongoUpcomingSession.find(filter).sort({ date: 1, time: 1 }).lean();
      } else {
        const local = readLocalDB();
        return local.upcomingSessions
          .filter(s => !filter.userId || s.userId === filter.userId)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      }
    },
    async create(data: Partial<IUpcomingSession>): Promise<IUpcomingSession> {
      if (isUsingMongoDB) {
        const created = await MongoUpcomingSession.create(data);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newUpcoming: IUpcomingSession = {
          _id: 'upcoming-' + Math.random().toString(36).substr(2, 9),
          userId: data.userId!,
          title: data.title!,
          topic: data.topic || '',
          date: data.date!,
          time: data.time!,
          duration: Number(data.duration || 30),
          description: data.description || '',
          notifiedOneDay: false,
          notifiedOneHour: false,
          notifiedTenMinutes: false,
        };
        local.upcomingSessions.push(newUpcoming);
        writeLocalDB(local);
        return newUpcoming;
      }
    },
    async findByIdAndUpdate(id: string, update: Partial<IUpcomingSession>): Promise<IUpcomingSession | null> {
      if (isUsingMongoDB) {
        return await MongoUpcomingSession.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      } else {
        const local = readLocalDB();
        const index = local.upcomingSessions.findIndex(s => s._id === id);
        if (index === -1) return null;
        local.upcomingSessions[index] = {
          ...local.upcomingSessions[index],
          ...update
        };
        writeLocalDB(local);
        return local.upcomingSessions[index];
      }
    },
    async findByIdAndDelete(id: string): Promise<boolean> {
      if (isUsingMongoDB) {
        const result = await MongoUpcomingSession.findByIdAndDelete(id);
        return !!result;
      } else {
        const local = readLocalDB();
        const initialLen = local.upcomingSessions.length;
        local.upcomingSessions = local.upcomingSessions.filter(s => s._id !== id);
        writeLocalDB(local);
        return local.upcomingSessions.length < initialLen;
      }
    }
  },

  practiceEvaluations: {
    async find(filter: { userId: string }): Promise<IPracticeEvaluation[]> {
      if (isUsingMongoDB) {
        return await MongoPracticeEvaluation.find(filter).sort({ evaluatedAt: -1 }).lean();
      } else {
        const local = readLocalDB();
        return local.practiceEvaluations
          .filter(e => e.userId === filter.userId)
          .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
      }
    },
    async create(data: Partial<IPracticeEvaluation>): Promise<IPracticeEvaluation> {
      if (isUsingMongoDB) {
        const created = await MongoPracticeEvaluation.create(data);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newEval: IPracticeEvaluation = {
          _id: 'eval-' + Math.random().toString(36).substr(2, 9),
          userId: data.userId!,
          sessionId: data.sessionId || '',
          sessionTitle: data.sessionTitle || 'Practice Demonstration',
          transcript: data.transcript || '',
          durationSeconds: Number(data.durationSeconds || 0),
          overallScore: Number(data.overallScore || 70),
          confidenceScore: Number(data.confidenceScore || 70),
          communicationScore: Number(data.communicationScore || 70),
          engagementScore: Number(data.engagementScore || 70),
          speechQuality: data.speechQuality || {
            clarity: 'N/A',
            confidence: 'N/A',
            speed: 'N/A',
            fillerWords: [],
            fillerCount: 0,
            tone: 'N/A'
          },
          presentationAnalysis: data.presentationAnalysis || {
            topicCoverage: 'N/A',
            engagementLevel: 'N/A',
            communicationStyle: 'N/A'
          },
          feedback: data.feedback || {
            pros: [],
            cons: [],
            suggestions: []
          },
          evaluatedAt: new Date().toISOString()
        };
        local.practiceEvaluations.push(newEval);
        writeLocalDB(local);
        return newEval;
      }
    },
    async findByIdAndDelete(id: string): Promise<boolean> {
      if (isUsingMongoDB) {
        const result = await MongoPracticeEvaluation.findByIdAndDelete(id);
        return !!result;
      } else {
        const local = readLocalDB();
        const initialLen = local.practiceEvaluations.length;
        local.practiceEvaluations = local.practiceEvaluations.filter(e => e._id !== id);
        writeLocalDB(local);
        return local.practiceEvaluations.length < initialLen;
      }
    }
  },

  notifications: {
    async find(filter: { userId: string }): Promise<INotification[]> {
      if (isUsingMongoDB) {
        return await MongoNotification.find(filter).sort({ createdAt: -1 }).lean();
      } else {
        const local = readLocalDB();
        return local.notifications
          .filter(n => n.userId === filter.userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    async create(data: Partial<INotification>): Promise<INotification> {
      if (isUsingMongoDB) {
        const created = await MongoNotification.create(data);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newNoti: INotification = {
          _id: 'noti-' + Math.random().toString(36).substr(2, 9),
          userId: data.userId!,
          title: data.title!,
          message: data.message!,
          type: data.type || 'info',
          read: false,
          createdAt: new Date().toISOString()
        };
        local.notifications.push(newNoti);
        writeLocalDB(local);
        return newNoti;
      }
    },
    async markAllAsRead(userId: string): Promise<boolean> {
      if (isUsingMongoDB) {
        await MongoNotification.updateMany({ userId, read: false }, { $set: { read: true } });
        return true;
      } else {
        const local = readLocalDB();
        local.notifications.forEach(n => {
          if (n.userId === userId) {
            n.read = true;
          }
        });
        writeLocalDB(local);
        return true;
      }
    },
    async delete(id: string): Promise<boolean> {
      if (isUsingMongoDB) {
        const result = await MongoNotification.findByIdAndDelete(id);
        return !!result;
      } else {
        const local = readLocalDB();
        const initialLen = local.notifications.length;
        local.notifications = local.notifications.filter(n => n._id !== id);
        writeLocalDB(local);
        return local.notifications.length < initialLen;
      }
    }
  },
  simulatedEmails: {
    async find(filter: { to: string }): Promise<ISimulatedEmail[]> {
      if (isUsingMongoDB) {
        return await MongoSimulatedEmail.find(filter).sort({ createdAt: -1 }).lean();
      } else {
        const local = readLocalDB();
        return local.simulatedEmails
          .filter(e => e.to.toLowerCase() === filter.to.toLowerCase())
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      }
    },
    async create(data: Partial<ISimulatedEmail>): Promise<ISimulatedEmail> {
      if (isUsingMongoDB) {
        const created = await MongoSimulatedEmail.create(data);
        return created.toObject();
      } else {
        const local = readLocalDB();
        const newEmail: ISimulatedEmail = {
          _id: 'email-' + Math.random().toString(36).substr(2, 9),
          to: data.to!,
          subject: data.subject!,
          body: data.body!,
          sentAt: new Date().toISOString()
        };
        local.simulatedEmails.push(newEmail);
        writeLocalDB(local);
        return newEmail;
      }
    }
  }
};
