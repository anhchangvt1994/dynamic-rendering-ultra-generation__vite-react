export const functionGenerator = (env): ((...args: any) => any) => {
  if (!env) return () => {}
  let func = () => {}

  try {
    func = new Function(`return ${env}`)()
  } catch {}

  return func
} // functionGenerator
