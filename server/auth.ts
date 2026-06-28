/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

// Secret key for signing JWTs
const JWT_SECRET = process.env.JWT_SECRET || 'speakwise-super-secret-jwt-key';

// Extend Express Request type to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, email: string, rememberMe: boolean = false): string {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn });
}

/**
 * JWT Authentication Middleware
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is missing.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid Authorization header format. Must be "Bearer <token>".' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token is expired or invalid.' });
  }
}

/**
 * Auth Controller handlers
 */
export const authController = {
  async signup(req: Request, res: Response) {
    try {
      const { email, password, name, bio, occupation, experience, skills } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, password, and name are required fields.' });
        return;
      }

      // Check if email already exists
      const { data: existingUser, error: findError } = await db.from('users').select('*').eq('email', email).maybeSingle();
      if (findError) throw findError;

      if (existingUser) {
        res.status(400).json({ error: 'A user with this email address already exists.' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Parse skills (could be comma separated or array)
      let skillsArray: string[] = [];
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === 'string') {
        skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      }

      // Create new user
      const { data: newUser, error: insertError } = await db.from('users').insert({
        email,
        passwordHash,
        name,
        bio: bio || '',
        occupation: occupation || '',
        experience: experience || '',
        skills: skillsArray,
        socialLinks: {
          website: '',
          linkedin: '',
          twitter: '',
          github: ''
        },
        profilePic: '',
        coverImage: ''
      }).select().single();

      if (insertError) throw insertError;

      // Create a welcome notification
      await db.from('notifications').insert({
        userId: newUser._id,
        title: 'Account Created Successfully!',
        message: `Welcome to SpeakWise AI, ${newUser.name}! Let's generate a session plan or record your speech in our coaching demo page.`,
        type: 'success'
      });

      // Generate initial token
      const token = generateToken(newUser._id, newUser.email, false);

      // Return user without password
      const userResponse = { ...newUser };
      delete userResponse.passwordHash;

      res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: userResponse
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Internal server error during registration.' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required fields.' });
        return;
      }

      // Find user
      const { data: user, error: findError } = await db.from('users').select('*').eq('email', email).maybeSingle();
      if (findError) throw findError;

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      // Generate token
      const token = generateToken(user._id, user.email, !!rememberMe);

      const userResponse = { ...user };
      delete userResponse.passwordHash;

      res.json({
        message: 'Logged in successfully.',
        token,
        user: userResponse
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email address is required.' });
        return;
      }

      const { data: user, error: findError } = await db.from('users').select('*').eq('email', email).maybeSingle();
      if (findError) throw findError;

      if (!user) {
        // Obfuscate response for privacy, but simulate success
        res.json({
          message: 'If that email exists in our records, a password reset link has been simulated and sent.',
          simulatedToken: 'speakwise-reset-demo-token-123'
        });
        return;
      }

      // Generate a simulated token for Reset page
      const resetToken = jwt.sign({ userId: user._id, email: user.email, isReset: true }, JWT_SECRET, { expiresIn: '15m' });

      res.json({
        message: 'Password reset link simulated successfully.',
        resetToken,
        instructions: 'Use this temporary resetToken on the reset password screen.'
      });
    } catch (err) {
      res.status(500).json({ error: 'Error processing forgot password request.' });
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required.' });
        return;
      }

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        res.status(400).json({ error: 'Reset token is expired or invalid.' });
        return;
      }

      const userId = decoded.userId;
      const { data: user, error: findError } = await db.from('users').select('*').eq('_id', userId).maybeSingle();
      if (findError) throw findError;

      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const { error: updateError } = await db.from('users').update({ passwordHash: newPasswordHash }).eq('_id', userId);
      if (updateError) throw updateError;

      // Create notification
      await db.from('notifications').insert({
        userId: user._id,
        title: 'Password Updated',
        message: 'Your password was changed successfully. If this wasn\'t you, please secure your account.',
        type: 'alert'
      });

      res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (err) {
      res.status(500).json({ error: 'Error resetting password.' });
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { data: user, error: findError } = await db.from('users').select('*').eq('_id', userId).maybeSingle();
      if (findError) throw findError;

      if (!user) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const userResponse = { ...user };
      delete userResponse.passwordHash;

      res.json(userResponse);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching profile.' });
    }
  }
};
