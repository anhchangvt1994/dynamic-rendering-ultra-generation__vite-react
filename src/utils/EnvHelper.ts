export const functionGenerator = (env) => {
  if (!env) return
  let func = null

  try {
    func = new Function(`return ${env}`)()
  } catch {}

  return func
} // functionGenerator
