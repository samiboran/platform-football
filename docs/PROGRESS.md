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

## Oturum 4 — M1 öncesi ölçek denetimi

Sami M1'e geçmeden önce ölçeği gözden geçirmemi istedi: karakter boyu %12-15
aralığında mı, iki kale rahat görünüyor mu. `MatchScene`'e geçici olarak iki
placeholder karakter kutusu (CHARACTER_WIDTH × CHARACTER_HEIGHT) ekleyip
Playwright ile ekran görüntüsü aldım.

**Bulgu:** Karakter boyu oranı doğruydu (70/540 = %13), ama saha genişliği
çerçevenin sadece ~%50'sini kaplıyordu — her iki yanda geniş, boş bir
karanlık kenarlık vardı. Sebep: `CHARACTER_WIDTH` (42px, gerçekçi bir insan
silueti oranı) doğrudan "yarı saha = 4.5 karakter genişliği" formülüne
giriyordu, bu da sahayı gereğinden dar yapıyordu. CLAUDE.md'nin "Kadraj
birinci görselden: tek ekranda iki kale" hedefiyle çelişiyordu.

**Karar (arena.ts'te uygulandı):** `CHARACTER_WIDTH`'i saf bir "oyun alanı
ayak izi / kişisel mesafe" birimi olarak yeniden tanımladım (70px, boyla
aynı), 4.5 katsayısı sabit kaldı — bu da yarı saha genişliğini 189px'ten
315px'e çıkardı, saha artık çerçevenin ~%83'ünü kaplıyor. Görselde çizilen
placeholder sprite için ayrı, daha dar bir `CHARACTER_SPRITE_WIDTH` (40px)
eklendi ki insansı oran (M1/M4'te gerçek karakter render'ı bunu kullanacak)
korunsun. Bu, ROADMAP'te olmayan bir tasarım kararıydı ama görsel kanıtla
(before/after ekran görüntüsü) doğrulanıp doğrudan uygulandı.

Geçici audit kodu `MatchScene.ts`'ten geri alındı — gerçek karakter render'ı
M1'in kendi işi.

## Oturum 5 — M1: Hareket

**Yapıldı:**
- `src/config/movement.ts`: MOVE_SPEED (220 px/s), GRAVITY (600), JUMP_VELOCITY
  (380) — low-gravity floaty zıplama (~1.27s hava süresi, ~120px tepe yükseklik).
- `src/systems/VirtualJoystick.ts`: dokunmatik/mouse joystick, bırakınca
  merkeze dönüyor. Aşağı sürükleme = kameraya yakın (-z), yukarı = uzak (+z).
- `src/systems/InputController.ts`: joystick + klavye ok tuşları (PC fallback)
  birleşik hareket vektörü, ayrı bir ZIPLA dokunmatik tuşu + Space, edge-
  triggered jump (basılı tutunca sürekli zıplamıyor).
- `src/entities/Character.ts`: x/z/y state, sınır clamp (kendi yarısı +
  touchline'lar), yerçekimi/zıplama fiziği, zorunlu gölge (y'yi takip
  etmiyor, sadece z-düzleminde, y arttıkça küçülüp soluyor), `setDepth()`
  ile otomatik z-sıralı render.
- `MatchScene`: bir kontrol edilebilir karakter + F1 ile açılıp kapanan,
  hareket etmeyen bir "referans" karakter (sadece depth-sort'u görsel
  kanıtlamak için debug amaçlı, gerçek oyun nesnesi değil).

**Doğrulama (Playwright, ekran görüntüleriyle):**
- Sağ oku 2sn basılı tutunca karakter tam orta çizgide duruyor (x=480), geçmiyor.
- Yukarı oku basılı tutunca z, DEPTH_MAX'ta (210) clamp'leniyor, öteye geçmiyor.
- F1 açıkken referans karakterle aynı x'e gelip z'yi aşınca (z=210 > ref z=178.5),
  referans (kameraya daha yakın) mavi karakteri doğru şekilde önden kesiyor.
