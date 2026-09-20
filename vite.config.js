import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 어느 경로에 올려도 동작하도록 상대 경로로 빌드
  build: { outDir: 'dist' },
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
