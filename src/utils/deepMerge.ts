/**
 * @file deepMerge.ts
 * @description Provides a utility function for performing a deep merge of two objects.
 * This function recursively merges properties, allowing for nested configurations
 * to be combined correctly without overwriting entire sub-objects.
 */

/**
 * Performs a deep merge of two objects.
 * Properties in the source object will overwrite properties in the target object.
 * If a property exists in both and is an object (and not an array), it will be recursively merged.
 * Primitive values and arrays from the source will always overwrite those in the target.
 *
 * @param {Record<string, any>} target - The target object to merge into.
 * @param {Record<string, any>} source - The source object to merge from.
 * @returns {Record<string, any>} A new object representing the deeply merged result.
 */
export function deepMerge(
	target: Record<string, any>,
	source: Record<string, any>
): Record<string, any> {
	const output = { ...target } // Start with a a shallow copy of target

	if (
		target &&
		typeof target === 'object' &&
		source &&
		typeof source === 'object'
	) {
		Object.keys(source).forEach(key => {
			if (
				source[key] &&
				typeof source[key] === 'object' &&
				!Array.isArray(source[key])
			) {
				// If the source key is an object (and not an array)
				if (!(key in target)) {
					// If target doesn't have the key, just assign it (deeply cloned)
					// structuredClone is used here to ensure a deep copy of any sub-object
					// from the source if it doesn't exist in the target.
					Object.assign(output, { [key]: structuredClone(source[key]) })
				} else {
					// If target has the key, and both target[key] and source[key] are objects, recursively merge
					output[key] = deepMerge(target[key], source[key])
				}
			} else {
				// If it's a primitive value or an array, or if target[key] is not an object, overwrite
				Object.assign(output, { [key]: source[key] })
			}
		})
	}

	return output
}
