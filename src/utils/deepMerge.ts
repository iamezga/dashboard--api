/**
 * Deeply merges two objects.
 *
 * - Nested objects are merged recursively.
 * - Primitive values and arrays in source overwrite those in target.
 * - Empty objects in source do not overwrite non-empty target objects.
 * - Undefined values in source are ignored.
 * - Non-object target/source values are converted to empty objects only at the root call.
 */
export function deepMerge(
	target: Record<string, any> = {},
	source: Record<string, any> = {},
	isRoot = true
): Record<string, any> {
	// Only at root, convert non-objects to empty objects
	if (isRoot) {
		if (typeof target !== 'object' || target === null) target = {}
		if (typeof source !== 'object' || source === null) source = {}
	}

	const output: Record<string, any> = { ...target }

	for (const key of Object.keys(source)) {
		const srcVal = source[key]
		const tgtVal = target[key]

		if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
			// copy empty objects if target does not have the key
			if (Object.keys(srcVal).length === 0) {
				if (tgtVal === undefined) {
					output[key] = structuredClone(srcVal)
				}
				continue
			}

			if (tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)) {
				output[key] = deepMerge(tgtVal, srcVal, false)
			} else {
				output[key] = structuredClone(srcVal)
			}

			if (tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)) {
				output[key] = deepMerge(tgtVal, srcVal, false)
			} else {
				output[key] = structuredClone(srcVal)
			}
		} else if (srcVal !== undefined) {
			output[key] = srcVal
		}
	}

	return output
}
