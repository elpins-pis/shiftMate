# ShiftMate Google Play 배포 가이드

이 압축 파일은 `.env`, `node_modules`, `dist`, `.git`, 빌드 산출물, 생성된 웹 번들 파일을 제외한 배포용 소스입니다.

## 1. 프로젝트 열기

VS Code에서 압축을 푼 폴더를 엽니다.

```bash
npm install
```

## 2. 환경변수 만들기

프로젝트 루트에 `.env` 파일을 새로 만들고 Supabase 값을 넣습니다.

```env
VITE_SUPABASE_URL=https://프로젝트아이디.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=Supabase_Publishable_Key
```

주의: `service_role`, `secret`, `sb_secret_` 키는 절대 넣지 않습니다.

## 3. 웹 빌드 확인

```bash
npm run build
```

성공하면 `dist` 폴더가 생성됩니다.

## 4. Android 프로젝트에 웹 빌드 반영

```bash
npx cap sync android
```

또는 package.json 스크립트 사용:

```bash
npm run android:sync
```

## 5. Android Studio 열기

```bash
npx cap open android
```

Android Studio가 열리면 Gradle Sync가 끝날 때까지 기다립니다.

## 6. 테스트 APK 만들기

Windows PowerShell:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Mac/Linux:

```bash
cd android
./gradlew assembleDebug
```

생성 위치:

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## 7. Google Play 업로드용 AAB 만들기

Android Studio에서 진행하는 것을 추천합니다.

```txt
Build → Generate Signed App Bundle / APK → Android App Bundle 선택
```

처음이면 새 keystore를 생성합니다. keystore 파일과 비밀번호는 반드시 안전하게 보관하세요. 잃어버리면 업데이트 배포가 어려워질 수 있습니다.

생성 파일 예시:

```txt
android/app/release/app-release.aab
```

## 8. Play Console 업로드 전 체크리스트

- 앱 이름: ShiftMate
- 패키지명: `com.shiftmate.app`
- 버전코드/versionCode 증가 확인
- 앱 아이콘 교체
- 스플래시 이미지 확인
- 개인정보처리방침 URL 준비
- 데이터 보안 설문 작성
- 콘텐츠 등급 설문 작성
- 스크린샷 준비
- 내부 테스트 트랙에 먼저 업로드

## 9. Supabase Auth URL 설정

웹 배포 주소가 생기면 Supabase에서 아래를 설정합니다.

```txt
Authentication → URL Configuration
```

예시:

```txt
Site URL: https://your-shiftmate-domain.vercel.app
Redirect URLs:
http://localhost:5173
https://your-shiftmate-domain.vercel.app
```
