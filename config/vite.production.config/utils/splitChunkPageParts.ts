// NOTE - Heavy parts of a page in a chunk of their own, so the page chunk
// keeps room under the 150 KB budget. They are imported statically, so
// Vite preloads them together with the page: nothing renders later.
const PAGE_PARTS: [name: string, files: RegExp][] = [
  // the habitat scenery behind a Pokémon (SVG motifs per type)
  [
    'pokemon-habitat',
    /src\/pages\/PokemonPage\/(PokemonHabitat|HabitatMotifs|habitat)\./,
  ],
  // NOTE - The skeletons' shared pieces, on their own: the bag skeleton
  // (below) and the other skeletons both import them, and the other
  // skeletons import the bag one. Inside either chunk, the two chunks would
  // import each other, and the one loaded first reads the other's variables
  // before they exist ("Cannot access 'x' before initialization", every page)
  // DexNumber and FieldIcon too: the home skeleton (a chunk of its own) and
  // the other skeletons share them
  [
    'skeleton-bone',
    /src\/components\/(PageSkeleton\/(bone|DexNumber)|common\/FieldIcon)\./,
  ],
  // the bag's skeleton and the page styles it reuses, apart from the other
  // skeletons so their chunk keeps room
  [
    'bag-skeleton',
    /src\/(components\/PageSkeleton\/BagSkeleton|pages\/BagPage\/styles)\./,
  ],
  // the kitchen's skeleton and the page styles it reuses: the kitchen's styles
  // are heavy, the other skeletons' chunk would pass the budget with them
  [
    'kitchen-skeleton',
    /src\/(components\/PageSkeleton\/KitchenSkeleton|pages\/KitchenPage\/styles)\./,
  ],
  // the quiz, home and blog skeletons with the page styles they reuse: the
  // styles are heavy, together with the other skeletons they pass the budget
  [
    'quiz-skeleton',
    /src\/(components\/PageSkeleton\/QuizSkeleton|pages\/QuizPage\/styles)\./,
  ],
  [
    'home-skeleton',
    /src\/(components\/PageSkeleton\/HomeSkeleton|pages\/HomePage\/styles)\./,
  ],
  [
    'blog-skeletons',
    /src\/(components\/PageSkeleton\/Blog(Detail)?Skeleton|pages\/Blog(Detail)?Page\/styles)\./,
  ],
  // the route skeletons (Layout shows them on the first paint) and the page
  // styles the sign-in skeleton reuses so they can not drift
  [
    'page-skeletons',
    /src\/(components\/PageSkeleton\/|pages\/AccountPage\/styles\.)/,
  ],
]

const splitChunkPageParts = (pathName: string): boolean | string => {
  if (!pathName || pathName.includes('node_modules/')) return false
  return PAGE_PARTS.find(([, files]) => files.test(pathName))?.[0] ?? false
} // splitChunkPageParts

export default splitChunkPageParts
