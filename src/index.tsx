import { LocaleInfoProvider } from 'app/router/context/LocaleInfoContext'
import router from 'app/router/index'
import store from 'app/store'
// Self-hosted fonts: only the subsets the site renders (woff2, swap).
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import '@fontsource/be-vietnam-pro/latin-800.css'
import '@fontsource/be-vietnam-pro/vietnamese-800.css'
import '@fontsource/dela-gothic-one/latin-400.css'
import '@fontsource/dela-gothic-one/latin-ext-400.css'
import '@fontsource/dela-gothic-one/vietnamese-400.css'
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
