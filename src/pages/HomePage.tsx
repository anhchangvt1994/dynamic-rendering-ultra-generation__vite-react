import ModuleSection from 'components/home-page/ModuleSection'

function HomePage() {
  setTitleTag('Trang chủ')
  setSeoTag({
    'og:type': 'website',
    'og:title': 'Trang chủ',
    'og:description': 'Trang chủ React and WSC-SEO',
    'og:url': window.location.pathname,
    'og:site_name': 'React and WSC-SEO',
    'og:image': '',
    'og:image:width': '1200',
    'og:image:height': '628',
    robots: 'index, follow',
  })
  setTimeout(() => {
    setMetaKeywordsTag('Trang chủ, React, wsc-seo')
    setMetaDescriptionTag('Trang chủ React and WSC-SEO')
  }, 500)
  return (
    <div className="home-page">
      <ModuleSection />
    </div>
  )
}

export default HomePage
