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

## Oturum 10 — M3: Aksiyon ve power

Sami "Başla başla" deyip M3'e (en karmaşık kalan milestone) yeşil ışık
verdi. CLAUDE.md bölüm 4-5'teki bağlamsal Aksiyon/Dash/Özellik ve 3
segmentli power/şut/tutuş matrisi baştan sona kuruldu.

**Yapıldı:**
- `src/config/power.ts`: `POWER_MAX_SEGMENTS=3`, pasif dolum süresi (8sn/
  segment), dash maliyeti (yerde %25, havada %35 — havada biraz daha
  pahalı, CLAUDE.md'nin istediği gibi), dash hızı/süresi/retrigger cooldown'u,
  normal/power şut hızı (`SHOT_SPEED_NORMAL`, `x1.6` çarpan), power şut/
  tutuş segment maliyeti.
- `src/config/keeper.ts`: AI kaleci ayarları — takip hızı, yakalama menzili,
  temel tutma şansı + hız-bazlı düşüş referansı.
- `src/entities/Character.ts`: power segmentleri artık karakterin kendi
  state'i (`powerSegments`, pasif dolan, `spendPower()` ile harcanan),
  `facingX/Z` (son hareket yönü — joystick boşken dash bu yöne gider),
  4 yönlü dash (yerde ve havada, kendi hız/süre/cooldown'u ile,
  `CharacterInput`'a zorunlu `dashPressed` alanı eklendi).
- `src/systems/InputController.ts`: elmas dizilimli 4 dokunmatik tuş
  (ZIPLA/DASH/AKSİYON/ÖZEL) + klavye eşlemesi (Space/Z/X/C), edge-triggered
  "pressed" ve held-state "isHeld" ayrımı — Özellik+Aksiyon birlikte basılırsa
  power versiyonu, Özellik tek başına basılırsa (ileride) süper hareket.
- `src/entities/Ball.ts`: `shoot(dirX, dirZ, speed, chaos, isPower)` — M2'nin
  pasif dribble dokunuşundan ayrı, bilinçli bir şut. `lastShotWasPower`
  bayrağı, tutuş matrisinin "power şutu normal tutuşla asla durduramazsın"
  kuralını ifade etmek için eklendi (salt hız-bazlı şans bunu tek başına
  ifade edemezdi).
- `src/entities/AIKeeper.ts` (yeni, CLAUDE.md'nin orijinal kapsamında değil):
  henüz ikinci bir insan oyuncu/rakip AI olmadığından, sağ kaleyi savunan
  minimal bir AI kaleci — topu z ekseninde takip ediyor, kale ağzına giren
  ve yeterince hızlı topa karşı matrisin 4 hücresini uyguluyor (cooldown
  varsa ve şut power ise her zaman power tutuşa gider; cooldown yoksa normal
  şuta karşı da %30 ihtimalle "overcommit" edip power tutuş dener — bu da
  "normal şut + power tutuş → boşa gider" hücresini organik olarak tetikliyor).
- `src/systems/SoundFX.ts`: `save()` — kaleci tuttuğunda çift tonlu kısa ses.
- `src/scenes/MatchScene.ts`: her şey birleşti — joystick'in son yönü
  Aksiyon anındaki şut yönü olarak saklanıyor, Aksiyon+temas → `ball.shoot()`
  (Özellik basılıyken ve segment varsa power şut, hız `SHOT_SPEED_NORMAL *
  shotPowerMultiplier * (power ? 1.6 : 1)`), Dash input'u karaktere bağlandı,
  AI kaleci sağ kaleye yerleştirildi ve her frame güncelleniyor, sol altta
  3 kutulu power bar UI'ı segment doluluğuna göre renk değiştiriyor.

**Doğrulama (Playwright, geçici `window.__debugMatch`/`window.__game`
hook'larıyla — commit'ten önce kaldırıldı):**
- **Matrisin 4 hücresi de deterministik test edildi** (`Math.random`
  geçici override edilerek): Power şut + Power tutuş (cooldown müsait) →
  tutar ✅. Power şut + Normal tutuş (cooldown'da) → tutamaz ✅. Normal şut
  + Power tutuş (AI overcommit) → tutar ama cooldown yine de harcanıyor
  (boşa gidiyor) ✅. Normal şut + Normal tutuş → yavaş topta yüksek şansla
  tutuyor, hızlı topta düşük şansla kaçırıyor (dinamik tutma şansı) ✅.
- Dash maliyeti ayrıca izole test edildi: yerde ~0.25 segment, havada ~0.35
  segment (ilk denemede ikisi de ~0 çıktı — kaleci/dash state'i aynı test
  instance'ında sıfırlanmadığından kaynaklanan bir test script hatasıydı,
  ürün kodunda değil; retrigger cooldown + `isDashing` state'i reset
  edilince beklenen değerler doğrulandı).
- Power şutun hız çarpanı (`x1.6`) ve `lastShotWasPower` bayrağının doğru
  set/clear edildiği ayrıca doğrulandı.
- `npm run build` (tsc + vite) temiz geçiyor.
- Playwright ile Menu→CharacterSelect→StadiumSelect→Match akışı görsel
  olarak da doğrulandı: mavi oyuncu, kırmızı AI kaleci sağ kalede, power
  bar ve elmas dizilimli 4 dokunmatik tuş doğru render ediliyor; sağa
  hareket edip top itildiğinde AI kaleci de topu takip ediyor.

**Kapsam notu:** İnsan oyuncunun "tut" tarafı (kendi kalesini savunması)
şu an fiilen erişilemez — kendi kalesine şut atan bir rakip yok. Bu, gerçek
bir rakip/AI opponent sistemi geldiğinde (M3 sonrası, ROADMAP'in M5 lig
maddesinin de beklediği şey) devreye girecek.

## Oturum 11 — M4'ü kapat: 4 karaktere özel süper hareket

Sami "Devam et" dedi, M3 bittiğine göre sıradaki doğal iş M4'ün son maddesiydi:
her karakterin 3 segmentli süper hareketi (CLAUDE.md section 6'daki kimlik
tablosu: capoeira ters vuruş / gambeta / poşet top / ritimli zamanlama).

**Tasarım kararı:** CLAUDE.md süper hareketin ne yaptığını somut olarak
tarif etmiyor, sadece her karakterin futbol-kültürü kimliğini veriyor. Dördü
de tanım gereği bir top eylemi (vuruş, kontrollü paslama, havada sapma,
zamanlı şut) olduğundan, süper hareketi sadece topa değerken tetiklenen bir
"gelişmiş şut" ailesi olarak tasarladım — topsuzken çalışan ayrı bir hareket
eklemedim (spec'te olmayan bir mekanik icat etmemek için).

**Yapıldı:**
- `src/config/super.ts` (yeni): `SUPER_MOVE_SEGMENT_COST` (=POWER_MAX_SEGMENTS,
  tüm bar), karakter başına hız çarpanı (Brezilya x2.0 ham güç, Arjantin x1.5
  kontrol, Kenya x1.3 zayıf ama kaotik + x2.2 ekstra sapma genliği, Kongo x1.6
  taban + on-beat x1.35 bonus), Kongo'nun ritim döngüsü (1.2sn periyot, 0.18sn
  sweet-spot penceresi), ve `SUPER_SHOT_CATCH_CHANCE_MULTIPLIER` (0.5) —
  CLAUDE.md section 5'in "tutma şansı... özel şuta karşı düşer" cümlesini
  doğrudan uyguluyor.
- `src/entities/Ball.ts`: `shoot()`'a `isSuper` ve `chaosMagnitude` parametreleri
  eklendi, yeni `lastShotWasSuper` bayrağı (temas/şuttan sonra sıfırlanıyor,
  `lastShotWasPower` ile aynı desende).
- `src/entities/AIKeeper.ts`: bir power tutuşa commit edilse bile, top
  `lastShotWasSuper` ise keeper artık garanti tutmuyor — sadece
  `SUPER_SHOT_CATCH_CHANCE_MULTIPLIER` ihtimalle tutuyor, yoksa süper şut
  keeperi geçiyor. Ayrıca gözden kaçan bir eksik giderildi: kaleci artık
  gerçekten `KEEPER_TRACK_SPEED`'i kullanıyor (önceden import edilip
  kullanılmıyordu, varsayılan `MOVE_SPEED`'e düşüyordu — `Character`'a
  `speedMultiplier = KEEPER_TRACK_SPEED / MOVE_SPEED` olarak geçiliyor).
- `src/systems/InputController.ts`: `TouchButton.setActive()` + `InputController.
  setSpecialGlow()` — Kongo'nun ritim penceresi için ÖZEL tuşu yeşile dönüyor.
- `src/scenes/MatchScene.ts`: `rhythmClock` (sahadan bağımsız, karakterin
  kendi ritim saati), `performSuperMove()` — tam bar + top temasıyla
  `consumeSpecialAlonePressed()` tetikliyor, karaktere göre dallanıyor:
  - **Brezilya** — bakılan yöne (joystick'ten bağımsız) ham güçle vuruyor.
  - **Arjantin** — yön girdisini yok sayıp doğrudan kale merkezine kilitli,
    kontrollü ama daha düşük hızlı bir şut (asla yanlış yöne gitmiyor).
  - **Kenya** — daha zayıf ama normal kaos dokunuşundan çok daha geniş
    genlikte havada sapıyor.
  - **Kongo** — ritim penceresinde basılırsa bonus hız; pencere dışında da
    çalışıyor ama bonussuz.

**Doğrulama (Playwright, geçici `window.__debugMatch`/`window.__game`
hook'larıyla — commit'ten önce kaldırıldı):**
- 4 karakterin süper hız formülleri ayrı ayrı hesaplanıp doğrulandı (ör.
  Brezilya 420×0.95×2.0=798, Arjantin 420×1.0×1.5=630, Kongo on-beat
  420×1.25×1.6×1.35=1134) — hepsi beklenen değerle birebir eşleşti.
  Kenya'nın kaos vektör matematiği de (jitter'ın normalize öncesi yön
  vektörüne eklenip sonra hızla çarpılması) elle hesaplanıp teyit edildi.
- Süperin tam bar gerektirdiği ve tamamen tükettiği (3→0) doğrulandı; 3'ten
  az segmentle çağrıldığında hiçbir şey olmadığı (no-op, top hızı/segment
  değişmiyor) ayrıca doğrulandı.
- AIKeeper'a karşı: normal power şut her zaman tutuluyor (deterministik),
  süper şut düşük random rulette yine tutuluyor, yüksek rulette keeperi
  geçiyor — tasarlanan %50 cezası doğru çalışıyor.
- Kongo'nun ÖZEL tuş rengi doğrudan `specialBtn.circle.fillColor` okunarak
  pencere içinde/dışında doğrulandı (yeşil/beyaz) — ekran görüntüsü
  denemeleri 180ms'lik dar pencereyi örnekleme şansıyla kaçırdı, bu yüzden
  koda doğrudan bakıldı.
- `npm run build` (tsc + vite) temiz geçiyor.

**Kapsam notu:** M4 artık tamamen kapandı. M5'in kalan tek maddesi (lig/
hikaye akışı) hâlâ gerçek bir rakip/AI opponent gerektiriyor — mevcut
AIKeeper sadece kaleci, sahada oynayan bir rakip değil.

## Oturum 12 — Saha kenar boşluğu düzeltmesi

Sami kendi masaüstü tarayıcısından bir ekran görüntüsü paylaştı: sahanın
sağında/solunda büyük koyu boş alan vardı, "mobil için mi böyle oldu"
diye sordu. Kaynağı buldum: `FIELD_WIDTH` hiçbir zaman `GAME_WIDTH`'e göre
ölçeklenmiyordu — sabit `CHARACTER_WIDTH * 4.5 * 2` idi (70*4.5*2=630px),
960px'lik oyun genişliğinin sadece **%66**'sı. Mobil'le ilgisi yoktu, saf
bir tuning eksikliğiydi.

**Düzeltme (`src/config/arena.ts`):** `CHARACTER_WIDTH` 70'ten 82'ye
çıkarıldı — yakın kenar genişliği artık ~%77'ye çıkıyor (960'ın). Daha da
ileri gidilemedi çünkü `GOAL_ZONE_DEPTH` (kale ağı arka paneli) de aynı
sabitten türüyordu ve saha daha da genişlerse ağ paneli ekranın solundan/
sağından taşıyordu (`LEFT_GOAL_BACK_X` negatife düşüyordu). Bunu çözmek
için `GOAL_ZONE_DEPTH`'i `CHARACTER_WIDTH` yerine `CHARACTER_HEIGHT`'tan
türetecek şekilde ayırdım (sabit bir "ağ derinliği" — sahanın yatay
ölçeğiyle birlikte büyümemeli), bu da genişliği güvenli marjla (~24px)
maksimuma çıkarmayı sağladı.

**Doğrulama:** Playwright ile hem 960×540 mantıksal çözünürlükte hem de
Sami'nin ekran görüntüsüyle aynı geniş masaüstü pencere boyutunda (1920×1000)
karşılaştırma yapıldı — saha artık kenara çok daha yakın, kale ağları hâlâ
tam ekranda (kesilmiyor). Canvas dışındaki siyah şeritler (letterbox) sabit
16:9 oranı yüzünden kalmaya devam ediyor — bu ayrı bir şey, "kamera sabit"
kuralının doğal sonucu, saha içindeki ölü alanla karıştırılmamalı.
`npm run build` temiz.

## Oturum 13 — Gerçek AI rakip (M5)

Sami "onu da yap" dedi (gerçek rakip, bkz. Oturum 11'in kapsam notu).
Şu ana kadar sağdaki AI sadece bir kaleciydi; sahada oynayan, top kovalayan,
şut çeken bir rakip yoktu, insanın kendi kalesi de tamamen savunmasızdı.

**Yapıldı:**
- `src/config/opponent.ts` (yeni): AI'nin karar verme ayarları — şut
  cooldown'u, temas başına şut/dribbling şansı, power şut kullanma şansı,
  her şuta eklenen temel nişan sapması (+ kaotik karakterlerde ekstra).
  Rakibin hız/güç/şut gücü/kaos gibi stat'ları kendi ayrı config'i yok —
  doğrudan `characters.ts`'teki atanmış karakterin kendi verisini kullanıyor.
- `src/entities/AIOpponent.ts` (yeni): sağ yarı sahaya insan oyuncuyla
  simetrik şekilde sınırlı (`CENTER_LINE_X`..`RIGHT_GOAL_LINE_X`), topu
  sadece kendi yarısındayken kovalıyor, top uzaktayken yarı sahasının
  ortasına ("home") dönüyor. Top temasında ya sıradan bir dribbling
  dokunuşu (`applyTouch`) ya da bir şut (`shoot`) çekiyor — hangisi
  olacağı cooldown + şans tablosuna bağlı, tıpkı insan oyuncunun
  bağlamsal Aksiyon'u gibi laser-guided değil (CLAUDE.md: otomatik nişan
  yok kuralı AI'ye de uygulandı — her şutta bir taban sapma var).
- `src/entities/AIKeeper.ts`: `'left'|'right'` taraf parametresi alacak
  şekilde genelleştirildi (önceden sadece sağ kaleye gömülüydü) — menzil/
  yaklaşma yönü kontrolleri, topu tutarken duruş ofseti ve başarısız power
  şuttan sekme yönü artık tarafa göre aynalanıyor.
- `src/scenes/MatchScene.ts`: maç başında insanın seçtiği karakterden
  FARKLI rastgele bir karakter AI'ye atanıyor (`CHARACTER_ORDER`'dan
  filtrelenip seçiliyor) — gerçek bir AI karakter seçim ekranı kapsam
  dışı tutuldu, ama "AI de bir karakter oynuyor" hissi ucuz şekilde
  sağlandı. Sağ kaleci artık AI'nin kendi karakter stat'larını kullanıyor
  (önceden yanlışlıkla insanın stat'larını taşıyordu); yeni bir sol kaleci
  insanın stat'larıyla kendi kalesini otomatik savunuyor. HUD'a
  "Rakip: <isim>" eklendi.

**Doğrulama (Playwright, geçici `window.__debugMatch`/`window.__game`
hook'larıyla — commit'ten önce kaldırıldı):**
- AI, top kendi yarısındayken ona doğru hareket ediyor (x ve z'de ölçülüp
  doğrulandı); top insanın yarısındayken asla orta çizgiyi geçmiyor, kendi
  yarısının merkezine dönüyor.
- Zorla tetiklenen bir temas + şut kararı, topu doğru yönde (insanın
  kalesine, negatif x) ve makul bir hızla fırlatıyor.
- Sol kaleci, sağ kalecinin aynadaki davranışıyla insanın kendi kalesine
  gelen bir power şutu doğru şekilde tutuyor; sağ kalecinin eski davranışı
  da (regression) hâlâ doğru çalışıyor — refactor bir şey kırmadı.
- 90 saniyelik saf-AI simülasyonunda (insan hiç dokunmadan) skor 0-0 kaldı
  — bu bir hata değil, beklenen sonuç: insan olmadan top bir kez AI'nin
  yarısından çıkınca onu geri getirecek kimse yok, AI da kendi yarısına
  geri dönüyor. Sınır/home-dönüş mantığının doğru çalıştığını kanıtlıyor,
  ama denge/zorluk sinyali değil.
- Gerçek bir maç akışında (insan hareket ettirip topa vurarak) AI'nin
  topu takip edip tepki verdiği, kalecilerin farklı renklerde doğru
  yerleştiği ve gol mekanizmasının yeni varlıklarla birlikte hâlâ
  çalıştığı ekran görüntüleriyle doğrulandı.
- `npm run build` (tsc + vite) temiz geçiyor.

**Kapsam notu / bilinçli basitleştirmeler:**
- AI kendi 3-segment süper hareketini kullanmıyor — sadece normal/power
  şut arasında karar veriyor. Süper hareketin AI tarafında da anlamlı
  olması için ayrı bir karar katmanı gerekirdi, bu geçişte kapsam dışı
  bırakıldı.
- AI'nin gerçekte ne kadar zorlayıcı/eğlenceli olduğu (denge hissi) kod
  düzeyinde doğrulanamaz — M4'teki karakter dengesi notunda olduğu gibi
  Sami'nin kendi oynayışına bakıyor.
- İnsanın kendi "tut" input'u (Aksiyon, topsuzken kendi kalesine karşı)
  hâlâ yok — onun yerine otomatik bir takım arkadaşı kalecisi kondu. Bu,
  CLAUDE.md'nin bağlamsal Aksiyon tarifini birebir karşılamıyor ama aynı
  ihtiyacı (kendi kale boş kalmasın) karşılıyor; gerçek 1v1 (iki insan)
  veya insanın kendi kalesini de savunması istenirse ayrı bir iş.
- Lig/hikaye akışı hâlâ yok — bloke eden asıl şey (gerçek rakip) artık
  ortadan kalktı, ama kademe/ilerleme yapısının kendisi henüz kurulmadı.

## Oturum 14 — Gerçek bir bug turu: titreşim, klavye, karakter şekli

Sami kendi tarayıcısında oynadı ve dört şey bildirdi: kaleci/rakip
"takılıyor", Space şut çekmiyor, top şut çekilince hep düz gidiyor (çapraz
değil), karakterler düz dikdörtgen duruyor.

**Bulgu 1 — gerçek bir bug, titreşim:** `AIKeeper`'ın z-takibi (`Math.abs(dz)
> 2 ? sign : 0`) ve `AIOpponent`'ın hareket deadzone'u (4) her frame'lik
hareket mesafesinden (KEEPER_TRACK_SPEED=180px/s → ~3px/frame, hızlı
karakterlerde ~4.6px/frame) DAHA KÜÇÜKTÜ. Hedefe yaklaşınca her frame hedefi
1px kadar aşıp yön değiştiriyor, sonsuz döngüde titriyordu — "takılma" tam
olarak buydu. `config/keeper.ts`'e `KEEPER_MOVE_DEADZONE=10`,
`config/opponent.ts`'te `OPPONENT_MOVE_DEADZONE`'u 4'ten 12'ye çıkarıp
düzelttim (her ikisi de en hızlı karakterin bir frame'lik hareketini rahat
aşacak şekilde seçildi). Playwright ile 120 frame boyunca z pozisyonu
izlenip son 10 frame'de hiç değişmediği (delta=0) doğrulandı.

**Bulgu 2 — mapping tercihi, bug değil:** Klavyede Space=Zıpla, Z=Aksiyon
idi; Sami Space ile şut beklemişti. `InputController.ts`'te ikisi takas
edildi (Space=Aksiyon, Z=Zıpla). Bu aynı zamanda "top hep düz gidiyor"
şikayetini de açıklıyordu — Sami hiç gerçek `shoot()`'u tetiklemiyordu,
sadece M2'nin pasif dribbling dokunuşunu (`applyTouch`, hep hareket
yönünde düz) görüyordu.

**Bulgu 3 — şut fiziği zaten doğruymuş:** `Ball.shoot()` çapraz girdiyi
zaten doğru işliyor (`dirX,dirZ` normalize edilip hıza çarpılıyor). Atomik
bir Playwright testiyle (gerçek klavye event'leri yerine sahte tuş state'i
+ tek elle tetiklenen `scene.update()`, Phaser'ın kendi RAF döngüsüyle yarış
durumu olmadan) doğrulandı: Yukarı+Sağ basılı Space'e basınca top gerçekten
çapraz gidiyor (vx=vz=297, büyüklük=420=SHOT_SPEED_NORMAL — yani gerçek şut,
dribbling değil). İlk deneme yanlışlıkla dribbling hızını (260) ölçmüştü,
sebebi gerçek zamanlı klavye event'leri ile Phaser'ın arka planda çalışan
kendi RAF döngüsü arasındaki yarış durumuydu — test metodolojisi hatasıydı,
ürün kodunda değil.

**Bulgu 4 — görsel istek, `Character.ts`:** Düz dikdörtgen yerine basit bir
kafa (daire, nötr ten tonu placeholder) + gövde (dikdörtgen, karakterin
kendi rengi) silueti eklendi — hâlâ placeholder, gerçek sprite üretmek
CLAUDE.md gereği benim işim değil, ama artık bir insan gibi okunuyor.
Container tabanlı yeni yapı üstten sabitlenmiş (local y=0 = kafanın üstü),
`syncTransform` buna göre güncellendi. Bu arada fark ettiğim ayrı bir küçük
hata da düzeltildi: Phaser `Container.destroy()` çocuklarını otomatik yok
etmiyor (sadece listeden çıkarıyor) — `Character.destroy()` artık önce
`sprite.removeAll(true)` çağırıyor. Şu an hiçbir yerden çağrılmadığı için
canlıda hiç tetiklenmeyen bir hataydı, ama düzeltmesi bedavaydı.

**Doğrulama:** Tüm düzeltmeler Playwright ile (çoğu gerçek klavye event'i,
biri sahte tuş state'iyle atomik/yarışsız test) doğrulandı, `npm run build`
temiz. Ekran görüntüsüyle yeni karakter silueti de kontrol edildi.

## Oturum 15 — Top sıkışması ve yanlış kaleci yakalamaları

Sami bir deploy sonra tekrar test etti: "vurma yok, top arada sıkışıyor iki
kişi arasında, neden hâlâ kaleci var." Üç şikayetin de tek bir kök nedeni
vardı.

**Kök neden 1 — sahiplik kilidi yoktu:** Bir kaleci topu tutarken
(`holdTimer > 0`) her frame topun pozisyonunu kendi konumuna zorluyordu,
ama insan oyuncu ve `AIOpponent` bunu bilmeden AYNI FRAME içinde topa
dokunup itmeye devam edebiliyordu. Sonuç: kaleci topu zorla kendine çekiyor
→ insan/rakip iter → kaleci bir sonraki frame'de yine zorla çekiyor →
sonsuz çekişme. Sami'nin gördüğü "top iki kişi arasında sıkışıyor" tam
olarak buydu. **Düzeltme:** `AIKeeper`'a `isHolding` getter'ı eklendi;
`MatchScene` her frame `ballHeld = keeper.isHolding || leftKeeper.isHolding`
hesaplayıp hem insanın kendi temas/şut kodunu hem `AIOpponent.update()`'i bu
süre boyunca tamamen devre dışı bırakıyor. Playwright ile doğrulandı: kaleci
tutarken topun üstüne gelen insan artık topu hareket ettiremiyor (hız sıfır
kalıyor, pozisyon kalecinin tuttuğu yerde sabit kalıyor).

**Kök neden 2 — kaleciler dribbling'i şut sanıyordu:** Yakalama denemesi
tetikleyen "top yaklaşıyor" eşiği düz bir hız sayısıydı (±40px/s) — M2'nin
pasif dribbling dokunuşu (`BALL_TOUCH_SPEED=260`) bunu kolayca aşıyordu.
Yani insan sadece kendi yarısında normal dribbling yaparken bile, top
kalesine doğru gitse, kendi kalecisi bunu "şut" sanıp topu kapıyordu — bu
da "neden hâlâ kaleci var (beni rahatsız ediyor)" hissini açıklıyor.
**Düzeltme:** `Ball`'a yeni bir `lastTouchWasShot` bayrağı eklendi
(`shoot()`'ta true, `applyTouch()`'ta false) — artık kaleciler SADECE
gerçek bir şuta (normal/power/süper, fark etmez) tepki veriyor, hıza
bakılmaksızın hiçbir dribbling dokunuşu yakalama denemesi tetiklemiyor.
Bu, düz bir hız eşiği ayarlamaktan (Kenya'nın zayıf şutu 294px/s'de,
dribbling 260px/s'de — aradaki fark çok dardı) çok daha sağlam bir çözüm.

**"Vurma yok" şikayeti:** Ayrı bir bug değildi — yukarıdaki çekişme/yanlış-
yakalama döngüsü top pozisyonunu o kadar kararsız hale getiriyordu ki,
Sami'nin gerçek şutları da bu kaosun içinde kayboluyordu. İki kök neden
düzeltilince şut mekaniği zaten çalışıyor (Oturum 14'te atomik test ile
zaten doğrulanmıştı).

**Doğrulama (Playwright, geçici hook'larla — commit'ten önce kaldırıldı):**
- Hızlı bir dribbling dokunuşu (`lastTouchWasShot=false`, vx=-300) artık
  kaleciyi tetiklemiyor ✅.
- Gerçek bir şut (`lastTouchWasShot=true`) hâlâ matrise göre doğru
  değerlendiriliyor — yavaş şut yüksek şansla tutuluyor, power+power hücresi
  hâlâ garanti tutuyor (regression testleri geçti) ✅.
- Sahiplik kilidi: kaleci tutarken tam üstüne gelen insan topu hareket
  ettiremiyor, hız sıfır ve pozisyon sabit kalıyor ✅.
- Gerçek zamanlı dribbling testinde (800ms sağa+800ms sola) kaleci hiç
  yanlışlıkla tutmadı ✅.
- `npm run build` temiz.
