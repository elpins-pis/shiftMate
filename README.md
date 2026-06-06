# ShiftMate

근무표 관리 앱입니다.

직원 등록, 근무유형 설정, 월별 스케줄 등록, 휴무 관리, 패턴 등록을 지원합니다.

## 기술 스택

- React + Vite
- Supabase Auth / Database
- Capacitor Android

## 로컬 실행

```bash
npm install
npm run dev
```

## 환경변수

루트에 `.env` 파일을 만들고 아래 값을 입력합니다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 웹 빌드

```bash
npm run build
```

## Android 동기화

```bash
npm run android:sync
```

자세한 배포 방법은 `docs/` 폴더를 확인하세요.
