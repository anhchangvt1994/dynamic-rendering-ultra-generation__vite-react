// Fixed region boxes (px) per breakpoint. Skeleton, guest, loading and signed-in
// content all render inside these boxes, so nothing shifts when data arrives.
export const BREAKPOINTS = { md: 640, lg: 1024 }

export const REGIONS = {
  title: { base: 120, md: 140, lg: 140 },
  booth: { base: 440, md: 520, lg: 600 },
  quests: { base: 168, md: 136, lg: 136 },
}
