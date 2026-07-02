import './style.css'
import { createTraceViewer } from './components/TraceViewer'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')
app.append(createTraceViewer())
