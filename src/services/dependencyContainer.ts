// src/container.ts

import { validator } from '@/services//validationService'
import config from '@/services/config'
import * as databaseManager from '@/services/databaseServiceManager'
import logger from './logger'

/**
 * This service allows you to import other third-party services and libraries
 * so that multiple dependency injections can be reduced to just one, allowing for clear code with simple constructors.
 */
export const dependencyContainer = {
	// First level for own services and customizations
	config,
	databaseManager,
	validator,
	logger,
	thirdParties: {
		// Here we can inject all third-party libraries that are used natively
	}
}

export type DependencyContainer = typeof dependencyContainer
