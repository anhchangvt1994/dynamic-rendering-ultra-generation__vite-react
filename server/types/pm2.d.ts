import 'pm2'

// Verified in the published PM2 7.1.1 package: lib/API.js implements scale,
// but types/index.d.ts omits it. The launcher also checks the API at runtime.
declare module 'pm2' {
  export function scale(
    appName: string,
    instances: number | string,
    callback: (error: Error | null, result?: { success: boolean }) => void
  ): void
}
