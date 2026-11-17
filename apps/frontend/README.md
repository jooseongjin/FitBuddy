# React + TypeScript + Vite

FitBuddy API는 기본적으로 `http://localhost:4000/api/v1`의 실제 백엔드를 사용합니다. 화면 개발용 Mock 데이터를 쓰려면 실행 환경에 `VITE_PROGRESS_API=mock`을 설정하세요. Shop의 보유 아이템·구매·장착 데이터는 아직 서버와 연동되지 않아 실제 API 모드에서는 구매할 수 없습니다.

## 모바일 건강 데이터

이번 PR은 Android/Health Connect를 우선 지원합니다. `npm run cap:sync`로 웹 빌드와 Android 네이티브 프로젝트만 동기화합니다. Android 빌드에는 Android Studio/SDK가 필요합니다.

- iPhone/HealthKit 네이티브 프로젝트와 실기기 연동은 후속 작업입니다. 공용 건강 데이터 API는 iOS를 다시 연결할 수 있도록 유지합니다.
- Samsung/Android: Health Connect 권한을 허용합니다. Samsung Health 앱의 설정 > 건강 데이터 권한에서 Health Connect 데이터 공유를 켜야 하며, Health Connect가 없는 Android 13 이하 기기는 Play Store에서 설치해야 합니다.
- 일반 브라우저에서는 건강 앱 API를 사용할 수 없습니다. 대시보드는 연결 전 실제 저장값(0)을 표시하고 임의의 샘플 값을 만들지 않습니다.

실제 기기 빌드는 백엔드 API를 휴대전화에서 접근 가능한 주소로 설정한 다음 `npm run cap:sync`를 실행합니다. Android Studio는 `npm run cap:android`로 엽니다. 로컬 USB 디버깅에서는 `.env.production`의 `VITE_API_URL`을 PC LAN IP로 지정하고 백엔드 `CORS_ORIGIN`에도 Capacitor origin을 포함해야 합니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
