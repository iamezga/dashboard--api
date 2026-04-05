import {
	MembershipCreateInput,
	MembershipUpdateInput
} from '@/generated/prisma/models'
import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import { Membership } from './Membership'

export interface MembershipRepositoryInterface extends RepositoryInterface<
	Membership,
	MembershipCreateInput,
	MembershipUpdateInput
> {
	findById(id: string): Promise<Membership | null>
	findAllByUser(userId: string): Promise<Membership[]>
	getPermissions(id: string): Promise<Record<string, any>>
}