- Zıplarken karakter yukarı kalkarken gölgesi yerde kalıyor, küçülüp soluyor.
- Konsol hatası yok.

## Oturum 6 — Sahaya perspektif

Sami sahanın düz dikdörtgen yerine gerçek perspektif kazanmasını istedi.
`arena.ts`'deki `projectToScreen` artık üç şey döndürüyor (`screenX, screenY,
scale`), tüm sahne/entity kodu buradan besleniyor.

**Yapıldı (`src/config/arena.ts`):**
- `widthScaleAt(z)`: saha trapez — `PITCH_FAR_WIDTH_RATIO=0.75`, yakın kenar
  %100, uzak kenar %75 genişlik. `screenX = CENTER_X + (x-CENTER_X)*widthScaleAt(z)`.
  Orta çizgi (x=CENTER_X) simetri ekseni olduğu için hep dikey kalıyor.
- `depthScaleAt(z)`: gerçek yüksekliği olan her şey (karakter, top, kale
  direği) için ortak küçülme çarpanı — `DEPTH_FAR_SCALE=0.85`, lineer.
- `DEPTH_SCALE` artık `(GAME_HEIGHT * 0.9) / DEPTH_MAX` formülünden
  hesaplanıyor (saha ekranın %90'ını kaplasın, tek satırla ayarlanabilir).
- `GOAL_HEIGHT = CHARACTER_HEIGHT * 1.4`.

**Yapıldı (`src/systems/pitchRenderer.ts`):**
- Tribün bandı: `y=0..FAR_Y` arası, saha kenarında ince bir çizgi.
- Çim: `DEPTH_MIN..DEPTH_MAX` arası 6 trapez şeride bölünüp iki yeşil tonu
  alternatif dolduruluyor — otomatik olarak uzakta dar, yakında geniş çıkıyor.
- Saha çizgisi artık düz dikdörtgen değil, 4 köşeli bir trapez (stroke).
- Kaleler: zemin izdüşümü + arkada ağ dokulu (grid) panel + önde direkler/
  üst direk (`POST_COLOR` sarımsı, beyaz saha çizgileriyle karışmasın diye).
  Uzak direk yüksekliği `GOAL_HEIGHT * depthScaleAt(farZ)`, yakın direk
  `depthScaleAt(nearZ)` — uzak görünür şekilde kısa. İlk versiyon (yan
  panel + tavan paneli dahil tam kutu) küçük ekranda çok karışık/okunaksız
  çıktı, sadeleştirip sadece zemin+arka panel+çerçeveye indirildi.

**Yapıldı (`src/entities/Character.ts`):**
- Sprite ve gölge artık `projectToScreen(...).scale` ile ölçekleniyor —
  uzaklaştıkça küçülüyor, gölge hem zıplama hem derinlik yüzünden aynı anda
  küçülüp soluyor (`depthScale * jumpShrink`).

**Yapıldı (`MatchScene.ts`):** F1 debug overlay'deki yarı-saha sınır kutusu
düz dikdörtgen yerine gerçek trapez olarak çiziliyor.

**Doğrulama (Playwright ekran görüntüleri):** yakın/uzak karşılaştırmasında
karakter boyu belirgin şekilde küçülüyor, saha trapez + çim şeritleri +
tribün bandı + hacimli kaleler doğru görünüyor, konsol hatası yok.

## Sıradaki oturum
- M2: top fiziği (yerçekimi, sekme, sürtünme, duvar sekmesi), karakter-top
  teması (z toleransı geniş — CONTACT_TOLERANCE_Z zaten arena.ts'te hazır),
  gol algılama + skor + süre + ResultScene. Topun gölgesi ve ölçeği de
  Character'daki aynı `projectToScreen(...).scale` + "z-düzleminde kal,
  y'ye göre küçül" mantığını kullanmalı — sistem zaten buna hazır.
