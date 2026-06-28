/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment variables.');
}

// Export a singleton Supabase client
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export a connectDB function to avoid undefined errors where it was imported.
export async function connectDB() {
  console.log('Supabase client initialized.');
}
