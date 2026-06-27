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
      const existingUser = await db.users.findOne({ email });
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

      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Create new user
      const newUser = await db.users.create({
        email,
        passwordHash,
        name,
        bio: bio || '',
        occupation: occupation || '',
        experience: experience || '',
        skills: skillsArray,
        profilePic: '',
        coverImage: '',
        isVerified: false,
        verificationCode,
        socialLinks: {
          website: '',
          linkedin: '',
          twitter: '',
          github: ''
        }
      });

      console.log(`[EMAIL SIMULATION] Verification code for user ${newUser.email} is: ${verificationCode}`);

      // Send simulated verification email
      await db.simulatedEmails.create({
        to: newUser.email,
        subject: 'Confirm your SpeakWise AI Account',
        body: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 600px; color: #334155; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff;">
            <div style="font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px;">SpeakWise AI</div>
            <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">Confirm your Email Address</h2>
            <p>Hello <strong>${newUser.name}</strong>,</p>
            <p>Thank you for registering at SpeakWise AI! To activate your account, please enter the following 6-digit security code on the email verification screen:</p>
            <div style="background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 12px; margin: 24px 0; color: #4f46e5; font-family: monospace;">
              ${verificationCode}
            </div>
            <p>This code will expire in 15 minutes. If you did not request this registration, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 SpeakWise AI • The Smart Visual Speaker Coach</p>
          </div>
        `
      });

      // Return user without password or token
      const userResponse = { ...newUser };
      delete userResponse.passwordHash;
      delete userResponse.verificationCode;

      res.status(200).json({
        message: 'Account registered successfully. Please verify your email.',
        email: newUser.email,
        simulatedCode: verificationCode
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
      const user = await db.users.findOne({ email });
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

      // Check if verified
      if (user.isVerified === false) {
        // Resend/simulate the verification email just in case they lost it
        await db.simulatedEmails.create({
          to: user.email,
          subject: 'Confirm your SpeakWise AI Account (Resent)',
          body: `
            <div style="font-family: sans-serif; padding: 24px; max-width: 600px; color: #334155; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff;">
              <div style="font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px;">SpeakWise AI</div>
              <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">Confirm your Email Address</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Here is your email verification code to log in to SpeakWise AI:</p>
              <div style="background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 12px; margin: 24px 0; color: #4f46e5; font-family: monospace;">
                ${user.verificationCode}
              </div>
              <p>If you did not request this, please secure your account credentials.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 SpeakWise AI • The Smart Visual Speaker Coach</p>
            </div>
          `
        });

        res.status(403).json({
          error: 'Email address not verified. A new simulated confirmation email has been sent.',
          requiresVerification: true,
          email: user.email,
          simulatedCode: user.verificationCode
        });
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

      const user = await db.users.findOne({ email });
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
      const user = await db.users.findOne({ _id: userId });
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await db.users.findByIdAndUpdate(userId, { passwordHash: newPasswordHash });

      // Create notification
      await db.notifications.create({
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

      const user = await db.users.findOne({ _id: userId });
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
  },

  async verifyEmail(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: 'Email and verification code are required.' });
        return;
      }

      const user = await db.users.findOne({ email });
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (user.verificationCode !== code) {
        res.status(400).json({ error: 'Invalid verification code.' });
        return;
      }

      // Set user as verified
      await db.users.findByIdAndUpdate(user._id, { isVerified: true, verificationCode: '' });

      // Create welcome notification
      await db.notifications.create({
        userId: user._id,
        title: 'Account Verified!',
        message: `Welcome to SpeakWise AI, ${user.name}! Let's generate a session plan or record your speech in our coaching demo page.`,
        type: 'success'
      });

      // Generate login token
      const token = generateToken(user._id, user.email, false);

      const userResponse = { ...user, isVerified: true };
      delete userResponse.passwordHash;
      delete userResponse.verificationCode;

      res.json({
        message: 'Email verified successfully. Logging in...',
        token,
        user: userResponse
      });
    } catch (err) {
      console.error('Email verification error:', err);
      res.status(500).json({ error: 'Internal server error during email verification.' });
    }
  }
};
