/**
 * Vitest setup file
 * Runs before all vitest test files
 */

// Load environment variables from .env file for tests
import 'dotenv/config'

// Load Express type definitions
import './types/express.d'
