import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Catch from './pages/Catch'
import Scan from './pages/Scan'
import QrBoard from './pages/QrBoard'
import Mission from './pages/Mission'
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
