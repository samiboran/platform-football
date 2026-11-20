# Sürüm numaralama — M9.3

**Tek kaynak:** `package.json` → `"version"` (semver `MAJOR.MINOR.PATCH`). Başka yerde elle sürüm yazılmaz.

| Nerede | Değer | Nasıl |
|---|---|---|
| Android `versionName` | `0.1.0` | `android/app/build.gradle` package.json'u okur |
| Android `versionCode` | `MAJOR*10000 + MINOR*100 + PATCH` (0.1.0 → **100**, 1.2.3 → 10203) | aynı yer |
| Oyun içi | Ayarlar ekranının sağ alt köşesi `V0.1.0` | `vite.config.ts` → `__APP_VERSION__` → `src/config/version.ts` |
| Sürüm notu | `docs/store/release-notes/<sürüm>.md` (TR + EN, ≤500 karakter) | `npm run release:check` |

## Kurallar
- Play'e her yüklemede versionCode **büyümeli** → yüklemeden önce package.json'daki sürümü artır.
  - PATCH: hata düzeltme / küçük denge (0.1.0 → 0.1.1)
  - MINOR: yeni özellik, yeni karakter/saha (0.1.1 → 0.2.0)
  - MAJOR: 1.0.0 = Play'de herkese açık ilk sürüm
- MINOR ve PATCH 100'ün altında kalmalı (şema bozulmasın; script kontrol eder).
- Sürümü artırınca aynı commit'te `docs/store/release-notes/<yeni sürüm>.md` dosyasını ekle (`## tr-TR` ve `## en-US` bölümleri) ve `npm run release:check` çalıştır.
- Web (GitHub Pages) sürümü de aynı numarayı gösterir; service worker önbelleği ayrıca içerik hash'iyle yenilenir, sürüm artırmak zorunlu değil.

## Sürüm notu şablonu
```
# Sürüm X.Y.Z — kısa başlık

## tr-TR
…

## en-US
…
```
