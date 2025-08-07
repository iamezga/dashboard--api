import { NotFoundError } from '@/errors'
import { Express } from 'express'
import { v1 } from './v1'

/**
 * Router with version and module structure
 * @example tree
 * src/
 * └── http/
 *     ├── middlewares/
 *     │   ├── authMiddleware.ts
 *     │   └── ...
 *     └── routes/
 *         ├── v1/
 *         │   ├── index.ts                     // Main Routing of the V1
 *         │   ├── authRoutes.ts                // Authentication routes
 *         │   ├── publicRoutes.ts              // public routes
 *         │   ├── privateRoutes.ts             // private routes with authMiddleware
 *         │   └── example/				        // [MODULES]
 *         │       └── index.ts                 // Example routes (privates)
 *         │       └── examplePrivateRoutes.ts  // Private routes
 *         │       └── examplePublicRoutes.ts   // Public routes (If there are public routes of a module)
 *         └── index.ts                         // init routes
 *
 * @param app
 */
export const initRoutes = (app: Express) => {
	app.use('/api/v1', v1)

	// Fallback
	app.use((_req, _res) => {
		throw new NotFoundError('Route not found')
	})
}
