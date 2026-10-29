declare module '*.svg' {
  const value: string
  export = value
}
declare module '*.png' {
  const value: string
  export = value
}
declare module '*.jpg' {
  const value: string
  export = value
}
declare module '*.jpeg' {
  const value: string
  export = value
}
declare module '*.webp' {
  const value: string
  export = value
}
declare module '*.mp3' {
  const value: string
  export = value
}
declare module '*.mp4' {
  const value: string
  export = value
}
declare module '*.mov' {
  const value: string
  export = value
}
declare module '*.mkv' {
  const value: string
  export = value
}
declare module '*.webm' {
  const value: string
  export = value
}
declare module '*.scss' {
  const value: string
  export = value
}

// Stylesheets are loaded by Vite; Swiper also exposes extensionless CSS exports.
declare module '*.css'
declare module 'swiper/css'
declare module 'swiper/css/free-mode'
declare module 'swiper/css/virtual'

declare global {
  const API_STORE: { [key: string]: any } = {}
}
