# PROGRESS — Platform Football

## Oturum 1 — M0 İskelet

**Yapıldı:**
- Vite + Phaser 3 + TypeScript projesi kuruldu (`platform-football/`, Botan reposunun dışında, ayrı bağımsız repo olarak).
- Sahne akışı: `BootScene` → `MenuScene` → `MatchScene` → `ResultScene`.
- `src/config/arena.ts`: tüm ölçüler tek yerde — 960x540 logical çözünürlük, karakter boyu (70px), derinlik bandı (3 karakter boyu), yarı saha genişliği (4.5 karakter genişliği), kale ağzı yüksekliği (derinlik bandının %50'si), `projectToScreen(x, z, y)` formülü (`screenY = baseY - z*depthScale - y`) sonraki milestone'lar için hazır.
- `MatchScene`: statik placeholder saha — iki kale, orta çizgi, touchline'lar, sabit kamera (zoom/pan/follow yok).
- GitHub Pages deploy workflow'u (`.github/workflows/deploy.yml`) eklendi.
- `npm run build` temiz geçiyor. Playwright ile Menu → Match → Result akışı tarayıcıda uçtan uca doğrulandı, konsol hatası yok.
- Git init yapıldı, ilk commit atıldı (`ac2f2f5`).

**Kalan / bilinen sorun:**
- **GitHub reposu açılamadı.** `mcp__github__create_repository` çağrısı `403 Resource not accessible by integration` hatası verdi — bu oturumun GitHub App entegrasyonu yalnızca önceden tanımlı repolara (örn. `samiboran/Botan`) erişebiliyor, yeni repo oluşturma izni yok. Bu yüzden **push edilemedi, proje şu an sadece local'de** (`/home/user/platform-football`, container'a özel, kalıcı değil).
- Sonuç olarak GitHub Pages deploy'u da yapılamadı (M0'ın son maddesi teknik olarak tamamlanmadı — workflow dosyası hazır ama hiç çalışmadı).
- Devam etmek için: (a) Sami repoyu kendi hesabında elle oluşturup remote'u eklerse ben push ederim, veya (b) GitHub App'e repo oluşturma izni verilirse ben de açıp push edebilirim.

## Oturum 2 — Repo açıldı, push tamamlandı

Sami `github.com/samiboran/platform-football` reposunu kendi hesabından elle
açtı (boş, hiç commit yok). Yol arada kısa bir sapma yaptı: repo hâlâ
açılamadığı sanılarak proje geçici olarak `Botan/platform-football/` altına
taşınmıştı — repo linki gelince o taşıma tamamen geri alındı, Botan tekrar
sadece DragonKick'e döndü.

**Yapıldı:**
- Yeni repo `origin` olarak eklendi, mevcut local git geçmişi (`ac2f2f5`,
  `8dd012f`) direkt push edildi — `main` branch'i artık GitHub'da.
- Botan reposundaki geçici kopya ve birleşik deploy workflow'u geri alındı.

**Kalan:**
- GitHub Pages'in bu repoda "Source: GitHub Actions" olarak açık olup
  olmadığı doğrulanmalı, ardından ilk deploy'un gerçekten yeşile döndüğü
  kontrol edilmeli.

## Oturum 3 — Pages açıldı, ilk deploy yeşil

İlk deploy denemesi "Ensure GitHub Pages has been enabled" hatasıyla düştü —
Sami Settings → Pages → Source: GitHub Actions'ı elle açtı. Ardından
`rerun_failed_jobs` ile aynı run yeniden tetiklendi ve **success** ile bitti.

- **Canlı link:** https://samiboran.github.io/platform-football/
- Bu sandbox `github.io`'ya egress policy yüzünden erişemediği için sayfayı
  görsel olarak ben doğrulayamadım — GitHub Actions tarafı tamamen yeşil,
  ama Sami'nin linki bir kere açıp saha/iki kale/orta çizgi göründüğünü
  teyit etmesi gerekiyor.
- M0 artık tamamen kapandı.

## Sıradaki oturum
- Sami linki teyit ettikten sonra M1'e başla: joystick hareketi (x + z),
  low-gravity zıplama, gölge sistemi, depth sort.
