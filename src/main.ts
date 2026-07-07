import './style.css'
import { createTraceViewer } from './components/TraceViewer'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')
document.body.tabIndex = -1
app.append(createTraceViewer())

if ('serviceWorker' in navigator) {
  const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/?$/, '/')
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${baseUrl}sw.js`).then(async (registration) => {
      await navigator.serviceWorker.ready
      const warmCache = () => {
        const urls = new Set<string>([window.location.href, new URL('sample.ab1', window.location.origin + baseUrl).href])
        performance
          .getEntriesByType('resource')
          .filter((entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming)
          .forEach((entry) => {
            const url = new URL(entry.name)
            if (url.origin === window.location.origin) urls.add(url.href)
          })
        const worker = navigator.serviceWorker.controller ?? registration.active
        worker?.postMessage({ type: 'SV_WARM_CACHE', urls: [...urls] })
      }
      warmCache()
      window.setTimeout(warmCache, 2_000)
    })
  })
}
