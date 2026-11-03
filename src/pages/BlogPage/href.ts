import { functionGenerator } from 'utils/EnvHelper'

/** The path of an article's page (/blogs/<slug>). */
export const articleHref: (slug: string) => string = functionGenerator(
  import.meta.env.ROUTER_BLOG_DETAIL_GET_PATH_FUNCTION
)
