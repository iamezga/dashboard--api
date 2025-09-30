import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import { User, UserCreateInput, UserStatus, UserUpdateInput } from './User'

export interface UserRepositoryInterface
	extends RepositoryInterface<User, UserCreateInput, UserUpdateInput> {
	findByEmail(email: string): Promise<User | null>
	findUserAuthDetailsByEmail(email: string): Promise<UserAuthDetails | null>
	findStatusById(id: string): Promise<UserStatus | null>
}
