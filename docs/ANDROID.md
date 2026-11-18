# Android paketi (Capacitor) — M9.1

- Paket adı: `com.samiboran.platformfootball` (`capacitor.config.ts`, `android/app/build.gradle`)
- SDK: `minSdk 24`, `compileSdk 36`, **`targetSdk 36`** (`android/variables.gradle`) — Play'in Ağustos 2026 kuralı.
- Ekran yönü: yatay (`sensorLandscape`, `AndroidManifest.xml`).
- İkon + açılış ekranı: `npm run android:icons` → `assets/icons/icon-512.png`'den üretilir (`tools/build/android_assets.py`).

## Geri tuşu ve arka plan (`@capacitor/app`)
- Geri tuşu `src/systems/appLifecycle.ts` üzerinden en üstteki sahneye gider: maçta duraklat/devam, Karakter/Saha/Sonuç → ana menü, ana menüde "ÇIKILSIN MI?" (EVET = `App.exitApp()`). Yönlendirme tablosu `src/config/lifecycle.ts`.
- Uygulama arka plana gidince (`appStateChange` + `visibilitychange`) ses susar, maç duraklatma menüsünde bekler; geri gelince ses açılır, oyuncu DEVAM'a basar.

## Yerelde derleme
```
npm ci
npm run build:android          # web'i göreli base ile derler + cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```
Gerekenler: Node 22+, JDK 21, Android SDK (platform 36). Android Studio ile açmak için: `npx cap open android`.

Web (GitHub Pages) derlemesi değişmedi: `npm run build` hâlâ `/platform-football/` base'iyle derler.
Uygulamanın içinde service worker kapalı (`SW_ENABLED_IN_NATIVE`), dosyalar zaten telefonda.

## CI
`.github/workflows/android.yml` her `main` push'unda **imzasız debug APK** üretir → Actions çalışmasında
`platform-football-debug-apk` artifact'i olarak indirilebilir (telefona "bilinmeyen kaynak" ile kurulur).

## İmza anahtarı (Sami bekliyor)
Play'e yüklenecek AAB için yükleme anahtarı (upload keystore) gerekir. Claude anahtar üretmez.
1. Sami üretir: `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. Yedeğini güvenli bir yerde saklar (kaybolursa Play App Signing ile sıfırlama gerekir).
3. GitHub → Settings → Secrets and variables → Actions:
   - `ANDROID_KEYSTORE_BASE64` = `base64 -w0 upload.jks`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
4. Sonra workflow'a imzalı `bundleRelease` işi eklenecek (M9.1 "APK/AAB" maddesi).
