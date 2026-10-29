import type { Params } from 'react-router'
import type { IValidation } from 'app/router/context/ValidationContext'

function useValidateBasicParam(): IValidation {
  const params = useParams()

  for (const key in params) {
    if (
      params[key] &&
      (!/^[a-zA-Z0-9._-]+$/.test(params[key] as string) ||
        /[._-]+$/.test(params[key] as string))
    ) {
      return {
        status: 404,
      }
    }
  }

  return {
    status: 200,
  }
} //ValidateBasicParam()

function useValidateCustomParams(): IValidation {
  const params = useParams()

  const validation: IValidation = {
    status: 200,
  }

  const matches = useMatches()
  matches.some(function (item) {
    const validate = (
      item as {
        handle?: {
          params?: {
            validate: (params: Params) => IValidation
          }
        }
      }
    )?.handle?.params?.validate

    if (params && typeof validate === 'function' && !validate(params)) {
      validation.status = 404
      return true
    }
  })

  return validation
} // ValidateCustomParams()

export default function RouterValidation({ children, NotFoundPage }) {
  const validation = (() => {
    const validationList = [useValidateBasicParam, useValidateCustomParams]

    for (const key in validationList) {
      if (typeof validationList[key] !== 'function') continue

      const result = validationList[key]()

      if (result && result.status === 404) {
        return result
      }
    }

    return { status: 200 }
  })()

  if (validation.status === 404) {
    return <NotFoundPage />
  }

  return children
} // RouterValidation()
