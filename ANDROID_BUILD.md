# ShiftMate Android 배포 정리

## 1. 준비 프로그램

아래 프로그램이 필요합니다.

- Node.js LTS 버전
- npm
- Android Studio
- Android SDK
- JDK: Android Studio에 포함된 JDK 사용 권장

## 2. 프로젝트 압축 해제 후 처음 할 일

```bash
npm install
```

그 다음 `.env.example`을 복사해서 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 아래처럼 해도 됩니다.

```powershell
Copy-Item .env.example .env
```

`.env`에 실제 Supabase 값을 넣어주세요.

```env
VITE_SUPABASE_URL=본인_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=본인_SUPABASE_PUBLISHABLE_KEY
```

주의: `.env`는 개인 키/환경값이 들어가는 파일이라 ZIP/Git에 포함하지 않습니다.

## 3. 웹 빌드

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## 4. Capacitor Android에 반영

```bash
npm run android:sync
```

이 명령은 `dist/`의 웹 빌드 결과를 Android 프로젝트로 복사합니다.

## 5. Android Studio에서 실행

```bash
npm run android:studio
```

Android Studio가 열리면 다음 순서로 확인합니다.

1. Gradle Sync가 끝날 때까지 기다립니다.
2. 에뮬레이터 또는 실제 안드로이드 기기를 선택합니다.
3. Run 버튼으로 실행합니다.

## 6. 디버그 APK 만들기

Mac/Linux:

```bash
npm run android:build:apk
```

Windows에서 스크립트가 안 되면 직접 실행하세요.

```powershell
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

생성 위치:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

이 APK는 테스트용입니다. Play Store 배포용은 release AAB가 필요합니다.

## 7. Play Store 배포용 AAB 만들기

Android Studio에서 하는 방법이 가장 쉽습니다.

1. Android Studio에서 `android/` 폴더 열기
2. Build > Generate Signed App Bundle / APK 선택
3. Android App Bundle 선택
4. keystore 생성 또는 기존 keystore 선택
5. release 빌드 생성

터미널로는 아래 명령을 사용할 수 있습니다.

```bash
npm run android:build:aab
```

단, release 서명 설정이 되어 있어야 정상적으로 배포용 AAB를 만들 수 있습니다.

생성 위치:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 8. 배포 전 꼭 확인할 것

- `android/app/build.gradle`의 `versionCode`, `versionName`
- `applicationId`: 현재 `com.shiftmate.app`
- 앱 이름: `android/app/src/main/res/values/strings.xml`
- 앱 아이콘/스플래시 이미지
- Supabase URL / Publishable Key가 운영용인지 확인
- 실제 기기에서 로그인, 달력, 직원, 설정, 통계 화면 확인

## 9. ZIP에서 제외한 항목

배포/전달용 ZIP에는 아래 항목을 제외했습니다.

- `node_modules/`: PC마다 다시 설치해야 함
- `.git/`: 개발 이력 폴더라 전달 불필요
- `.env`: 개인 환경값이라 공유 금지
- `__MACOSX/`: 맥 압축 부가 파일
- Android/Gradle 임시 빌드 캐시

## 10. 자주 쓰는 명령어

```bash
npm install
npm run dev
npm run build
npm run android:sync
npm run android:studio
npm run android:build:apk
npm run android:build:aab
```
