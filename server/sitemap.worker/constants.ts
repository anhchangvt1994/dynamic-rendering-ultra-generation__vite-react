export const FREQ_KEY_LIST = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
}

export const FREQ_DEFAULT = FREQ_KEY_LIST.DAILY

export const FREQ_PATH_LIST = {
  [FREQ_KEY_LIST.DAILY]: ['/blogs', '/'],
  [FREQ_KEY_LIST.WEEKLY]: [],
}
