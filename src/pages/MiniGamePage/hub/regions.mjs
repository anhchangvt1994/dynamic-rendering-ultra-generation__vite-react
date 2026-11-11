// Fixed region boxes (px) per breakpoint. Skeleton, guest, loading and signed-in
// content all render inside these boxes, so nothing shifts when data arrives.
export const BREAKPOINTS = { md: 640, lg: 1024 }

export const REGIONS = {
  title: { base: 150, md: 184, lg: 150 },
  trainer: { base: 200, md: 224, lg: 244 },
  booth: { base: 312, md: 328, lg: 344 },
  quests: { base: 432, md: 464, lg: 500 },
}
