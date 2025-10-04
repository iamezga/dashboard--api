import { RepositoryManager } from '@/core/repositoryManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'

export type RepositoryContext = {
	repositoryManager: RepositoryManager
} & Partial<DependencyContainer>
