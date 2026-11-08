type Get = (template: string, key: string) => Promise<Buffer | null>

/**
 * First catalog that has the animation, in order. Only the last-resort
 * source (reached when every preferred one answered 404) is sharpened: the
 * others are already clean. A failure other than "not found" is raised, so an
 * outage never silently falls to a lesser source.
 */
export const pickSource = async (
  key: string,
  preferred: string[],
  fallback: string,
  get: Get,
  Missing: new () => Error
): Promise<{ image: Buffer; sharpen: boolean }> => {
  for (const template of preferred) {
    const image = await get(template, key)
    if (image) return { image, sharpen: false }
  }
  if (!fallback) throw new Missing()
  const image = await get(fallback, key)
  if (!image) throw new Missing()
  return { image, sharpen: true }
}
