import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 어느 경로에 올려도 동작하도록 상대 경로로 빌드
  build: {
    outDir: 'dist',
    // 카카오톡·인스타그램 안의 브라우저는 시스템 웹뷰 버전이 낮은 기기가
    // 많습니다. 최신 문법이 그대로 나가면 앱이 시작하다 죽어 흰 화면만
    // 남습니다. 오래된 엔진에서도 읽히도록 낮춰서 내보냅니다.
    target: ['es2015', 'safari11', 'chrome64', 'firefox60'],
  },
  server: {
    watch: {
      // 이 폴더로 파일을 내려받는 동안 생기는 임시 파일(.crdownload 등)을
      // vite가 감시하려다 EBUSY로 죽습니다. 감시에서 빼둡니다.
      ignored: [
        '**/*.crdownload',
        '**/*.part',
        '**/*.tmp',
        '**/미확인*',
        '**/assets-src/**',
      ],
    },
  },
})
