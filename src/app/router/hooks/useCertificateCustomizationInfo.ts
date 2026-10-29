import { IUserInfo, useUserInfo } from 'store/UserInfoContext'

export interface ICertCustomizationInfo {
  user: IUserInfo
}

export default function useCertificateCustomizationInfo(): ICertCustomizationInfo {
  const { userState } = useUserInfo()

  return {
    user: userState,
  }
}
