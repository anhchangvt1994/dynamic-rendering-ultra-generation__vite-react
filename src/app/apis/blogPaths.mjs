// PostgREST paths of the blog, built here (pure) so they can be tested in node.
// Every value that comes from a visitor is escaped or cleaned.

export const LIST_COLUMNS =
  'slug,title,excerpt,cover_url,cover_alt,cover_color,tags,published_at,read_minutes'

const SEARCH_COLUMNS = 'slug,title,excerpt,cover_url,cover_color'
const SEARCH_LIMIT = 8
const TERM_MAX = 60

export const articleListPath = () =>
  `/articles?select=${LIST_COLUMNS}&order=published_at.desc`

export const articlePath = (slug) =>
  `/articles?slug=eq.${encodeURIComponent(String(slug))}&select=*&limit=1`

// the characters that mean something in a PostgREST filter (or in a LIKE) are
// not part of a search; the rest of the term stays
export const cleanTerm = (term) =>
  String(term ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[*,()%&#"'\\\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TERM_MAX)
    .trim()

export const articleSearchPath = (term) => {
  const clean = cleanTerm(term)
  return clean
    ? `/articles?title=ilike.*${encodeURIComponent(clean)}*&select=${SEARCH_COLUMNS}&order=published_at.desc&limit=${SEARCH_LIMIT}`
    : ''
}

// a publishable key (sb_publishable_…) is not a JWT: only `apikey`; a legacy
// anon key is one: PostgREST also wants it as the bearer
export const restHeaders = (key) => {
  if (!key) return {}
  return key.split('.').length === 3
    ? { apikey: key, Authorization: `Bearer ${key}` }
    : { apikey: key }
}
