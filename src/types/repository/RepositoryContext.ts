import { DependencyContainer } from '@/core/dependencyContainer'
import { RepositoryManager } from '@/core/repositoryManager'

export type RepositoryContext = {
	repositoryManager: RepositoryManager
} & Partial<DependencyContainer>
