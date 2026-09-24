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

## Oturum 7 — M2: Top

**Yapıldı:**
- `src/config/ball.ts`: BALL_GRAVITY (700), BALL_BOUNCE_RESTITUTION (0.6),
  BALL_MIN_BOUNCE_VY (altında zıplamayı kesip yere yapıştırıyor), BALL_WALL_
  RESTITUTION (0.7), BALL_GROUND_FRICTION (220), BALL_TOUCH_SPEED (260).
- `arena.ts`'e `BALL_RADIUS` (10) eklendi.
- `src/config/match.ts`: MATCH_DURATION_SECONDS (150 — CLAUDE.md'nin "2-3
  dakika" aralığının ortası).
- `src/entities/Ball.ts`: yerçekimi + yerden sekme (restitution ile enerji
  kaybı, çok yavaşlayınca durur), touchline'lardan sekme (z ekseni),
  kale çizgisi mantığı — gol ağzı z-aralığındaysa içeri geçip ağın arkasından
  sekiyor, ağzın dışındaysa direğe çarpmış gibi kenardan sekiyor; ilk geçişte
  `'left'|'right'` gol sinyali dönüyor. Render Character ile aynı desen:
  `projectToScreen(...).scale` ile küçülen sprite + zorunlu gölge.
- `MatchScene.ts`: skor tablosu + geri sayan süre HUD'u, karakter-top temas
  kontrolü (CONTACT_TOLERANCE_X/Z, basit "dribble nudge" — gerçek şut/tutuş
  matrisi M3'te gelecek), gol olunca skor artırıp topu merkeze resetliyor,
  süre bitince (veya "Bitir" butonuyla) `ResultScene`'e son skorla geçiyor.
- `ResultScene.ts`: geçirilen skoru "1 — 1" formatında gösteriyor.

**Doğrulama (Playwright + geçici debug tuşlarıyla, commit'ten önce kaldırıldı):**
- Top 40px yükseklikten bırakılınca zıplayıp merkeze yerleşiyor.
- Karaktere değince top karakterin hareket yönünde itiliyor.
- Sağ kaleye gol → skor "1 — 0" oluyor, top merkeze dönüyor.
- Sol kaleye gol → skor "1 — 1" oluyor, top merkeze dönüyor.
- Süre "2:30"dan geri sayıyor; erken bitirilince ResultScene "1 — 1" gösteriyor.
- Konsol hatası yok.

## Oturum 8 — M3'ü atla, ona bağımlı olmayan işleri bitir (M4 + M5'in bir kısmı)

Sami M3'ü (aksiyon/power) daha sonraya bıraktı, "ona gereksinimin olmayan
şeyleri yap bitir" dedi. M4'ün süper hareket dışındaki her maddesi ve M5'in
saha seçimi + veri tabanlı saha etkileri maddesi M3'e bağımlı değildi.

**Yapıldı:**
- `src/config/characters.ts`: Brezilya/Arjantin/Kenya/Kongo — CLAUDE.md
  bölüm 6'daki kimlik/arketip/özel hareket isimleriyle birebir, artı hız/
  güç/şutGücü/tutmaŞansı/cooldown çarpanları (arketipe göre ilk denge:
  Brezilya hızlı-hafif-güçsüz, Kongo yavaş-çok güçlü, Kenya zayıf+kaotik,
  Arjantin tamamen 1.0 baseline).
- `src/scenes/CharacterSelectScene.ts`: 4 kart, tıkla-seç, DEVAM ile
  `StadiumSelect`e geçiyor.
- `src/config/stadiums.ts`: Brezilya/Arjantin/Kenya/Kongo sahaları —
  top sekme/sürtünme çarpanı + rüzgar (x/z sabit kuvvet) + Kongo için
  "ritim görsele yansır" bayrağı. "Dar alan hissi" (Arjantin) saha
  geometrisini değiştirmek yerine oyuncu hız çarpanıyla temsil edildi —
  geometriyi maça göre dinamikleştirmek çok daha büyük bir iş olurdu.
- `src/scenes/StadiumSelectScene.ts`: aynı kart deseni, MAÇA BAŞLA ile
  seçilen karakter+saha'yı `MatchScene`'e taşıyor.
- `Character.ts`: `speedMultiplier` parametresi eklendi, `MOVE_SPEED`'i
  ölçekliyor. `Ball.ts`: `BallTuning` (bounce/friction çarpanı + rüzgar)
  ve `applyTouch`'a `power`/`chaos` parametreleri eklendi — Kenya'nın
  "poşet top" kimliği dokunuşta rastgele sapma olarak uygulandı.
- `MatchScene.ts`: seçilen karakter/saha'yı `init(data)`'dan okuyup
  Character/Ball'a geçiriyor, HUD'da "Karakter: X | Saha: Y" gösteriyor,
  saha rengiyle hafif bir "mood tint" (Kongo'da nabız gibi atan) ekliyor.
- `main.ts` + `MenuScene.ts`: akış artık Menu → CharacterSelect →
  StadiumSelect → Match → Result.
- `assets/characters/<id>/` ve `assets/stadiums/<id>/` klasörleri +
  birer README, gerçek pixel-art gelene kadar nereye konacağını açıklıyor.

**Doğrulama (Playwright):** Menu→CharacterSelect→StadiumSelect→Match akışı
uçtan uca çalışıyor, seçilen karakterin rengi ve saha adı maça doğru
taşınıyor, Kongo'nun ritim pulse'ı görünüyor, konsol hatası yok. Hız/güç
çarpanlarının gerçek oynanışta "hissedilir" fark yaratıp yaratmadığı henüz
insan tarafından oynanarak test edilmedi — kod düzeyinde doğru bağlandığı
kesin (build + statik tip kontrolü + manuel kod okuma).

## Sıradaki oturum
- Sami hazır olduğunda M3: bağlamsal Aksiyon tuşu (top bizdeyse şut,
  değilse tut), joystick yönünden şut yönü, dash (4 yön, havada da),
  3 segmentli power barı + UI, power şut/tutuş matrisi (dört durum),
  dash'in power tüketimi, tutma cooldown'u + dinamik tutma şansı.
  M2'deki basit "dribble nudge" burada gerçek şut mekaniğiyle değişecek,
  ve M4'ün "özel hareket (3 segment süper)" maddesi M3'ün üzerine kurulacak.

## Oturum 9 — Devam: mobil dokunuş düzeltmesi, ses, seyirci

Sami sahanın nasıl kod ile çizildiğini sordu (perspektif formülü, `Graphics`
API — cevap sohbette, koda dokunmadım), sonra "kalan, yapabildiğin kodlara
sırayla devam et" dedi. M5'in ses/seyirci maddesini bitirdim, ayrıca ciddi
bir mobil hata buldum ve düzelttim.

**Bulgu + düzeltme — çoklu dokunuş kırıktı:** Phaser varsayılan olarak
sadece 1 dokunuşu izliyor (`activePointers` varsayılanı 1). Bu, gerçek bir
telefonda joystick'i basılı tutup aynı anda ZIPLA'ya basmanın **çalışmadığı**
anlamına geliyordu — CLAUDE.md'nin "mobil öncelikli" kuralına doğrudan
aykırıydı. `main.ts`'e `input: { activePointers: 3 }` eklendi (3 = joystick
+ zıpla + M3'te gelecek bir tuş daha için pay). Playwright ile gerçek CDP
çoklu-dokunuş simülasyonu (`Input.dispatchTouchEvent`, iki ayrı touch id)
kullanılarak doğrulandı: joystick basılıyken ayrı bir dokunuşla zıplama
tetiklenip serbest bırakıldığında joystick'in kendi vektörü hiç bozulmadan
devam ediyor.

**Yapıldı:**
- `src/systems/SoundFX.ts`: dış ses dosyası yok, Web Audio osilatörleriyle
  sentezlenmiş efektler — `kick()` (top temasında), `goal()` (yükselen 4
  notalık arpej), `whistle()` (maç başı/sonu, 2200Hz kısa ton).
  `MatchScene`'e bağlandı: temas anında bir kez (spam olmasın diye rising-
  edge kontrolü ile), gol olunca, maç başlarken/biterken düdük.
- `src/systems/CrowdBand.ts`: tribün bandında 26 küçük renkli nokta,
  hafif sinüs dalgasıyla idle "bob" hareketi. `celebrate()` golde her
  noktayı sırayla (küçük gecikmeyle, dalga hissi için) zıplatıp büyütüyor.
  Sürekli kalabalık gürültüsü (CLAUDE.md: "sessizlik → uğultu →
  tezahürat") kapsam dışı bırakıldı — bu ayrı bir iş, ileride yapılabilir.

**Doğrulama (Playwright):** Gerçek çoklu-dokunuş testi (yukarıda), ses
efektleri hatasız çalışıyor (console/pageerror yok — Web Audio headless
Chromium'da da sorunsuz), seyirci noktaları golde görünür şekilde
zıplıyor/büyüyor (ekran görüntüsüyle doğrulandı).

## Sıradaki oturum
- Sami hazır olduğunda M3'e geç (bkz. yukarıdaki not).
- M5'in kalan maddesi (lig/hikaye akışı) gerçek bir rakip olmadan anlamsız
  — en azından basit bir kaleci/rakip AI'sı (ya da M3 sonrası 2. oyuncu)
  gerekiyor, bu yüzden bilinçli olarak atlandı.
