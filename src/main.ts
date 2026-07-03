import './style.css'
import { createTraceViewer } from './components/TraceViewer'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')
document.body.tabIndex = -1
app.append(createTraceViewer())
