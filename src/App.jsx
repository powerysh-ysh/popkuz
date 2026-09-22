import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Catch from './pages/Catch'
import Scan from './pages/Scan'
import QrBoard from './pages/QrBoard'
import Mission from './pages/Mission'
import Setup from './pages/Setup'
import Dex from './pages/Dex'
import Done from './pages/Done'
import Staff from './pages/Staff'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* 앱 안에서 카메라를 켜고 QR을 찾는 탐지기 */}
      <Route path="/scan" element={<Scan />} />
      {/* QR 착지 지점 — /c/chokku?k=sb01 */}
      <Route path="/c/:id" element={<Catch />} />
      <Route path="/dex" element={<Dex />} />
      {/* 무작위 2마리 스피드런 */}
      <Route path="/mission" element={<Mission />} />
      <Route path="/done" element={<Done />} />
      <Route path="/staff" element={<Staff />} />
      {/* 인쇄 없이 시연할 때 쓰는 화면 QR 보드 */}
      <Route path="/qr" element={<QrBoard />} />
      {/* 시연 공간에 맞춰 장소 이름을 바꾸는 화면 */}
      <Route path="/setup" element={<Setup />} />
      {/* 짧은 QR 주소 (#/q7) — 다른 경로와 겹치지 않도록 두 글자만 */}
      <Route path="/:id" element={<Catch />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
