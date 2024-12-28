import { LocaleInfoProvider } from 'app/router/context/LocaleInfoContext'
import router from 'app/router/index'
import 'assets/styles/main.css'
import 'assets/styles/tailwind.css'
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
					<RouterProvider router={router} />
				</StyleSheetManager>
			</UserInfoProvider>
		</LocaleInfoProvider>
	</StrictMode>
)
