# ShiftMate 웹 배포 가이드

## Vercel 배포

1. GitHub에 이 프로젝트를 업로드합니다.
2. Vercel에서 Add New Project를 누릅니다.
3. GitHub 저장소를 선택합니다.
4. 설정값을 확인합니다.

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

5. Environment Variables에 아래 값을 등록합니다.

```env
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=Supabase Publishable Key
```

6. Deploy를 누릅니다.

## Netlify 배포

```txt
Build command: npm run build
Publish directory: dist
```

환경변수는 Vercel과 동일하게 등록합니다.

## 배포 후 Supabase 설정

Supabase Dashboard에서:

```txt
Authentication → URL Configuration
```

웹 배포 주소를 Site URL과 Redirect URLs에 추가합니다.
