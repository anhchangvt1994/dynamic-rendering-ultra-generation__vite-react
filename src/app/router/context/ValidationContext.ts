export interface IValidation {
  error?: string
  status: 200 | 301 | 302 | 404 | 504
  redirect?: string | number
}

const INIT_VALIATION_INFO: IValidation | null = null

export const ValidationContext = createContext<IValidation | null>(
  INIT_VALIATION_INFO
)
