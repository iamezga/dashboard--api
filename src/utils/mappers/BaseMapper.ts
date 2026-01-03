/**
 * Base class for mappers that transform persistence models to domain entities.
 * Provides a reusable abstraction for data transformation across all repositories.
 *
 * Pattern: Template Method - subclasses implement specific mapping logic
 */
export abstract class BaseMapper<TSource, TTarget> {
	/**
	 * Maps a single persistence model to a domain entity.
	 * @param source The persistence model to map
	 * @returns The mapped domain entity
	 */
	abstract mapToDomain(source: TSource): TTarget

	/**
	 * Maps multiple persistence models to domain entities.
	 * @param sources Array of persistence models
	 * @returns Array of mapped domain entities
	 */
	mapArrayToDomain(sources: TSource[]): TTarget[] {
		return sources.map(source => this.mapToDomain(source))
	}

	/**
	 * Maps a persistence model to a domain entity, or returns null if source is null.
	 * @param source The persistence model to map or null
	 * @returns The mapped domain entity or null
	 */
	mapOrNull(source: TSource | null | undefined): TTarget | null {
		return source ? this.mapToDomain(source) : null
	}
}
