import { LocaleInfoProvider } from 'app/router/context/LocaleInfoContext'
import router from 'app/router/index'
import store from 'app/store'
import 'assets/styles/main.css'
import 'assets/styles/tailwind.css'
import { Provider } from 'react-redux'
import { UserInfoProvider } from 'store/UserInfoContext'
import { getRoot } from 'utils/RootHandler'

const root = getRoot()

root.render(
  <StrictMode>
    <LocaleInfoProvider>
      <UserInfoProvider>
        <StyleSheetManager
          {...{ disableCSSOMInjection: RenderingInfo.type === 'SSR' }}
        >
          <Provider store={store}>
            <RouterProvider router={router} />
          </Provider>
        </StyleSheetManager>
      </UserInfoProvider>
    </LocaleInfoProvider>
  </StrictMode>
)
