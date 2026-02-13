import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 1. 빌드 기준 경로 추가 (안정성을 위해 추가 권장)
      base: './', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // 2. 이 부분을 수정해야 합니다! 
          // 현재는 '@' 가 현재 폴더를 가리키게 되어 있는데, 
          // 소스 파일들이 루트에 있으므로 아래와 같이 확인하세요.
          '@': path.resolve(__dirname, './'),
        }
      }
    };
});
