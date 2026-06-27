/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectDB, db } from './server/db.js';
import { authController, authenticateJWT, AuthenticatedRequest } from './server/auth.js';
import { generateSessionPlan, evaluatePracticeSpeech, generateStoryAndAnalogy, evaluateQAResponse, analyzeSlides, detectKnowledgeGap } from './server/ai.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database (MongoDB Atlas Mongoose or JSON file-based fallback)
  await connectDB();

  // Middleware for large payloads (profile pics, files, audio data as base64)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Basic API Status Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'ready', time: new Date().toISOString() });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================
  app.post('/api/auth/signup', authController.signup);
  app.post('/api/auth/verify-email', authController.verifyEmail);
  app.post('/api/auth/login', authController.login);
  app.get('/api/auth/simulated-emails', async (req, res) => {
    try {
      const { to } = req.query;
      if (!to) {
        res.status(400).json({ error: 'Recipient email address is required.' });
        return;
      }
      const list = await db.simulatedEmails.find({ to: String(to) });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch simulated emails.' });
    }
  });
  app.post('/api/auth/forgot-password', authController.forgotPassword);
  app.post('/api/auth/reset-password', authController.resetPassword);
  app.get('/api/auth/me', authenticateJWT as any, authController.getMe as any);

  // ==========================================
  // PLANNED SESSIONS MODULE CRUD & AI GEN
  // ==========================================
  
  // Get all planned sessions for the logged-in user
  app.get('/api/sessions', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const list = await db.sessions.find({ userId: req.user!.userId });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching planned sessions.' });
    }
  });

  // Plan New Session & Automatically generate AI Plan
  app.post('/api/sessions', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionData = req.body;
      if (!sessionData.sessionName || !sessionData.topicName || !sessionData.sessionType) {
        res.status(400).json({ error: 'Session name, topic, and type are required.' });
        return;
      }

      // Generate AI Content automatically during creation
      console.log(`Generating AI Lesson Plan for: ${sessionData.sessionName}`);
      let generatedPlan = null;
      try {
        generatedPlan = await generateSessionPlan(sessionData);
      } catch (e) {
        console.error('AI plan generation error, continuing with empty plan:', e);
      }

      const newSession = await db.sessions.create({
        ...sessionData,
        userId: req.user!.userId,
        aiPlan: generatedPlan || undefined
      });

      // Add simple upcoming session automatically if date is in the future
      const today = new Date().toISOString().split('T')[0];
      if (sessionData.date && sessionData.date >= today) {
        await db.upcomingSessions.create({
          userId: req.user!.userId,
          title: sessionData.sessionName,
          topic: sessionData.topicName,
          date: sessionData.date,
          time: sessionData.time || '12:00',
          duration: Number(sessionData.duration || 45),
          description: sessionData.description || 'Auto-created from Session Planner'
        });
      }

      // Record notification
      await db.notifications.create({
        userId: req.user!.userId,
        title: 'New Session Planned',
        message: `"${newSession.sessionName}" has been successfully planned with a complete AI timeline.`,
        type: 'success'
      });

      res.status(211).json({
        message: 'Session planned and AI strategy generated.',
        session: newSession
      });
    } catch (err) {
      console.error('Session create error:', err);
      res.status(500).json({ error: 'Error planning new session.' });
    }
  });

  // Get specific session
  app.get('/api/sessions/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const session = await db.sessions.findById(req.params.id);
      if (!session || session.userId !== req.user!.userId) {
        res.status(404).json({ error: 'Session not found or unauthorized.' });
        return;
      }
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching session.' });
    }
  });

  // Update session
  app.put('/api/sessions/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const existing = await db.sessions.findById(req.params.id);
      if (!existing || existing.userId !== req.user!.userId) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }

      const updated = await db.sessions.findByIdAndUpdate(req.params.id, req.body);
      res.json({ message: 'Session updated successfully.', session: updated });
    } catch (err) {
      res.status(500).json({ error: 'Error updating session.' });
    }
  });

  // Regenerate/generate AI Lesson Plan for an existing session
  app.post('/api/sessions/:id/generate-plan', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const session = await db.sessions.findById(req.params.id);
      if (!session || session.userId !== req.user!.userId) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }

      console.log(`Explicitly regenerating plan for: ${session.sessionName}`);
      const aiPlan = await generateSessionPlan(session);
      
      const updated = await db.sessions.findByIdAndUpdate(req.params.id, { aiPlan });
      res.json({
        message: 'AI Lesson Plan successfully generated.',
        aiPlan,
        session: updated
      });
    } catch (err) {
      res.status(500).json({ error: 'Error generating AI plan.' });
    }
  });

  // Delete session
  app.delete('/api/sessions/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const session = await db.sessions.findById(req.params.id);
      if (!session || session.userId !== req.user!.userId) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }

      await db.sessions.findByIdAndDelete(req.params.id);
      res.json({ message: 'Session planner card deleted successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Error deleting session.' });
    }
  });

  // ==========================================
  // UPCOMING SESSIONS CALENDAR/LIST MODULE
  // ==========================================
  app.get('/api/upcoming-sessions', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const list = await db.upcomingSessions.find({ userId: req.user!.userId });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Error loading upcoming sessions.' });
    }
  });

  app.post('/api/upcoming-sessions', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { title, topic, date, time, duration, description } = req.body;
      if (!title || !date || !time) {
        res.status(400).json({ error: 'Title, date, and time are required for upcoming events.' });
        return;
      }

      const event = await db.upcomingSessions.create({
        userId: req.user!.userId,
        title,
        topic: topic || '',
        date,
        time,
        duration: Number(duration || 30),
        description: description || ''
      });

      res.status(211).json({ message: 'Upcoming calendar event created successfully.', event });
    } catch (err) {
      res.status(500).json({ error: 'Error creating upcoming event.' });
    }
  });

  app.put('/api/upcoming-sessions/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const existing = await db.upcomingSessions.findByIdAndUpdate(req.params.id, req.body);
      res.json({ message: 'Event updated successfully.', event: existing });
    } catch (err) {
      res.status(500).json({ error: 'Error updating event.' });
    }
  });

  app.delete('/api/upcoming-sessions/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      await db.upcomingSessions.findByIdAndDelete(req.params.id);
      res.json({ message: 'Upcoming event deleted.' });
    } catch (err) {
      res.status(500).json({ error: 'Error deleting upcoming event.' });
    }
  });

  // ==========================================
  // AI PRACTICE SPEAKER DEMO EVALUATION
  // ==========================================
  app.get('/api/evaluations', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const evaluations = await db.practiceEvaluations.find({ userId: req.user!.userId });
      res.json(evaluations);
    } catch (err) {
      res.status(500).json({ error: 'Error loading practice logs.' });
    }
  });

  app.post('/api/evaluations', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { transcript, sessionTitle, sessionId, durationSeconds } = req.body;
      if (!transcript || !sessionTitle) {
        res.status(400).json({ error: 'Transcript text and target title are required for analysis.' });
        return;
      }

      console.log(`Evaluating speech transcript for topic: ${sessionTitle}`);
      const evaluationResult = await evaluatePracticeSpeech(transcript, sessionTitle);

      const createdEvaluation = await db.practiceEvaluations.create({
        ...evaluationResult,
        userId: req.user!.userId,
        sessionId: sessionId || '',
        durationSeconds: Number(durationSeconds || evaluationResult.durationSeconds || 30)
      });

      // Notify the user of completed coaching evaluation
      await db.notifications.create({
        userId: req.user!.userId,
        title: 'Speaker Practice Evaluated',
        message: `Your speech report for "${sessionTitle}" is ready! Final Coaching Score: ${createdEvaluation.overallScore}/100.`,
        type: 'alert'
      });

      res.status(211).json({
        message: 'Practice evaluated successfully by SpeakWise AI Coach.',
        evaluation: createdEvaluation
      });
    } catch (err) {
      console.error('Coaching evaluation error:', err);
      res.status(500).json({ error: 'Internal server error analyzing the transcript.' });
    }
  });

  app.delete('/api/evaluations/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      await db.practiceEvaluations.findByIdAndDelete(req.params.id);
      res.json({ message: 'Practice evaluation report removed.' });
    } catch (err) {
      res.status(500).json({ error: 'Error removing evaluation.' });
    }
  });

  // ==========================================
  // NOTIFICATIONS HISTORY ENDPOINTS
  // ==========================================
  app.get('/api/notifications', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const list = await db.notifications.find({ userId: req.user!.userId });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Error loading notification log.' });
    }
  });

  app.post('/api/notifications/read-all', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      await db.notifications.markAllAsRead(req.user!.userId);
      res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
      res.status(500).json({ error: 'Error marking logs.' });
    }
  });

  app.delete('/api/notifications/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      await db.notifications.delete(req.params.id);
      res.json({ message: 'Notification deleted.' });
    } catch (err) {
      res.status(500).json({ error: 'Error clearing alert.' });
    }
  });

  // ==========================================
  // USER PROFILE & SYSTEM CONFIG
  // ==========================================
  app.put('/api/profile', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;

      // Filter and clean input to protect system fields
      const cleanUpdate: any = {};
      if (updateData.name) cleanUpdate.name = updateData.name;
      if (updateData.bio !== undefined) cleanUpdate.bio = updateData.bio;
      if (updateData.occupation !== undefined) cleanUpdate.occupation = updateData.occupation;
      if (updateData.experience !== undefined) cleanUpdate.experience = updateData.experience;
      if (updateData.skills !== undefined) {
        cleanUpdate.skills = Array.isArray(updateData.skills) 
          ? updateData.skills 
          : String(updateData.skills).split(',').map(s => s.trim()).filter(Boolean);
      }
      if (updateData.socialLinks) {
        cleanUpdate.socialLinks = {
          website: updateData.socialLinks.website || '',
          linkedin: updateData.socialLinks.linkedin || '',
          twitter: updateData.socialLinks.twitter || '',
          github: updateData.socialLinks.github || '',
        };
      }
      
      // Handles Profile Picture and Cover Images as direct base64 strings
      if (updateData.profilePic !== undefined) cleanUpdate.profilePic = updateData.profilePic;
      if (updateData.coverImage !== undefined) cleanUpdate.coverImage = updateData.coverImage;

      const updatedUser = await db.users.findByIdAndUpdate(userId, cleanUpdate);
      if (!updatedUser) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const userResponse = { ...updatedUser };
      delete userResponse.passwordHash;

      res.json({
        message: 'Profile settings updated successfully.',
        user: userResponse
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ error: 'Error modifying profile data.' });
    }
  });

  // ==========================================
  // SPEECH & PERFORMANCE ANALYTICS
  // ==========================================
  app.get('/api/analytics', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const sessions = await db.sessions.find({ userId });
      const evaluations = await db.practiceEvaluations.find({ userId });
      const upcoming = await db.upcomingSessions.find({ userId });

      // Aggregate Performance Metrics
      const totalSessions = sessions.length;
      const totalUpcoming = upcoming.length;
      const totalCompleted = sessions.filter(s => {
        const sched = new Date(`${s.date} ${s.time}`);
        return sched.getTime() < Date.now();
      }).length;
      const totalEvaluations = evaluations.length;

      // Calculate Average AI Scores
      let avgScore = 0;
      let avgConfidence = 0;
      let avgCommunication = 0;
      let avgEngagement = 0;

      if (totalEvaluations > 0) {
        const sumScore = evaluations.reduce((acc, curr) => acc + curr.overallScore, 0);
        const sumConfidence = evaluations.reduce((acc, curr) => acc + curr.confidenceScore, 0);
        const sumCommunication = evaluations.reduce((acc, curr) => acc + curr.communicationScore, 0);
        const sumEngagement = evaluations.reduce((acc, curr) => acc + curr.engagementScore, 0);
        
        avgScore = Math.round(sumScore / totalEvaluations);
        avgConfidence = Math.round(sumConfidence / totalEvaluations);
        avgCommunication = Math.round(sumCommunication / totalEvaluations);
        avgEngagement = Math.round(sumEngagement / totalEvaluations);
      }

      // Format trends (last 7 evaluations chronological)
      const performanceTrend = evaluations
        .slice(0, 7)
        .reverse()
        .map(e => ({
          date: e.evaluatedAt.split('T')[0],
          sessionTitle: e.sessionTitle.length > 20 ? e.sessionTitle.substr(0, 20) + '...' : e.sessionTitle,
          overall: e.overallScore,
          confidence: e.confidenceScore,
          communication: e.communicationScore,
          engagement: e.engagementScore
        }));

      // Group Sessions by Type for a breakdown chart
      const typeDistributionMap: { [key: string]: number } = {};
      sessions.forEach(s => {
        typeDistributionMap[s.sessionType] = (typeDistributionMap[s.sessionType] || 0) + 1;
      });
      const typeDistribution = Object.entries(typeDistributionMap).map(([name, value]) => ({ name, value }));

      res.json({
        statistics: {
          totalSessions,
          upcomingSessions: totalUpcoming,
          completedSessions: totalCompleted,
          aiEvaluationsCount: totalEvaluations,
          averages: {
            overall: avgScore || 0,
            confidence: avgConfidence || 0,
            communication: avgCommunication || 0,
            engagement: avgEngagement || 0
          }
        },
        performanceTrend,
        typeDistribution
      });
    } catch (err) {
      res.status(500).json({ error: 'Error synthesizing presentation analytics.' });
    }
  });


  // ==================================================
  // REAL-TIME SESSION REMINDERS & NOTIFICATION CRON
  // ==================================================
  // Run background scan every 45 seconds to check upcoming events, and trigger browser alerts
  setInterval(async () => {
    try {
      // Find all upcoming sessions
      // (For JSON DB, we can load all. In real life we filter, but let's load all and filter in memory)
      const allUpcoming = await db.upcomingSessions.find({}); // scan all users' events
      if (allUpcoming.length === 0) return;

      const now = new Date();

      for (const event of allUpcoming) {
        const eventTime = new Date(`${event.date}T${event.time}`);
        const diffMs = eventTime.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        // 1 Day Reminder (1440 mins)
        if (diffMinutes > 1400 && diffMinutes <= 1440 && !event.notifiedOneDay) {
          await db.upcomingSessions.findByIdAndUpdate(event._id, { notifiedOneDay: true });
          await db.notifications.create({
            userId: event.userId,
            title: '📅 24-Hour Event Reminder',
            message: `Your upcoming coaching session "${event.title}" starts tomorrow at ${event.time}! Get ready to record.`,
            type: 'reminder'
          });
          console.log(`Notification sent: 1 Day reminder for "${event.title}"`);
        }

        // 1 Hour Reminder (60 mins)
        if (diffMinutes > 50 && diffMinutes <= 60 && !event.notifiedOneHour) {
          await db.upcomingSessions.findByIdAndUpdate(event._id, { notifiedOneHour: true });
          await db.notifications.create({
            userId: event.userId,
            title: '⏰ 1-Hour Event Reminder',
            message: `Your session "${event.title}" begins in 1 hour. Grab your notes!`,
            type: 'reminder'
          });
          console.log(`Notification sent: 1 Hour reminder for "${event.title}"`);
        }

        // 10 Minutes Reminder (10 mins)
        if (diffMinutes > 0 && diffMinutes <= 10 && !event.notifiedTenMinutes) {
          await db.upcomingSessions.findByIdAndUpdate(event._id, { notifiedTenMinutes: true });
          await db.notifications.create({
            userId: event.userId,
            title: '🚨 10-Minute Warning!',
            message: `"${event.title}" is starting in exactly 10 minutes. Set up your microphone now.`,
            type: 'alert'
          });
          console.log(`Notification sent: 10 Min reminder for "${event.title}"`);
        }
      }
    } catch (e) {
      // quiet catch background scan error
    }
  }, 45000);


  // ==========================================
  // SAAS WORKSPACE AI AGENTIC CAPABILITIES
  // ==========================================

  // Story & Analogy Generator
  app.post('/api/ai/story-generator', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { topicName, expectedOutcome } = req.body;
      if (!topicName) {
        res.status(400).json({ error: 'Topic name is required.' });
        return;
      }
      const data = await generateStoryAndAnalogy(topicName, expectedOutcome || '');
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate storytelling element.' });
    }
  });

  // Q&A Response Evaluator
  app.post('/api/ai/qa-simulator', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { question, presenterAnswer } = req.body;
      if (!question || !presenterAnswer) {
        res.status(400).json({ error: 'Question and presenterAnswer are required.' });
        return;
      }
      const data = await evaluateQAResponse(question, presenterAnswer);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to evaluate your Q&A response.' });
    }
  });

  // Slide Deck Analyzer & Speaker Notes Assistant
  app.post('/api/ai/slide-analyzer', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { slideText } = req.body;
      if (!slideText) {
        res.status(400).json({ error: 'Pasted slide/deck content is required.' });
        return;
      }
      const data = await analyzeSlides(slideText);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to analyze slide materials.' });
    }
  });

  // Knowledge Gap Detector
  app.post('/api/ai/knowledge-gap', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { transcript, expectedConcepts } = req.body;
      if (!transcript || !expectedConcepts) {
        res.status(400).json({ error: 'Transcript and expectedConcepts list are required.' });
        return;
      }
      const data = await detectKnowledgeGap(transcript, expectedConcepts);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to execute knowledge gap analysis.' });
    }
  });


  // ==========================================
  // FRONTEND INTEGRATION
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakWise AI custom server listening on port ${PORT}`);
  });
}

startServer();
