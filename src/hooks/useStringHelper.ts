import {
  generateSentenceCase,
  generateTitleCase,
  getSlug,
  getSlugWithoutDash,
  getUnsignedLetters,
} from 'utils/StringHelper'

export const useSlug = () => {
  const [state, set] = useState<string>()
  const setState = (param: string) => {
    set(getSlug(param))
  }

  return [state, setState]
} // useSlug

export const useSlugWithoutDash = () => {
  const [state, set] = useState<string>()
  const setState = (param: string) => {
    set(getSlugWithoutDash(param))
  }

  return [state, setState]
} // useSlugWithoutDash

export const useUnsignedLetters = () => {
  const [state, set] = useState<string>()
  const setState = (param: string) => {
    set(getUnsignedLetters(param))
  }

  return [state, setState]
} // useUnsignedLetters

export const useTitleCase = () => {
  const [state, set] = useState<string>()
  const setState = (param: string) => {
    set(generateTitleCase(param))
  }

  return [state, setState]
} // useTitleCase

export const useSentenceCase = () => {
  const [state, set] = useState<string>()
  const setState = (param: string) => {
    set(generateSentenceCase(param))
  }

  return [state, setState]
} // useSentenceCase
