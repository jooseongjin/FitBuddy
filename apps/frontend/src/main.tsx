// 계정별 탭 데이터 정리 — 다른 모듈(mock 서버 등)이 데이터를 읽기 전에 실행되도록 맨 먼저 import
import './lib/accountBootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
