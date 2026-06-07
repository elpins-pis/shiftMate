# ShiftMate

교대 근무 스케줄을 모바일에서 확인하고 관리하는 React + Vite + Capacitor 앱입니다.

## 현재 구성

- React + Vite
- Supabase 연동
- Capacitor Android 프로젝트 포함
- Android 앱 ID: `com.shiftmate.app`
- 앱 이름: `ShiftMate`

## 처음 실행

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에는 Supabase 값을 넣어주세요.

```env
VITE_SUPABASE_URL=본인_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=본인_SUPABASE_PUBLISHABLE_KEY
```

## 웹 빌드 확인

```bash
npm run build
npm run preview
```

## Android 동기화

웹 코드를 수정한 뒤 Android 앱에 반영할 때는 아래 명령을 실행합니다.

```bash
npm run android:sync
```

## Android Studio 열기

```bash
npm run android:studio
```

또는 Android Studio에서 `android/` 폴더를 직접 열어도 됩니다.

자세한 Android 배포 순서는 `ANDROID_BUILD.md`를 확인하세요.
