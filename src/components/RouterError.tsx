import { useRouteError } from 'react-router'

function RouterError() {
  const error = useRouteError() as any

  console.log(error)

  if (!error) return ''

  // if (import.meta.env.DEV && error.name === 'TypeError') {
  //   window.history.go(0)
  //   return null
  // }

  return (
    <div className="flex w-full h-dvh items-center font-extrabold flex-wrap">
      <div className="center w-full justify-between text-center text-[24px]">
        Oops! This site is under maintenance <br />
        Please visit again in a few minutes
      </div>
    </div>
  )
}

export default RouterError
