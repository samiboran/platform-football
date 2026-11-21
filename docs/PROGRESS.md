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

## Oturum 16 — Gerçek karakter sprite'ları

Sami Midjourney'de 4 karakterin (Brezilya/Arjantin/Kenya/Kongo) 360°
turnaround + idle/walk/run/slide/jump poz sayfasını üretti (chibi stil,
Pixel Cup Soccer referansına çok yakın). Bu sayfayı işleyip oyuna bağladım
— placeholder kafa+gövde silueti artık sadece F1 debug referans
karakterinde kalıyor, gerçek karakterler hepsi kendi sanatını kullanıyor.

**Görsel işleme (Claude Code tarafında):**
- Sayfa 4x4'lük düzenli bir grid (her karakter kendi satırında: 360°
  turnaround + animasyonlar) — pixel koordinatlarını kalibre edip her
  karakter için 6 poz kırptım: `front`/`back`/`left`/`right` (idle duruş)
  + `slide` (Dash pozu) + `jump` (zıplama pozu). Yürüme/koşma kareleri şu
  an kullanılmıyor (kapsam dışı bırakıldı, aşağıya bakın).
- **Arka plan temizliği iki başarısız denemeden sonra çözüldü:** önce
  basit renk-mesafeli flood-fill denedim, kenar halo'su bıraktı; sonra
  "kalın siyah outline'ı duvar say" yaklaşımını denedim, bu da outline'daki
  boşluklardan sızıp Kongo'nun karakterini parçaladı (özellikle koyu/mor
  tonlarda arka planla renk mesafesi çok azdı). İkisi de riskliydi.
  **Çözüm:** `rembg` (U2Net, gerçek bir ML segmentasyon modeli) kurup
  model dosyasını (176MB, GitHub releases'ten) indirdim — bu, tam olarak
  bozulan Kongo görselinde bile temiz, halo'suz bir kesim üretti. 24
  görselin hepsi bu şekilde işlendi, sonra şeffaf kenar boşlukları
  otomatik kırpıldı (bounding-box + 4px pay).
- Nihai PNG'ler `assets/characters/<id>/{front,back,left,right,slide,jump}.png`
  altına kondu (toplam ~660KB, 24 dosya).

**Oyuna bağlama:**
- `vite.config.ts`: `publicDir: 'assets'` eklendi — proje zaten `assets/`
  klasörünü asset pipeline'ının kalıcı yeri olarak kullanıyordu (CLAUDE.md,
  `assets/characters/README.md`), ayrı bir `public/` klasörü açıp aynı
  şeyi tekrarlamak yerine mevcut klasörü Vite'ın statik servis dizini
  yaptım.
- `characters.ts`: `CharacterPose` tipi + `CHARACTER_POSES` listesi +
  `characterSpriteKey(id, pose)` helper'ı eklendi (tek yerden, tutarlı
  texture key üretimi).
- `BootScene.ts`: artık gerçek bir `preload()`'u var — 4 karakter × 6 poz
  = 24 görseli Phaser'ın texture cache'ine yüklüyor.
- `Character.ts`: en büyük değişiklik. Artık opsiyonel bir `characterId`
  parametresi alıyor. Verilirse gerçek bir `Phaser.Image` (bottom-center
  origin — eski top-anchored container matematiğinden çok daha basit)
  kullanıp `resolvePose()` ile her frame doğru texture'a geçiyor: Dash
  aktifse `slide`, havadaysa (`y > 0`) `jump`, yoksa `facingX`/`facingZ`'e
  göre `front`/`back`/`left`/`right`. Verilmezse (sadece F1 debug referans
  karakteri) eski placeholder kafa+gövde siluetine düşüyor. Bu arada,
  Container'ı dokunurken fark edilen ayrı bir gerçek hata da düzeltildi:
  Phaser'da `Container.destroy()` çocuklarını otomatik yok etmiyor, sadece
  listeden çıkarıyor — `destroy()` artık önce çocukları elle yok ediyor.
- `MatchScene.ts`/`AIKeeper.ts`/`AIOpponent.ts`: insan oyuncu, sağ/sol
  kaleci ve rakip AI artık kendi gerçek `characterId`'leriyle `Character`
  oluşturuyor — hepsi kendi sanatını gösteriyor.
- `CharacterSelectScene.ts`: kart üzerindeki renkli placeholder dikdörtgen
  yerine artık gerçek `front` sprite'ı gösteriliyor.

**Doğrulama (Playwright, geçici `window.__debugMatch`/`window.__game`
hook'larıyla — commit'ten önce kaldırıldı):**
- Tüm sahne akışı (Menu → CharacterSelect → StadiumSelect → Match) konsol
  hatası olmadan çalışıyor, karakter seçim kartları gerçek sprite'ları
  gösteriyor.
- Maçta 4 karakter de (insan, sağ kaleci, sol kaleci, rakip AI) doğru
  renk/kimlikle render ediliyor.
- Poz/texture geçişleri deterministik doğrulandı: varsayılan `right`,
  zıplayınca `jump`, dash'teyken `slide`, dört `facingX`/`facingZ`
  kombinasyonu doğru şekilde `front`/`back`/`left`/`right`'a karşılık
  geliyor — hepsi tam olarak beklenen texture key'i üretti.
- `npm run build` temiz, `dist/characters/<id>/*.png` doğru şekilde
  build çıktısına giriyor (24 dosya doğrulandı).

**Kapsam notu:** Yürüme/koşma animasyon kareleri (sayfadaki WALK/RUN
satırları) şu an kullanılmıyor — statik poz-değişimi (idle/jump/slide)
yeterli bir ilk sürüm için, gerçek çok-kareli animasyon ayrı bir iş
(Phaser animation/spritesheet sistemi gerektirir). Kaleci-özel bir
dalış/tutma pozu da yok, mevcut 6 pozla idare ediliyor.

## Oturum 17 — Ayrı kaleci karakterlerini kaldır

Sami sprite'ları oynayınca iki kez aynı şeyi sordu: "kalede adamlarımız var,
onlar olmamalı, neden varlar?" — artı "top oyuncu-kale arası sıkışıyor."
İki şikayet de aynı kök nedene çıkıyordu: M3'te (henüz rakip yokken) eklenen
ayrı `AIKeeper` karakterleri, M5'te gerçek `AIOpponent` gelince gereksiz
hale gelmiş ama kaldırılmamıştı — kalede boşu boşuna duran, arada sırada
topu zorla kendine çeken iki fazladan karakter olarak kalmışlardı.

**Karar:** CLAUDE.md'nin ORİJİNAL tasarımına dönüldü — bölüm 4: "Aksiyon:
top bizdeyse şut, değilse tut (bağlamsal)". Ayrı bir kaleci hiçbir zaman
spesifikasyonun parçası değildi; ben M3'te rakip yokken geçici bir çözüm
olarak eklemiştim ve M5'te AIOpponent gelince kaldırmayı unutmuştum. Artık
her taraf kendi kalesini KENDİ oyuncusuyla/rakibiyle savunuyor.

**Yapıldı:**
- `src/systems/catchMatrix.ts` (yeni): M3'ün şut/tutuş matrisi artık
  paylaşılan saf bir fonksiyon (`resolveCatchAttempt`) — hem insanın kendi
  tutma denemesi hem rakip AI'nin otomatik savunması aynı mantığı kullanıyor,
  kopya kod yok.
- `Character.ts`: `catchCooldownRemaining` state'i + `canPowerCatch`
  getter'ı + `startCatchCooldown()` eklendi — tutma cooldown'u artık
  doğrudan oyuncunun kendi karakterinde yaşıyor (ayrı bir kaleci nesnesinde
  değil), tıpkı dash/power gibi.
- `MatchScene.ts`: `leftKeeper`/`keeper` entity'leri ve `ballHeld` kilidi
  tamamen kaldırıldı. İnsan artık Aksiyon'a topa dokunmadan basınca (ve top
  gerçekten kendi kalesine gelen bir şutsa — `lastTouchWasShot`, hedefte,
  menzilde) tutma deniyor; Özellik'le birlikte basılırsa ve bar yeterliyse
  power tutuş (bir segment harcayıp cooldown başlatıyor), yetersizse otomatik
  normal tutuşa düşüyor.
- `AIOpponent.ts`: artık kendi kalesini de otomatik savunuyor — gerçek bir
  şut kendi hedefine yaklaşınca (eski AIKeeper'ın "bazen erken atılıyor"
  sezgisiyle) `resolveCatchAttempt`'i çağırıyor. `ballHeld` parametresi
  tamamen kalktı (artık gerek yok, kimse topu zorla tutmuyor).
- `AIKeeper.ts` silindi — hiçbir yerden kullanılmıyor.

**Doğrulama (Playwright, geçici `window.__debugMatch`/`window.__game`
hook'larıyla — commit'ten önce kaldırıldı):**
- Ekran görüntüsüyle doğrulandı: sahada artık sadece 2 karakter var (insan +
  rakip), kalelerde kimse durmuyor.
- Matrisin 4 hücresi de insanın kendi tutma girdisiyle deterministik test
  edildi: power+power tutar (1 segment harcanıyor), power+normal tutamaz,
  normal+normal yavaş topta tutuluyor/hızlı topta kaçıyor, yetersiz power'da
  power tutuş denemesi sessizce normale düşüyor (segment harcanmıyor).
- Rakip AI'nin kendi kalesini savunması ayrıca doğrulandı (power şut→tutar).
- Dribbling'in hâlâ hiçbir zaman tutma tetiklemediği (regression) doğrulandı.
- Uçtan uca simülasyon: bir şut ya gol oluyor ya tutuluyor, hiçbir zaman
  ortada asılı kalmıyor (300 frame'lik bir koşuda "resolved" hep true çıktı).
- Karakterin yüzünün hareket/top yönüne göre doğru döndüğü de ayrıca
  doğrulandı (`facingX=1` → `currentPose='right'` → doğru texture) — kod
  zaten doğruydu, Arjantin'in sağ-profil sanatı sadece küçük boyutta önden
  görünüme çok benziyor (bir sanat nüansı, kod hatası değil).

## Oturum 18 — 4 gerçek oynanış bug'ı (yön, tuşlar, şut hızı, top fiziği)

Sami telefonda gerçek bir maç oynadıktan sonra dört net bug bildirdi (Opus
ile birlikte hazırlanmış net bir liste): (1) karakter sağa giderken sola,
sola giderken sağa bakıyor, (2) sağ alttaki dokunmatik tuşlar çalışmıyor,
(3) şut çok yavaş, (4) top fiziği "savruluyor" / kayma hissi kötü.

**1) Yön tersliği — düzeltme: Oturum 17'deki sonuç yanlıştı.** Oturum
17'de "kod doğru, bu sadece bir sanat nüansı" denmişti — bu YANLIŞ bir
teşhisti. Gerçek kök neden: M4'te Midjourney sayfasından kırpılan 4
karakterin `left.png`/`right.png` dosyaları kırpma pipeline'ında yer
değiştirmiş — `left.png` aslında sağa bakan karakteri, `right.png` sola
bakan karakteri gösteriyordu (yüz/burun piksellerinin kırpım içindeki
konumuyla doğrulandı). Kod (`resolvePose()`, `projectToScreen`, joystick/
klavye x işareti) baştan beri doğruydu; sorun saf asset-dosya adlandırma
hatasıydı. **Düzeltme:** 4 karakterin de `left.png`/`right.png` dosyaları
fiziksel olarak yer değiştirildi (mv ile swap, kod değişmedi).

**2) Sağ alt tuşlar çalışmıyor.** `TouchButton`'ın (Phaser `Arc` +
`setInteractive()`) hit-area üretimini Phaser kaynağından doğruladım —
`Arc.setSize(diameter, diameter)` çağırdığı için varsayılan hit-area zaten
doğru bir kare (çapa eşit), yani interaktif alan kendisi bozuk değildi;
gerçek CDP dokunuş simülasyonuyla da buton `held` state'i doğru tetiklendi.
Asıl kök neden muhtemelen `index.html`'de `canvas` için `touch-action`
CSS'inin hiç tanımlı olmamasıydı — gerçek telefonlarda bu, tarayıcının
kendi dokunma davranışının (kaydırma denemesi, ekran kenarı geri-kaydırma
jesti, uzun-basma büyüteç/bağlam menüsü) Phaser'ın pointer olaylarıyla
yarışmasına yol açar; özellikle ekran kenarına yakın sağ alt küme bu tür
jestlerin tam isabet bölgesinde. **Düzeltme:** `canvas`'a
`touch-action: none` + `-webkit-touch-callout: none` + `user-select: none`
eklendi, Phaser oyun config'ine `disableContextMenu: true` eklendi.

**3) Şut çok yavaş.** `SHOT_SPEED_NORMAL` (config/power.ts) 420'den 620'ye
çıkarıldı — yarı sahayı (`HALF_FIELD_WIDTH` ≈ 369px) artık ~0.6 saniyede
kat ediyor (öncesi ~0.88s). AI rakip de aynı sabiti kullandığı için
(`AIOpponent.ts`) değişiklik iki tarafa da otomatik yansıdı.

**4) Top fiziği "savruluyor".** `config/ball.ts`'de dört sabit ayarlandı:
- `BALL_GROUND_FRICTION`: 220 → 380 (top artık daha hızlı yavaşlayıp
  duruyor, eskisi gibi uzun süre kaymıyor).
- `BALL_BOUNCE_RESTITUTION`: 0.6 → 0.45 (yerden sekme daha az "zıplak").
- `BALL_WALL_RESTITUTION`: 0.7 → 0.55 (duvar/kale çerçevesi sekmesinde
  belirgin hız kaybı).
- Yeni `BALL_MAX_SPEED = 1400` — her frame'de `Ball.update()` içinde
  uygulanan sert bir hız tavanı; en hızlı meşru şuttan (Brezilya süper
  hareketi, ~1180 px/s yeni ayarla) güvenli payla yukarıda, sadece art arda
  duvar sekmesi/rüzgarın gerçek dışı bir hıza katlanmasını engelliyor.
- Top artık gerçek hızına bağlı bir "dönüş" görseli de kazandı (`Ball.ts`
  içinde `spinMark`, ince bir çizgi, açısı `speed/BALL_RADIUS * dt` ile
  birikiyor) — önceden top ne kadar hızlı gitse de "kayıyormuş" gibi
  görünüyordu, artık görsel olarak da yuvarlanıyor.

**Doğrulama (Playwright, geçici debug hook'larla — commit'ten önce
kaldırıldı):**
- Yön: `facingX=1` → `argentina_right` texture'ı, yeni (swap edilmiş)
  `right.png` görsel olarak da sağa bakan profili gösteriyor (yükseltilmiş
  crop karşılaştırmasıyla elle doğrulandı, 4 karakterin hepsinde aynı swap
  deseni doğrulandı: brazil de dahil).
- Tuşlar: gerçek CDP `Input.dispatchTouchEvent` ile Aksiyon düğmesinin
  gerçek ekran koordinatına (Scale.FIT dönüşümü hesaplanarak) dokunuldu,
  `held` state'i doğru `true` oldu.
- Şut hızı: `shoot(1,0,620,...)` sonrası `Math.hypot(vx,vz) === 620`
  doğrulandı.
- Top fiziği: aşırı bir hız (`vx=5000`) verilip bir `update()` çağrısından
  sonra `1400`'e tavanlandığı doğrulandı; sürtünmeyle 300px/s'lik bir yuvarlanma
  ~1 saniyede tamamen durdu (öncesinde çok daha uzun sürerdi).
- `npm run build` temiz, konsol hatası yok (tam maç ekranı ekran
  görüntüsüyle de kontrol edildi).
- `npm run build` temiz.

## Oturum 19 — Top hissi ve gerçek dribble control sistemi

Sami iki bug bildirdi ve top hissini tamamen yeniden yazmamı istedi. **İlk
yaklaşımım (bu oturumun başında) yanlıştı** — top tutma kuralını `Ball.x =
player.x + offset` şeklinde bir konum kilidiyle uygulamıştım (Oturum 18'in
devamı gibi). Sami'nin görevi bunu açıkça reddetti: "top asla oyuncunun
child objesi olmamalı, kendi bağımsız hız vektörü olmalı." O yaklaşımı
tamamen attım ve kuvvet/lerp tabanlı bir sisteme geçtim.

**1) Özel/süper vs power şut çakışması (ciddi bug, doğrulandı).**
`MatchScene.ts`'te süper hareket Özel'e **basıldığı anda** tetikleniyordu;
ama power şut "Özel'i basılı tut + Aksiyon'a bas" ile çalışıyor — yani
Özel'e basar basmaz süper fırlıyor, Aksiyon'a hiç sıra gelmiyordu.
**Düzeltme:** `InputController.consumeSpecialAlonePressed()` yerine yeni
`consumeSpecialReleased()` — süper artık Özel **bırakıldığında** tetikleniyor,
sadece o basılı tutuş boyunca Aksiyon'a hiç basılmamışsa. Basılı tutma
sırasında Aksiyon'a basılırsa (`actionUsedDuringSpecialHold` flag'i) süper
o hold için tamamen iptal oluyor, power şut/tutuş normal çalışıyor.

**2) Top hissi — kuvvet-tabanlı dribble control (baştan yazıldı).**

Mimari (CLAUDE.md'nin "top kontrolü kendi katmanı olsun" isteği):
- `Character.ts`: artık gerçek ivme/yavaşlama var (`PLAYER_ACCELERATION`/
  `PLAYER_DECELERATION`/`PLAYER_TURN_SPEED`, movement.ts) — hareket anlık
  bir konum atlaması değil, `moveToward()` ile yumuşak bir hız eğrisi.
  `velX`/`velZ` public — dribble sisteminin "ne kadar hızlı gidiyor"
  sorusuna cevap vermesi için.
- `src/systems/dribbleControl.ts` (yeni, catchMatrix.ts'in aynı deseni):
  `computeDribbleTarget()` — oyuncunun önünde, bakış yönünde, hıza göre
  ölçeklenen (yürüme→yakın, koşma→orta, dash sonrası→uzak) tek bir saf
  fonksiyon; hem `MatchScene` hem `AIOpponent` bunu çağırıyor.
- `Ball.ts`: `possessor`/`possess()` (konum kilidi) tamamen kaldırıldı.
  Yerine `controller` + `updateControl(side, target, facing, isDashing,
  airborne, dt, chaos)` — HER FRAME çağrılıyor, top BALL_CONTROL_RADIUS
  içindeyse hızı `lerp(hız, hedefHız, response*dt)` ile hedefe doğru
  büker; konum hep normal fizikten (`update()`'teki gravity/friction/
  bounce) geliyor, hiçbir yerde `ball.x = ...` ataması yok. Dash sırasında
  kontrol tamamen kapanıyor (kasıtlı — dash'in top üzerindeki kontrolü
  kaybettirmesi istendi), havadayken `AIR_CONTROL_MULTIPLIER` ile ciddi
  ölçüde zayıflıyor.
- Şut artık mevcut top hızının bir kısmını taşıyor:
  `vx = vx*KICK_CARRY_MOMENTUM + şutYönü*şutGücü` — hareket halindeki topa
  vurmak duran topa vurmaktan farklı hissettiriyor (doğrulandı: durgun topta
  620, aynı yönde 300px/s giden topta 710 px/s çıktı).
- `applyTouch()` ve `BALL_TOUCH_SPEED` tamamen kaldırıldı — artık "anlık
  itiş" diye bir şey yok, her temas sürekli kontrol kuvvetine dönüşüyor.
  `CONTACT_TOLERANCE_X/Z` de (arena.ts) kullanılmaz hale geldiği için
  silindi — "topa değme" artık tek bir kavram: `BALL_CONTROL_RADIUS`.
- 6 saniye kuralı (`BALL_HOLD_SECONDS`) aynı yerde kaldı ama artık
  `Ball.update()` içinde otomatik işliyor: süre dolunca top zorla serbest
  kalıyor VE bakılan yöne gerçek bir itiş alıyor (`controllerFacingX/Z` —
  oyuncu hareketsiz durup topu tutuyorsa kontrol noktası zaten topun
  üzerinde olur, sadece kontrolü bırakmak "ileri gitme" garantilemez, bu
  yüzden ayrı bir itiş şart). Son 1.5 saniyede yanıp sönme aynen duruyor.
- `BALL_RECAPTURE_LOCKOUT` (eski adıyla release-grace, Oturum 18'den):
  bir şuttan veya hold-timeout'tan hemen sonra AYNI taraf topu anında geri
  alamıyor — yoksa her şut/timeout bir sonraki frame'de kendi ayağına
  geri yapışırdı (gerçek bir test hatasıyla yakalandı, aşağıya bakın).
- Gol sonrası akış (Oturum 18) korunuyor: top gol yiyenin kendi yarısının
  ortasına, `GOAL_RESET_FREEZE_SECONDS=2` boyunca kontroller kilitli.

**Test sırasında yakalanan iki gerçek regresyon (kendi kendini düzeltme):**
1. İlk `updateControl()` implementasyonunda hold-timeout'tan hemen sonra
   top aynı frame'de (veya bir sonraki frame'de) tekrar aynı oyuncunun
   kontrolüne düşüyordu — sonsuz "serbest bırak → hemen yeniden yakala"
   döngüsü. `BALL_RECAPTURE_LOCKOUT` eklenerek (ve doğru sırada — `Ball.
   update()`'in kendi içinde, `updateControl()`'den SONRA çalıştığı için
   bir sonraki frame'e kadar) çözüldü, 400+ frame'lik bir simülasyonla
   doğrulandı.
2. Oyuncu hareketsiz dururken hold-timeout tetiklenince top neredeyse
   hiç hareket etmiyordu — çünkü kontrol kuvveti zaten topu tam kontrol
   noktasına oturtmuştu, bırakınca taşınacak bir hız kalmıyordu. "İleri
   gider" kuralı, top-kontrol noktası vektörü yerine oyuncunun son bilinen
   bakış yönü kullanılarak (`controllerFacingX/Z`) düzeltildi.

**Bilinçli kapsam kesintileri (dürüstçe not edilmiş, section 6/11'in tamamı
uygulanmadı):**
- "Sert yön değiştirme" başlı başına bir kontrol kaybı sebebi olarak ayrı
  uygulanmadı — mevcut lerp/moveToward sistemi zaten sert dönüşleri doğal
  olarak yumuşatıyor, ekstra bir "sert dönüş algıla" mantığı eklemedim.
- Gövde çarpışması (rigid-body collision) hiç yok — bu proje hiçbir zaman
  karakter-top arası fiziksel engelleme yapmadı, şimdi de eklemedim; sadece
  "kontrol" (dribble) ve "şut/tutuş" (bağlamsal Aksiyon) ayrı kavramlar.
- Rakip teması top kontrolünü çalabiliyor (her iki tarafın `updateControl()`
  çağrısı bağımsız çalışıyor, kim menzildeyse o kontrolü alıyor) ama iki
  taraf da tam aynı anda üst üsteyse hangisinin kazanacağı çağrı sırasına
  bağlı — nadir bir kenar durum, ekstra tie-break mantığı eklemedim.

**Doğrulama (Playwright, geçici debug hook'larla — commit'ten önce
kaldırıldı):**
- Force-based pickup: top menzile girince hızı ANINDA değil, kademeli
  artan bir kuvvetle çekiliyor (vx: -1,-2,-2,-3,-4,-5... ilk 6 frame).
- Momentum/yön değişimi: top sağa 196px/s giderken oyuncu aniden sola
  dönünce bir frame sonra top HÂLÂ pozitif (193px/s) — anında ters
  dönmüyor, yeni yöne kademeli oturuyor.
- Fren hissi: koşan oyuncu aniden durunca top-oyuncu farkı önce negatifken
  (top geride) sıfırdan geçip pozitife dönüyor (top öne kayıyor), sonra
  sürtünmeyle geri küçülüyor — tam da istenen "top kısa mesafe ileri
  kayar, sonra ayağa geri gelir" hissi.
- Kick carry momentum: durgun topta şut 620 px/s, aynı yönde 300px/s giden
  topta 710 px/s (300*0.3+620 formülüyle birebir eşleşiyor).
- Hava kontrolü: yerdeyken 5 frame'de topu ~113px/s'e çeken kontrol,
  havadayken aynı 5 frame'de ölçülemeyecek kadar zayıf.
- Dash kontrolü tamamen kapatıyor: dash sırasında `controller` anında
  `null` oluyor.
- 6 saniyelik hold: kontrol alınıyor, ~6.4 saniye sonra zorla bırakılıyor
  VE bırakılmış kalıyor (bir önceki hatalı sürümde anında geri yapışıyordu).
- Şut kaçışı: bir şuttan sonra top 30 frame boyunca hiçbir zaman şutu atan
  tarafa geri düşmüyor.
- Süper/power çakışması: power şut kombosu çalışıyor (bar 3→2), sonra Özel
  bırakılınca süper YANMIYOR (bar 2'de kalıyor) — eski bug'ın tam tersi.
- Tam maç ekranı görüntüsü: iki karakter, top ayakta, konsol hatası yok.
- `npm run build` temiz.

**Hissi ayarlamak isteyenler için (Sami'nin istediği tablo, hepsi
`config/ball.ts` / `config/movement.ts`):**
- **Top daha ağır/hafif hissetsin:** `BALL_CONTROL_STRENGTH` düşür = top
  daha "ağır", geç tepki verir; yükselt = daha "hafif", çabuk yapışır.
  `BALL_GROUND_FRICTION` de etkiler — yükseltirsen top daha çabuk durur
  (daha "ağır" bir his), düşürürsen daha çok kayar ("hafif"/kaygan).
- **Dribbling daha sıkı/gevşek olsun:** `BALL_CONTROL_RESPONSE` yükselt =
  daha sıkı (top hemen hedefe kilitlenir, momentum azalır); düşür = daha
  gevşek (top kendi hızını daha uzun süre korur, hedefe yavaş oturur).
  `BALL_CONTROL_RADIUS`'u küçültmek de sıkılaştırır (topu kaybetmek
  kolaylaşır), büyütmek gevşetir.
- **Oyuncu daha hızlı/yavaş dönsün:** `PLAYER_TURN_SPEED` yükselt = anlık
  yön değişiminde (pivot) daha çevik; `PLAYER_ACCELERATION`/
  `PLAYER_DECELERATION` durgunluktan hızlanma/durma hissini ayrı ayrı
  kontrol eder (ikisi de yükseldikçe karakter daha "keskin"/arcade hisseder,
  düştükçe daha "kayan"/ağır bir ivmelenme olur).

## Oturum 20 — Mıknatıs hissi, top ağırlığı, AI reaksiyonu, saha görselleri

Sami Oturum 19'un top hissini oynadı, "daha iyi ama" diyerek beş somut geri bildirim verdi. Hepsi mekanikti, kapsam/dizayn değişikliği değil — ince ayar ve bir mimari düzeltme.

**1) "Top karaktere yaklaştığında mıknatıs gibi ilerliyor."** Kök neden: `Ball.updateControl()` topun hızını `lerp(vel, desiredVel, response*dt)` ile büküyordu — bu, hedef hızla mevcut hız arasındaki fark ne kadar büyük olursa olsun sınırsız bir "anlık düzeltme" uyguluyordu (fark büyükse o kadar sert bir sıçrama). Hızlı giden bir top, kontrol yarıçapına girer girmez anında yönü değişiyordu. **Düzeltme:** gerçek kütle/kuvvet modeline geçildi — `config/ball.ts`'e `BALL_MASS` ve `BALL_CONTROL_FORCE` eklendi, her frame'de hıza uygulanabilecek DEĞİŞİM `(force/mass)*dt` ile sabit bir tavana bağlandı (`Math.min(steerLen, maxDeltaV)`). Artık top ne kadar hızlı/ters yönde gelirse gelsin, bir karede tam kontrole giremiyor — birkaç kare boyunca kademeli kıvrılıyor, hatta yeterince hızlıysa yarıçaptan çıkıp hiç yakalanmıyor. Ayrıca `BALL_CONTROL_RADIUS` 45'ten 30'a küçültüldü (mıknatıs hissinin bir kısmı sırf menzilin görünür bir mesafeden başlamasıydı).

**2) "Topun kendi mass ve fiziği olmalı."** Yukarıdaki `BALL_MASS`/`BALL_CONTROL_FORCE` tam olarak bunu karşılıyor — kütle artırılırsa top kontrole karşı daha ağır/dirençli, düşürülürse daha hafif/itaatkâr davranıyor. Yerçekimi/sekme/sürtünmeye dokunmadı (onlar zaten kendi ayrı sabitleriyle çalışıyordu) — sadece dribble kontrolünün "gerçekçi" hissetmesini sağlıyor.

**3) "AI çok güdümlü, topun geleceği yönü bilip hemen tutuyor."** İki ayrı düzeltme, `AIOpponent.ts`:
- **Takip gecikmesi:** AI artık topun gerçek konumunu değil, `OPPONENT_TRACKING_LERP_SPEED` ile geriden gelen "algılanan" bir konumu (`trackedBallX/Z`) kovalıyor — pozisyon alma/hareket kararları bu gecikmeli veriyle, ama gerçek temas/şut/tutma mekaniği hâlâ topun gerçek konumuyla çalışıyor (mekanik doğruluktan ödün yok, sadece "farkındalık" gecikmeli).
- **Tutma reaksiyon süresi:** eskiden bir şut "tutulabilir" hale geldiği an aynı karede sonuçlanıyordu (şut daha havadayken tutuluyormuş gibi hissettiriyordu). Şimdi `OPPONENT_CATCH_REACTION_SECONDS` (0.15s) kadar bir gecikme var — bu sürede top kaleye girerse (hızlı/power şutlarda mümkün) kaleci hiç tepki veremeden gol oluyor. Yavaş şutlarda hâlâ genelde tutuluyor.

**4) "Top çok hızlı yavaşlıyor."** Oturum 18'de `BALL_GROUND_FRICTION` 220'den 380'e çıkarılmıştı ("top savruluyor" şikayetine karşı) — bu sefer tersine döndü, sarkaç fazla gitmişti. **Düzeltme:** `BALL_GROUND_FRICTION` 380'den 150'ye düşürüldü. "Top kayıp durmuyor" endişesi artık global sürtünmeyle değil, saha-bazlı `frictionMultiplier` ile çözülüyor (bkz. madde 5) — bu daha doğru bir yer: her sahanın kendine has zemin hissi olmalı, tüm oyunun aynı derecede "yapışkan" olması değil.

**5) "Sahanın görsel kısmı değişmiyor... Kenya'da çamur olur, top yere değince yavaşlar."** İki kısım:
- **Görsel:** `pitchRenderer.ts` her zaman sabit yeşil `GRASS_LIGHT`/`GRASS_DARK` renkleriyle çiziyordu — `stadium.tintColor` sadece maç ekranında %6 alfa'lık neredeyse görünmez bir overlay'di. CLAUDE.md bölüm 7 zaten "her saha görsel + mekanik olarak farklı" diyordu, görsel taraf hiç uygulanmamıştı. `StadiumDef`'e `groundLight`/`groundDark` eklendi, `drawPitch(scene, stadium)` artık bu renkleri kullanıyor (kum/toprak/toprak/sokak — dördü de görsel olarak ayrı ayrı doğrulandı, ekran görüntüleriyle). Backdrop da sahanın zemin renginden türetilen koyu bir tonla eşleşiyor.
- **Kenya'nın çamuru:** `frictionMultiplier` 1.05'ten 2.6'ya çıkarıldı (global sürtünme düşürüldüğü için bu artık gerçek bir kontrast yaratıyor — Kenya'da top havada aynı hızda gidiyor ama yere değince global varsayılana göre çok daha hızlı yavaşlıyor, "yere değince sert yavaşlar" tam olarak istenen). `bounceMultiplier` de 1.0'dan 0.7'ye düşürüldü (çamur sekmeyi de yutuyor). Ayrıca `pitchRenderer.ts`'e `muddy: boolean` bayraklı, sadece Kenya'da çizilen 5 sabit (rastgele değil — maç her açıldığında aynı yerde) koyu çamur lekesi eklendi — hem fiziği hem görseli aynı hikâyeyi anlatıyor artık.

**Doğrulama (Playwright, geçici debug hook'larla — commit'ten önce kaldırıldı):**
- Mıknatıs testi: topa -400px/s ters yönde hız verilip 20px mesafeden kontrol menziline sokuldu — hız bir karede sıfırlanmak yerine kademeli değişti (~-400 → -383 → ...), ve top hızlı olduğu için bir kareden sonra menzilden çıkıp serbest kaldı (tam kontrole hiç girmedi) — eskiden anında yakalanırdı.
- Sürtünme: 620px/s'lik bir top 1 saniye sonra varsayılan sahada ~489px/s'e (eskiden çok daha hızlı düşerdi), Kenya'da ise aynı 1 saniyede ~326px/s'e düştü — belirgin, ölçülebilir bir kontrast.
- AI reaksiyonu: bir şut tam "tutulabilir" hale geldiği karede artık sonuçlanmıyor (`controller`/hız değişmedi) — eskiden aynı karede tutulur/tutulmazdı.
- 4 sahanın da ekran görüntüsü alındı: kum (Brezilya, açık bej), toprak (Arjantin, kahve), toprak+çamur lekeleri (Kenya, turuncu-kahve), sokak (Kongo, gri) — hepsi birbirinden görsel olarak ayırt edilebiliyor, konsol hatası yok.
- `npm run build` temiz.

## Oturum 21 — Yeni tasarım haritası + pixel art (claude.ai sohbetinden)
- Sami ile 15–16.11 tasarım kararları alındı: 3/4 kamera kalıyor, iki yükseklikli şut (alçak/lob), parry, enerji ekonomisi, güç çatışması fark tablosu. CLAUDE.md bölüm 5 güncellendi, ROADMAP'e M6 eklendi.
- Grafikler artık Claude tarafından üretiliyor: `tools/pixelart/gen_sprites.py`. Brezilya + Kongo pixel art olarak yeniden çizildi (önizleme: `docs/sprite_sheet.png`). Midjourney görselleri `assets/characters/_legacy_midjourney/`.
- Kadro 2 karaktere indirildi.
- Kalan: M6 listesi. Bilinen: yeni koşu/kick/catch/stunned pozları henüz koda bağlı değil, oyun şimdilik 6 temel pozu kullanıyor.

## Oturum 22 — M6.0: pozlar ve top aurası koda bağlandı (zamanlanmış ajan)
- **Yapıldı:** `Character.ts` artık 19 pozun hepsini kullanıyor: 4 karelik koşu döngüsü (sol/sağ), sağa/sola `slide`, `kick_left/right` (şut sonrası 0.2 sn), `catch` (tutma denemesinde 0.35 sn), `stunned` (`playStunned(sn)` — M6.3 yavaşlamayı ekleyecek). Ön/arka yönde koşarken koşu karesi olmadığı için 2px adım zıplaması var. Top artık `ball_power<N>.png` sprite'ı: seviye 0 düz, 1 sarı, 2 turuncu alev, 3 beyaz-mavi; alev kuyruğu topun yönüne göre aynalanıyor, yuvarlanma 90° adımlarla (pixel-perfect). Aura top tutulunca/kontrole girince/yavaşlayınca söner. Tüm değerler `src/config/animation.ts`'te.
- Şimdilik power şut = seviye 1, süper = seviye 3. `Ball.shoot()`'a `powerLevel` parametresi eklendi; M6.2 harcanan enerjiye göre 1–3 verecek.
- **Doğrulama:** Playwright (geçici `window.__game` hook'u, commit'ten önce kaldırıldı): koşu sağ/sol → `run_right_*`/`run_left_*`, yukarı → `back`, kick/catch/stunned pozları zamanlayıcıyla geri dönüyor; top dokusu güç seviyesine göre `ball_power0..3`, yavaşlayınca `ball_power0`. Konsol hatası yok, `npm run build` temiz.
- **Kalan (M6.0):** saha/tribün/HUD pixel art, sprite kalitesi ikinci tur. Sonra M6.1.
- **Bilinen:** seviye 3 aurası açık kum zeminde biraz soluk duruyor (sprite kalitesi turunda kontrast artırılabilir).

## Oturum 23 — M6.0: saha, tribün ve HUD pixel art (zamanlanmış ajan)
- **Yapıldı:** `pitchRenderer.ts` baştan yazıldı: tüm statik arena (tribün katları, reklam panoları, zemin şeritleri + kum/toprak dokusu, çizgiler, orta yuvarlak, kale alanları, kaleler) piksel piksel yarım çözünürlükte (480x270) bir canvas'a çiziliyor ve 2x nearest ölçekleniyor — karakterlerle aynı piksel ızgarası. Kaleler: kafes desenli arka + çatı ağı, gri derinlik çerçevesi, gölgeli beyaz direkler. Çamur lekeleri dither'lı. Saha başına doku önbelleğe alınıyor (deterministik).
- Seyirci: `CrowdBand.ts` artık 6 renk varyantlı pixel seyirci sprite'ları (`assets/fx/fan_<v>_idle|cheer.png`), iki sıra; boştayken ara ara 1 piksel zıplıyorlar, golde kollar yukarı + dalga.
- HUD: pixel skorbord (takım kodları + skor), süre (son 15 sn kırmızı), 3 enerji hücresi sprite'ı, "BİTİR (TEST)" butonu, alt bilgi satırları — hepsi `gen_sprites.py`'nin ürettiği 3x5 bitmap font (Türkçe harfler dahil) ile. Yeni config: `src/config/hud.ts`, `src/config/pitchArt.ts`. Düz renk "mood tint" katmanı kaldırıldı (tribün rengi artık sahanın tint'inden geliyor); Kongo ritim nabzı duruyor.
- **Doğrulama:** Playwright (geçici `window.__game` hook'u, commit'ten önce kaldırıldı): 4 sahanın ekran görüntüsü alındı, konsol hatası yok; skor `10-3`, süre `0:10` kırmızı, enerji 2 → hücreler `full, full, empty`, gol kutlaması sonrası seyirciler idle'a dönüyor. `npm run build` temiz.
- **Kalan (M6.0):** sprite kalitesi ikinci tur. Sonra M6.1 enerji ekonomisi.
- **Bilinen:** Maç başında (insan oyuncu hiçbir şey yapmazsa) top ~1.5 sn içinde sol kaleye yuvarlanıp gol olabiliyor — bu oturumdan önce de vardı (eski kodla da aynı top yörüngesi ölçüldü), M6.2/M6.3'te AI/kickoff ile birlikte bakılmalı. Seyirci şeridi 27 px'lik tribün bandına sığmak için küçük.

## Oturum 24 — Top kontrolü ve şut hızı (Sami'nin geri bildirimi)
- **Geri bildirim:** "Futbolcu topa gidince top ayağa gelmeli, tekrar çıkmamalı, oyuncunun yönüyle birlikte hareket etmeli." + "Şut çok hızlı, takip etmek zor."
- **Kök neden:** Eski kontrol kuvvet tabanlıydı (hedef hız 260 px/s, ivme sınırı 900 px/s²). 220–275 px/s koşan ve dönen bir oyuncuya yetişemiyordu; top kontrol yarıçapından çıkıp düşüyordu.
- **Referans:** YSoccer (açık kaynak Sensible World of Soccer klonu, `ysoccer/ysoccer`): top yakın, alçak ve oyuncuya göre çok hızlı değilse sahiplenilir; sahiplenilince oyuncunun hızını alır ve bakış yönünde ayağın önüne yeniden konumlanır. Temel vuruş hızı koşu hızıyla aynı mertebede.
- **Yapıldı:** `Ball.updateControl()` iki aşamalı: (1) **yakalama**: yarıçap 30, yükseklik ≤ `BALL_TRAP_MAX_HEIGHT`, göreli hız ≤ `BALL_TRAP_MAX_RELATIVE_SPEED` (340); hızlı şut hâlâ mıknatısa yapışmıyor. (2) **taşıma**: top oyuncunun gerçek hareket hızını alıyor (`Character.moveVelX/Z`, duvara dayanınca 0) ve `DRIBBLE_STICK_LERP_SPEED` ile yöne göre dönen dribbling noktasına sabitleniyor. Sadece şut, dash, zıplama veya 6 sn tutma süresi bitince bırakılıyor. Eski `BALL_MASS`/`BALL_CONTROL_FORCE`/`AIR_CONTROL_MULTIPLIER` kaldırıldı.
- **Şut hızı:** `SHOT_SPEED_NORMAL` 620 → 480, power çarpanı 1.6 → 1.5, `BALL_MAX_SPEED` 1400 → 1100.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Sağa, yukarı, sola ve aşağı koşarken top her an kontrolde kaldı; ayağa uzaklığı ~19–22 px ve her dönüşte yeni yöne geçti; durunca 14 px önde kaldı. Şut sonrası top hızı 521 px/s ve kontrol bırakıldı. Duran oyuncunun önünden 500 px/s geçen top yakalanmadı.
- **Bilinen:** Maç başı "kendiliğinden gol" aslında AI'ın başlama vuruşunda topu alıp hemen şut çekmesi; oyuncu kıpırdamazsa ~1.5 sn'de gol oluyor. AI agresifliği M6.2'de (AI yeni şut tipleri) ayarlanacak.

## Oturum 25 — M6.0 sprite kalitesi ikinci tur + M6.1 dash kuralı (zamanlanmış ajan)
- **Yapıldı (grafik):** `gen_sprites.py`'ye sol-üstten ışık geçişi (`Canvas.light()`: sağ/alt kenarda gölge, sol-üst kenarda parlama; `RIM_SHADOW`/`RIM_LIGHT`) eklendi, tüm pozlara uygulanıyor. Yan pozlarda uzak kol/bacak koyu (`FAR_LIMB`) çiziliyor; yakın bacak/kol `rect_cut` ile alttakine kontur kesiyor, böylece koşu karelerinde iki bacak ve kol gövdeden ayrı okunuyor. Adım açıklığı büyütüldü, arka ayak havaya kalkıyor, sırtta gömlek gölgesi + yaka. Zıplama pozunda kollar V şeklinde başın üstüne çıkıyor (eskiden yüzün yanında kayboluyordu).
- **Yapıldı (M6.1):** Dash artık her zaman **1 enerji** (yerde/havada fark yok, `DASH_ENERGY_COST`) ve iki dash arası **1 sn** (`DASH_COOLDOWN`). Eski `DASH_SEGMENT_COST_GROUND/AIR` ve `DASH_RETRIGGER_COOLDOWN` kaldırıldı.
- **Doğrulama (Playwright, geçici `window.__game` hook'u commit'ten önce kaldırıldı):** enerji 3 → dash → 2; 0.3 sn sonra ikinci dash reddedildi; 1 sn sonra dash → ~1.2; havada dash 1 harcadı; enerji 0.9 iken dash çıkmadı. Konsol hatası yok, `npm run build` temiz, sprite sheet ve oyun içi ekran görüntüsü kontrol edildi.
- **Kalan (M6.1):** pasif dolum +1 / 5 sn (şu an sürekli, 8 sn/segment), enerji içeceği pickup, gol yiyene +1.
- **Bilinen:** Maç başında ~2.5 sn kickoff kilidi var, test yazarken dikkat. Beyaz ayakkabılarda uzak ayak gri görünüyor (bilinçli, derinlik için). Maç başı AI'ın hızlı golü (Oturum 24) hâlâ duruyor.

## Oturum 25 — Kayan joystick + büyük tuşlar (Sami'nin geri bildirimi)
- **Geri bildirim:** "Sol joystick sabit küçük bir dairede; mobil oyunlardaki gibi ekranın sol tarafının neredeyse her yeri joystick olsun, hassas olsun. Şut vb. tuşları büyüt."
- **Yapıldı:** `VirtualJoystick` artık kayan (floating) joystick. Ekranın sol yarısında, HUD şeridi hariç (`JOYSTICK_ZONE_*`), nereye dokunulursa çubuğun tabanı orada açılıyor. Parmak yarıçapı (52 px) aşınca taban arkasından geliyor (`JOYSTICK_FOLLOW`), yani yön değiştirmek tek kısa kaydırma. %12 ölü bölge var, kalanı 0–1'e yeniden ölçekleniyor. Boştayken sol altta soluk bir ipucu olarak duruyor. Tuşlar: yarıçap 28/32 → 40 (Aksiyon 48), aralık 46 → 66, dokunma alanı çizilen dairenin 1.2 katı. Koyu dolgu + pixel font etiket, kum sahada da okunuyor. Tüm değerler `src/config/controls.ts`'te.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Sol yarıda (300,250)'e dokununca taban orada açıldı. 4 px hareket ölü bölgede kaldı (0), 30 px sağa (0.52, 0), 50 px yukarı (0, 0.96). Uzağa sürükleyince taban takip etti, ters yöne 52 px kaydırınca çıktı 0'a döndü. Sağ yarıya dokunmak joystick açmadı. Aksiyon tuşunun çizgisinin 5 px dışına dokunmak hâlâ basış sayıldı. Konsol hatası yok, `npm run build` temiz.
- **Bilinen:** Gerçek telefonda denenmedi (headless Chromium'da fare ile test edildi).

## Oturum 26 — Hareket hızı ve fizik ayarı (Sami'nin geri bildirimi)
- **Geri bildirim:** "Karakterin yürümesi/hareketleri fazla hızlı. Fizik (ağırlık, vuruş, tutuş, yer çekimi) iyi olsun. Zıplayınca düşme ~1 sn yeterli mi? Ok gibi."
- **Hareket:** `MOVE_SPEED` 220 → 150 (Brezilya 275 → 188, Kongo 176 → 120 px/s). İvme 1800 → 900, fren 2400 → 1500, dönüş 3000 → 1900; oyuncu ~0.17 sn'de hızlanıyor, biraz ağırlık hissi var. Koşu animasyonu artık gerçek hıza göre (yavaş karakter hızlı pedal çevirmiyor), `RUN_FRAME_SECONDS` 0.09 → 0.12. Dash 480 px/s × 0.18 → 380 × 0.22 (aynı ~84 px mesafe).
- **Zıplama:** Eskiden sabit yerçekimi 600 + 380 px/s ile 1.27 sn, tepe 120 px (1.7 boy), düz yukarı-aşağı "ok gibi". Şimdi: kalkış 330, yükselirken 780 px/s², tepede (|vy|<70) yerçekimi ×0.45 (kısa süzülme), düşerken ×1.35. Sonuç: ~1.0 sn havada, tepe ~70 px (bir boy, lob karşılamaya yeter).
- **Top:** Havada hafif sürüklenme `BALL_AIR_DRAG` 0.2/sn (yüksek top dümdüz gitmiyor). Yer sürtünmesi (150), sekme (0.45), yerçekimi (700) aynı kaldı: 480'lik şut 500 px yuvarlanınca hâlâ ~280 px/s ile varıyor.
- **Tutma:** Şutlar yavaşladığı için `CATCH_SPEED_REFERENCE` 900 → 720 (eski tutma dengesi korunuyor; M6.3 fark tablosuyla zaten değişecek).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Brezilya 1 sn'de 175 px koştu. Zıplama 0.96 sn havada, tepe 69 px. Dribbling dört yönde kontrolde kaldı (ayağa ~22 px). Şut 480 px/s. Hızlı top (500) yakalanmadı. Konsol hatası yok, build temiz.

## Oturum 27 — M6.1 pasif dolum + enerji içeceği (zamanlanmış ajan)
- **Pasif dolum:** Enerji artık sürekli akmıyor; bar dolu değilken her **5 sn'de +1 tam segment** (`POWER_PASSIVE_GAIN_SECONDS/AMOUNT`, `config/power.ts`). Bar doluyken sayaç 0'da bekliyor. Eski `POWER_FILL_SECONDS_PER_SEGMENT` kaldırıldı. `Character.gainPower()` eklendi (içecek ve ileride gol yiyene +1 bunu kullanacak).
- **Enerji içeceği:** `systems/EnergyDrinks.ts` + `config/pickups.ts`. 12 sn'de bir iki sahada ayna konumda (orta çizgiye eşit uzaklık, aynı z) bir çift kutu çıkıyor; %15 ihtimalle ikisi de altın (+2), yoksa mavi (+1). 8 sn içinde alınmazsa son 2 sn yanıp sönüp kayboluyor. Alma toleransı x 26 / z 34, 40 px'ten yüksek zıplayan üstünden geçer. AI de üstünden geçerse alıyor (bilerek kovalamıyor). Gol sonrası kilitte sayaç duruyor. Altın kutu sprite'ı `gen_sprites.py`'de (`energy_drink(gold=True)` → `assets/fx/energy_drink_gold.png`). Alma sesi `soundFX.pickup()`.
- **Doğrulama (Playwright, geçici `__game/__match` hook'ları kaldırıldı):** Enerji 0'dan 4.5 sn'de hâlâ 0, 5.3 sn'de 1. Doluyken 6 sn bekleme 3'te kaldı, sayaç 0. Doğal spawn ~12 sn'de geldi (gol kilidinde sayaç durdu). Çift x toplamı 960 (ayna), z eşit. Oyuncu kutunun üstüne gelince 1 → 2, kutu silindi. Altın çift +2/+2. y=60'ta alınmadı, y=0'da +2 alındı. Yaş 7.9 → 8.0'ı geçince ikisi de silindi. Konsol hatası yok, `npm run build` temiz, oyun içi ekran görüntüsünde kutular ve gölgeleri doğru.
- **Kalan (M6.1):** gol yiyene +1. Sonra M6.2 (şut: dokun/basılı tut, lob, AI).
- **Bilinen:** AI içecekleri hedeflemiyor (M6.2'deki AI işinde düşünülebilir). Maç başı AI'ın hızlı golü hâlâ duruyor.

## Oturum 28 — Yön simetrisi: yukarı/aşağı ile sağ/sol aynı hissetmiyordu (Sami'nin geri bildirimi)
- **Geri bildirim:** "Yukarı aşağı sağ sol aynı kolaylıkla gitmiyor."
- **Ölçüm (önce, Playwright, ekran px/s):** sağ 134, sol 132, **yukarı 364, aşağı 379**; 45° çapraz giriş ekranda **66°** gidiyordu. Top da aynı: dikey şut ekranda ~2.3 kat hızlıydı.
- **Kök neden:** Derinlik ekseni ekranda kısaltılmış: 1 dünya z birimi = `DEPTH_SCALE` ≈ 2.31 ekran px, x ise ≈ 1 px. Karakter iki eksende aynı *dünya* hızıyla gidince ekranda dikey 2.8 kat hızlı görünüyordu. Ayrıca ivme eksen başına ayrıydı (çapraz ve dönüşler eğri çiziyordu).
- **Kaynaklar:** Okhlos devlog "Cameras, Pythagoras and faking it" (eğik kamerada dikey hızı *ekranda nasıl göründüğüne göre* ayarla; onlar ters problemde dikeyi %40 hızlandırdı). Josh Sutphin, "Doing thumbstick dead zones right" (ölçekli radyal ölü bölge, bizde zaten vardı).
- **Yapıldı:** `config/movement.ts`: `DEPTH_SCREEN_SPEED_RATIO` (1.0) ve `DEPTH_SPEED_FACTOR = oran / DEPTH_SCALE`. Karakter `velX/velZ` artık ekran-eşdeğeri px/s; z konumuna çevrilirken faktörle çarpılıyor (yürüme + dash). İvme radyal (vektörel): durma = fren, >90° dönüş = dönüş hızı, yoksa ivme. `screenDirToWorld()` ile oyuncunun şutu ve süper hareketi joystick'in ekrandaki açısıyla ve aynı ekran hızıyla gidiyor. Dribbling noktasının z ofseti de aynı faktörle. AI dünyadaki hedefe nişan aldığı için şutları değişmedi; hareketi aynı kuralla yavaşladı (adil).
- **Ölçüm (sonra):** sağ 167, sol 169, yukarı 190, aşağı 197 px/s (dikey ~%14 fazla, perspektifte yatayın daralması yüzünden; Okhlos'un "dikey yavaş okunur" bulgusuyla uyumlu, oran 0.9 yapılırsa tam eşitlenir). Çapraz 47°. Tam hıza çıkış x/z/çapraz hepsi 13 kare, geri dönüş x/z 19 kare. Dash x 146 / z 156 ekran px. Şut sağ 542, yukarı 521, çapraz 541 px/s (42°). Dribbling dört yönde kontrolde kaldı. Konsol hatası yok, build temiz.
- **Etki/bilinen:** Saha derinliğini (210 z) koşarak geçmek ~1.4 sn → ~2.6 sn; kaleyi dikeyde kapatmak daha uzun sürüyor ama dikey şutlar da aynı oranda yavaşladı. Fazla yavaş gelirse `DEPTH_SCREEN_SPEED_RATIO` tek ayar noktası.

## Oturum 29 — M6.1 gol yiyene +1, M6.2 dokun/basılı tut şut (zamanlanmış ajan)
- **Gol yiyene +1:** Gol olunca yiyen tarafa `GOAL_CONCEDED_ENERGY_GAIN` (1) enerji (`config/power.ts`), hem insan hem AI. M6.1 tamam.
- **Şut (M6.2 ilk madde):** Aksiyon'a dokun = normal şut, 0 enerji. `SHOT_CHARGE_TAP_SECONDS` (0.18 sn) geçilirse power shot: bırakınca barın **tamamı** harcanır, güç seviyesi = harcanan segment (1–3). Tutarken top aurası her `SHOT_CHARGE_LEVEL_STEP_SECONDS` (0.15) bir seviye büyür (1 sarı → 2 turuncu → 3 beyaz-mavi), enerjiyle sınırlı. `SHOT_CHARGE_MAX_SECONDS` (1.2) sonunda kendiliğinden ateşler. Hız seviyeye göre `SHOT_SPEED_BY_POWER_LEVEL` [1, 1.3, 1.55, 1.8]. Şarj sırasında top kaptırılırsa iptal, enerji harcanmaz. Özellik+Aksiyon ile power şut kaldırıldı; Özellik+Aksiyon şimdilik sadece eski power tutuş (M6.3'te değişecek). Nişan bırakma anındaki joystick yönü.
- **Not:** Enerji "basıldığı an" değil, bırakıldığı an harcanıyor (top kaptırılırsa ceza olmasın diye); sonuç aynı: power shot tüm barı yer.
- **Doğrulama (Playwright, geçici `__game` hook'u kaldırıldı):** Dokun (60 ms) → hız 446, seviye 0, enerji 2→2. 3 enerjiyle basılı tut: 120 ms'de aura 0, 520 ms'de aura 3; bırakınca enerji 0, seviye 3, hız 813. 1 enerjiyle tut: aura 1'de kaldı, hız 583, enerji 0. Gol: sol yiyince oyuncu 1→2, sağ yiyince AI 1→2. Konsol hatası yok, build temiz.
- **Kalan:** M6.2 lob (joystick geri + şut) ve AI'ın yeni şut tipleri; sonra M6.3.
- **Bilinen:** AI hâlâ eski 1 segmentlik power şut kullanıyor. Catch matrisi şimdilik sadece "power mı değil mi"ye bakıyor (seviye M6.3 fark tablosunda kullanılacak).

## Oturum 30 — Şut düzeltmeleri + lob/kafa/vole (Fable incelemesiyle, Sami'nin "uygula" onayı)
- **Fable incelemesi:** Fable modeli son şut kodunu inceledi ve lob tasarımı önerdi; bulguların çoğu uygulandı.
- **Şut düzeltmeleri:**
  - Aura artık basılı tutma power sayılır sayılmaz (0.18 sn) direkt harcanacak seviyeyi gösteriyor (eskiden aura 1 görünüp şut 3 çıkabiliyordu). `SHOT_CHARGE_LEVEL_STEP_SECONDS` kaldırıldı.
  - Giriş tamponu: Aksiyon'a top ayağa gelmeden 8 kareye kadar önce basılsa da şut/şarj başlıyor (`SHOT_PRESS_BUFFER_SECONDS`).
  - Dokunmatik: basış `pointerdown`'da kilitleniyor (iki kare arası kısa dokunuşlar kaybolmuyor); bırakma sahne geneli `pointerup` ile, parmak butondan kayınca şut çıkmıyor.
  - Gol sonrası kilitte basışlar yutuluyor (`InputController.drainPresses()`), kilit bitince hayalet şut/zıplama yok.
  - Şut sonrası `controllingBall` güncelleniyor (süper hareketle çakışma yok).
- **Lob:** Joystick geri (sol oyuncu için sola, eşik 0.5) + şut. Yukarı fırlatma `LOB_LAUNCH_VY` 420 (~1.2 sn uçuş, tepe ~126 px), yatay hız normal şutun 0.75'i, momentum taşımıyor. Basılı tut = power lob (tüm enerji, `LOB_SPEED_BY_POWER_LEVEL` ile daha derine). Joystick'in yukarı/aşağı bileşeni derinliği yönlendiriyor.
- **Düşüş noktası:** Yüksek (30 px üstü) serbest topun ilk yere değeceği noktada sarı halka (`Ball.predictLanding()`, yerçekimi + hava sürtünmesi). Top gölgesi yüksekliğe göre küçülüp soluyor.
- **Kafa/vole:** `systems/aerialStrike.ts`: kontrol edilemeyecek kadar yüksek top, oyuncunun ayağı ile başı arasında ve yakınındaysa Aksiyon = vole (normal şutun 1.15'i, joystick yönü, yoksa ileri). Ayaktayken sadece alçak top, lobu tepede karşılamak için zıplamak gerekiyor.
- **Üst direk:** Kale çizgisini `GOAL_HEIGHT` üstünden geçen top duvar gibi geri sekiyor. Tutuş da yükseklik sınırlı: kalecinin ayağından `CATCH_MAX_HEIGHT_ABOVE_FEET` (1 boy) yüksekteki top tutulamıyor (insan ve AI).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Dokun → 438 px/s, enerji aynı. Tut 260 ms → aura 3, bırak → seviye 3, 812 px/s, enerji 0. Tamponlu basış serbest topta şut attı. Lob vy 369→ tepe ~126, tahmin 661 / gerçek düşüş 659. Power lob seviye 2, 1.2× yatay. Vole y=45 topta 515 px/s; y=110 topta ayakta vole yok. Üst direk: y=130 top kaleye girmedi, geri sekti, skor değişmedi. Kilitte basılı tutulan Space kilit sonrası şut atmadı. Fareyle butondan kayınca şarj sürdü, bırakınca şut çıktı. Konsol hatası yok, build temiz.
- **Kalan:** M6.2 AI'ın yeni şut tipleri (ortak şut yardımcısı, power öncesi görünür şarj, lob karşılamak için zıplama, maç başı hızlı gol). Sonra M6.3.
- **Bilinen:** AI zıplamadığı için lobu sadece yere düştükten sonra alabiliyor. Fable'ın notu: power şut AI'ın 0.15 sn tepki süresinden hızlı geçtiği için her isabetli power şut büyük ihtimalle gol (M6.2 AI / M6.3'te ele alınacak). Enerji basıldığında değil bırakıldığında harcanıyor (bilinçli sapma).

## Oturum 31 — Zıplama pozu, topla zıplama, bombeli vole, AI takılması (Sami'nin geri bildirimi)
- **Geri bildirim:** "Çok embesil zıplıyor, ekrana dönüyor. Top ayağındayken zıplarsa topla zıplayabilir. Havadan vuruş hafif bombeli gitsin. AI kendi aut tarafına top çıkınca duruyor, oyun takıldı."
- **Zıplama pozu:** `gen_sprites.py`'ye yan profil `jump` karesi (dizler toplanmış, kol önde) → `jump_left/jump_right.png`. Havadayken son yatay yöne bakan yan poz kullanılıyor; öne bakan eski `jump` sadece yedek.
- **Topla zıplama:** Top ayaktayken zıplarsan top `BALL_JUMP_CARRY_VY` (300) ile seninle yükseliyor, yatay hızını koruyor (`Ball.liftWithOwner`). Havada Aksiyon = vole; yere inince tekrar kontrol alınabiliyor. Vole erişimi ayağın `AERIAL_REACH_BELOW_FEET` (30 px) altına kadar genişletildi (top zıplayandan biraz yavaş yükseliyor).
- **Bombeli vole:** Vole/kafa artık `VOLLEY_LAUNCH_VY` (160) ile hafif yukarı kalkıyor, yerçekimiyle kavis çizip düşüyor.
- **AI takılması (kök neden):** AI'ın sınırı `RIGHT_GOAL_LINE_X - CHARACTER_WIDTH` idi (82 px boşluk); kendi arka duvarına dayanan topa (kontrol yarıçapı 30) hiç ulaşamıyordu, top ve AI sonsuza kadar duruyordu. Artık insanla aynı: kendi kale çizgisine kadar gidebiliyor.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Arka duvar köşeleri (z 5, 40, 170, 205): AI 1.0–1.4 sn'de topa dokundu (önce: hiç). Topla zıplama: top 60 px'e çıktı, oyuncu 66 px, poz `jump_right`. Havada vole: 514 px/s, kalkış vy ~90–110, tepe ~70 px, düşüş halkası göründü. Konsol hatası yok, build temiz.
- **Bilinen:** AI hâlâ zıplamıyor ve topla zıplama yapmıyor (M6.2 AI işinde).

## Oturum 32 — M6.2 AI şut tipleri, M6.3 fark tablosu (zamanlanmış ajan)
- **Ortak şut yardımcısı:** `systems/shotKinds.ts` → `strikeBall(ball, 'ground' | 'lob' | 'volley', …)`. İnsan ve AI aynı hız/kalkış değerlerini kullanıyor (`config/power.ts`). AI'ın eski 1 segmentlik power şutu ve `SHOT_SPEED_POWER_MULTIPLIER` kaldırıldı.
- **AI şutları (M6.2 tamam):** Normal şut, lob (oyuncu kendi kalesinden `OPPONENT_LOB_RIVAL_ADVANCED_X` ötede ise lob şansı 0.15 → 0.4), power şut/power lob: barın tamamını harcar, bırakmadan önce 0.35–0.6 sn topta büyüyen aura görünüyor (okunabilir işaret). Dolu barla power şansı 0.6. Yüksek top AI yarısına düşecekse düşüş noktasına koşuyor, top yaklaşırken zıplıyor ve kafa/vole vuruyor.
- **Fark tablosu (M6.3 ilk madde):** `systems/catchMatrix.ts` artık deterministik `resolveClash(şutGücü, enerji, basıldı)`: tutan otomatik min(enerji, şut gücü) harcar. ≤0 tutar (eşit power'da +1 geri), 1 tutar ama top seker (kendi yarısında başıboş), 2 sersem pozu + top karşı sahaya seker, 3 gol. Basılmazsa güç 0. Süper şut seviye 3 sayılıyor. Eski şans/hız tabanlı tutuş, Özellik+Aksiyon power tutuş ve `SUPER_SHOT_CATCH_CHANCE_MULTIPLIER` kaldırıldı.
- **Tutma artık temasla:** Aksiyon (top bizde değilken) `CATCH_ARM_SECONDS` (0.35 sn) "tut" penceresi açıyor; bu sürede şut oyuncuya `CATCH_REACH_X` 40 px / `CATCH_REACH_Z` 28 z (ekranda ~65 px, derinlik daha toleranslı) içinden geçerse çatışma çözülür. Boşa giden pencere sonrası 0.4 sn bekleme (spam yok). Eski "kaleye yakın + isabetli şut ise uzaktan tut" kuralı kalktı: tutmak için şutun önünde olmak gerekiyor.
- **AI savunması:** Şut kalesine doğru gelince 0.15 sn tepki, sonra şutun çizgisine (±14 z hata) geçip tut basılı tutuyor; aynı fark tablosu.
- **Doğrulama:** Fark tablosu node ile 14 satır (deterministik, tüm satırlar beklenen). Oyunda (Playwright, sahne manuel adımlandı, geçici `__game` hook'u kaldırıldı): insan 0/0 tut, 1/1 tut (enerji 1→1), 1/0 seker (top kendi yarısında, sonra oyuncunun), 2/0 ve 3/1 sersem + top 419 px/s karşıya, 3/0 gol, 3/3 tut (enerji 3→1), basılmayan normal şut gol. AI: normal şutu tuttu, 2'ye 2 tuttu (2→1), 2'ye 1 seker, 3'e 0 gol. 60 AI şutunda 42 yer / 18 lob, 28 power (seviye 1 ve 3), aura 3'e kadar göründü. Lobda AI 70 px zıpladı ve vole ile geri vurdu. 20 sn gerçek zamanlı maçta konsol hatası yok. Build temiz.
- **Kalan:** M6.3 mükemmel parry (6 kare, +1 çatışma, +1 enerji, flaş) ve sersemleme yavaşlaması (şu an sadece poz); M6.4 his maddeleri.
- **Bilinen:** Karakterlerin `catchChance` / `cooldownSeconds` istatistikleri artık kullanılmıyor (tablo deterministik), sonraki denge turunda ya kaldırılacak ya da yeni anlam verilecek. Yükseğe kalkmış lob AI'ya çarparsa önce havada "tutuluyor" sonra hemen vole ediliyor (görsel olarak kafa vuruşu gibi). Yerden normal şutlar, tutan yolda ve basılıysa her zaman tutuluyor; gol için açıya ya da power'a ihtiyaç var — dengeyi Sami'nin hissine göre ayarlamak lazım (`CATCH_REACH_*`, `OPPONENT_INTERCEPT_Z_ERROR`).

## Oturum 33 — M6.3 mükemmel parry + sersemleme (zamanlanmış ajan)
- **Mükemmel parry:** Tut basışı temastan en fazla `PARRY_WINDOW_SECONDS` (6/60 sn) önceyse parry. Çatışmada bedava +1 tutma gücü (`PARRY_CLASH_BONUS`; otomatik harcama da 1 azalıyor), sonra +1 enerji (`PARRY_ENERGY_GAIN`), ekranda 140 ms beyaz flaş. Giriş tamponu gecikmesi de pencereye sayılıyor. `resolveClash(şut, enerji, basıldı, perfect)` hâlâ deterministik. AI her şutta %15 (`OPPONENT_PERFECT_PARRY_CHANCE`) ihtimalle parry atıyor, flaş onda da var.
- **Sersemleme:** `Character.playStunned()` artık gerçek durum: 0.6 sn boyunca hız ×0.3 (`STUN_MOVE_MULTIPLIER`), dash/zıplama yok, süren dash iptal; insan ve AI sersemken şut/tut/vole yapamıyor (basış tamponda bekliyor).
- **Doğrulama:** Fark tablosu node ile 14 satır (parry'li/parry'siz). Oyunda (Playwright, sahne elle adımlandı, geçici `__game` hook'u kaldırıldı): 2'ye 1 geç basış → seker, enerji 0; aynı şut parry → tutar, enerji 2. 1'e 0: geç → seker, parry → tutar (+1). 3'e 2: geç → seker, parry → tutar, enerji 2. 2'ye 0 → sersem, top 419 px/s karşıya; 3'e 0 parry → sersem (+1 enerji). Sersemken 0.3 sn'de 16 px (normal 38), zıplama/dash çalışmadı, poz `stunned`, 0.6 sn sonra normal. Konsol hatası yok, build temiz.
- **Kalan:** M6.4 hitstop + hafif sarsıntı, power shot portre ara geçişi, gol kutlaması/ağır çekim tekrar.
- **Bilinen:** Parry flaşı tam ekran ve kısa; çok sık parry gelirse göz yorabilir (`PARRY_FLASH_*`). Parry sonucu sersem/gol olsa bile +1 enerji veriyor (kural metni bunu ayırmıyor).

## Oturum 34 — M6.4 hitstop + sarsıntı, power şut portre ara geçişi (zamanlanmış ajan)
- **Hitstop:** `config/feel.ts` → `HITSTOP_FRAMES` normal 4 / power 8 / çatışma 12 kare (60 FPS'e göre saniyeye çevriliyor). Vuruşlar `systems/impactFeel.ts` üzerinden haber veriyor: `strikeBall` (yer/lob/vole, insan + AI) ve `applyCatchAttempt` (her çatışma sonucu). Hitstop sırasında tüm simülasyon duruyor; basışlar tamponda kalıyor, silinmiyor.
- **Sarsıntı:** Sadece power (140 ms, %0.4) ve çatışma (180 ms, %0.6) — normal şut sarsmıyor. Kamera başka hiç oynamıyor.
- **Portre ara geçişi:** Power şut / power lob (insan + AI) ve süper hareket öncesi 0.5 sn (`CUTIN_SECONDS`) oyun donuyor: eğik koyu bant, güç rengine göre kenar ve hız çizgileri (1 sarı, 2 turuncu, 3 mavi-beyaz), vuranın tarafından kayan portre, isim + "POWER / ALEV / YILDIRIM ŞUT!" ("SÜPER HAREKET!"). Geçiş bitince power hitstop'u (8 kare) + sarsıntı oynuyor. Portreler `gen_sprites.py` → `portrait()` (40×40, 4× çiziliyor): çatık kaş, sıkılı diş, ter damlası; Kongo şapkalı/kravatlı.
- **Doğrulama (Playwright, sahne elle adımlandı, geçici `__game` hook'u kaldırıldı):** normal şut → tam 4 kare donma, top donarken kımıldamadı, sonra hareket etti. Power şut (3) → 0.5 sn (30 kare) geçiş, top bu sürede kımıldamadı, ardından 8 kare hitstop. Çatışma (2'ye 1) → 12 kare + sarsıntı çalıştı. AI power şutu → sağdan Kongo portresi, bekleyen etki "power". Ekran görüntüleri her iki tarafta da düzgün; geçiş nesneleri sonunda temizleniyor. Konsol hatası yok, build temiz.
- **Kalan:** M6.4 son madde — gol kutlaması: isim bandı + power gollerinde ağır çekim tekrar.
- **Bilinen:** Sarsıntı HUD'u da hafifçe oynatıyor (Phaser kamerası tek). Yavaş (~300 px/s) bir şut tut penceresine girmeden önce ayağa yapışıp kontrol ediliyor — kasıtlı (yavaş topu durdurmak tutmak sayılmıyor) ama Sami'nin hissine göre `BALL_TRAP_MAX_RELATIVE_SPEED` ile ayarlanabilir.

## Oturum 35 — Top ayağa yapışması, topla dash + toz (Sami'nin geri bildirimi)
- **Geri bildirim:** "Top ayağa yapışıyor; oyuncu ilerleyince top yakınsa yapışıyor, duran top hareket ediyor. Topla dash yapınca topu bırakıyor, altında toz çıkararak topla dash yapsın. Benzer oyunlarda başka hangi mekanikler var?"
- **Kök neden:** Yakalama, ayağın 14–24 px ÖNÜNDEKİ bir noktadan 30 px yarıçapla ölçülüyordu; ~40 px ötedeki duran top kimse dokunmadan ayağa doğru kayıyordu (22/s lerp). Ayrıca yakalanınca dribble noktası anında ayağın önüne kuruluyordu, top oraya çekiliyordu.
- **Düzeltme:** Haxball/YSoccer gibi gerçek temas: top sadece ayağa değince alınıyor — elips `BALL_TRAP_CONTACT_X` 20 px × `BALL_TRAP_CONTACT_Z` 14 z (derinlik daha toleranslı, CLAUDE.md §3). Yakalanınca dribble noktası topun BULUNDUĞU yerden başlayıp ayağın önüne kayıyor; çekilme yok. `BALL_CONTROL_RADIUS` kaldırıldı. AI serbest topa yürürken daha dar ölü bölge kullanıyor (`OPPONENT_BALL_CHASE_DEADZONE` 5), yoksa topun yanında duruyordu.
- **Topla dash:** Dash artık ayaktaki topu bırakmıyor (dash ile yeni top kapılamıyor — müdahale değil). Dash sırasında `moveVelX/Z` gerçek hızı taşıyor, top ~16–18 px önde kalıyor. Dash sırasında ayaktan toz bulutu (`assets/fx/dust.png`, `DASH_DUST_*` ayarları).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Duran top 32 px önde, oyuncu 1 sn bekledi → top 0 px oynadı, kontrol yok. Topa yürüyünce 20.7 px'te değince alındı, sonraki karelerde sıçrama yok (kare başı 2.5–2.8 px, oyuncu hızı). Topla dash: 25 karede kontrol hiç kopmadı, top 15–18 px önde, 5 toz bulutu. AI 6 farklı noktadaki duran topa 1.3–2.9 sn'de dokundu. Konsol hatası yok, build temiz.
- **Araştırma:** Benzer oyunlardan eksik mekanik listesi `docs/BACKLOG.md`'de (gövde bloğu, falso, tek dokunuş geri vuruş, ralli hızlanması, kısa lob…).
- **Bilinen:** AI'ın duran topa ulaşması eskisinden biraz yavaş (algıladığı top konumu gecikmeli + gerçek temas gerekiyor). Dash süresi kısa olduğu için top dash hedefi olan 30 px'e varmadan dash bitiyor; his için `DRIBBLE_DISTANCE_DASH` ve `DRIBBLE_POINT_LERP_SPEED` ayarlanabilir.

## Oturum 36 — M6.4 gol kutlaması: isim bandı + power gollerinde ağır çekim tekrar (zamanlanmış ajan)
- **İsim bandı:** Her golde `systems/GoalCelebration.ts` → `playGoalBand`: atan tarafın yönünden kayan eğik koyu bant, büyükten yerine oturan "GOL!" + atan karakterin adı. Normal golde sarı kenar, power golde güç rengi (1 sarı, 2 turuncu, 3 mavi-beyaz). Ayarlar `config/feel.ts` → `GOAL_BAND_*`, `GOAL_TITLE*`.
- **Ağır çekim tekrar:** `ReplayRecorder` her simülasyon karesinde iki oyuncunun ve topun ekrandaki halini (konum, ölçek, doku/poz, flip, derinlik, gölge) 1.3 sn'lik halka tampona yazıyor (`REPLAY_BUFFER_SECONDS`). Gol power şuttan geldiyse (`Ball.shotLevel` ≥ `REPLAY_MIN_LEVEL` = 1; aura hızla sönse de seviye kalıyor), isim bandından sonra tampon son vuruştan 0.25 sn önceden başlayıp ×0.35 hızla oynatılıyor; üst/alt siyah şerit + yanıp sönen "TEKRAR". Aynı nesneler oynatılıyor (sahnenin kopyası yok), bitince canlı hale geri konuyor. Vuruş anı hitstop olay yolundan (`impactFeel`) işaretleniyor.
- **Akış:** Gol → bant (1.6 sn) → (power ise) tekrar (~1.5–2 sn) → 1 sn sonra oyun. Normal gol eskisi gibi 2 sn kilit. Kilit boyunca maç saati eskisi gibi duruyor. Gol mantığı `MatchScene.onGoal()`'a toplandı.
- **Doğrulama (Playwright, geçici `__game` hook'u kaldırıldı):** Elle adımlı: power 3 gol → 90 kare sonra tekrar başladı, top sprite'ı 554→664→805 px (vuruştan kaleye) `ball_power3` dokusuyla oynadı, sonra başlama noktasına (641 px) geri döndü, toplam kilit 4.6 sn. Normal gol → tekrar yok, kilit 2.0 sn. Gerçek zamanlı: bant ve TEKRAR şeritleri ekran görüntüsünde düzgün, sonunda sahne nesne sayısı eski haline döndü (sızıntı yok). Konsol hatası yok, build temiz.
- **M6 tamamlandı.** Kalan: yok (sonraki iş Sami'nin kararına göre — `docs/BACKLOG.md`).
- **Bilinen:** Tekrarda dash tozu / parry flaşı gibi geçici efektler yok, sadece oyuncular + top + gölgeler. Tekrar sırasında top gölgesinin opaklığı (yüksekliğe göre) güncellenmiyor, boyutu güncelleniyor. Sarsıntı ve tween'ler gerçek zamanlı.

## Oturum 37 — Karakter elementleri + aşırtma okunurluğu (Sami'nin geri bildirimi)
- **Geri bildirim:** "Benim karakter yıldırım ama karşıdaki bana yıldırımlı şut attı; ben hem alev hem yıldırım attım. AI bana aşırtma gol atıyor, nasıl olduğunu anlamadım. Android oyunu yapıyoruz, ona göre düşünelim."
- **Element = karakter:** Aura artık güç seviyesine göre değil şutu atan karakterin elementine göre (`config/elements.ts`, `CharacterDef.element`): Brezilya yıldırım (mavi-beyaz zikzak), Kongo alev, Kenya rüzgar, Arjantin toprak. Seviye 1–3 sadece auranın büyüklüğü, kuyruğu (2+) ve kıvılcımları (3). Yeni sprite'lar `ball_<element><1..3>.png` (`gen_sprites.py` → `ELEMENT_ART`); eski `ball_power1..3` silindi. Portre geçişi: "YILDIRIM ŞUT!" / "ALEV ŞUT!" + "GÜÇ N", bant rengi elementten. Süper hareket "SÜPER HAREKET!" ama yine kendi renginde. Gol bandı da atanın element rengi. CLAUDE.md §5 güncellendi.
- **Aşırtma (lob):** AI lobu ~110–120 px yükseklikten geçiyor (karakter 70 px), yani üstünden aşıyor; karşılamak için düşüş noktasına gidip tutmak ya da zıplayıp Aksiyon (vole) gerekiyor. Düşüş halkası telefonda kaçırılmasın diye büyütüldü, içi hafif dolu ve nabız gibi atıyor (`LANDING_MARKER_*`). Oyuncu kalesinden uzaktayken AI lob ihtimali 0.4 → 0.25.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** Brezilya power 3 → `ball_lightning3` + "YILDIRIM ŞUT! GÜÇ 3"; Kongo AI power 2 → `ball_fire2` + "ALEV ŞUT! GÜÇ 2". Konsol hatası yok, build temiz.
- **Bilinen:** Çatışma hesabı `ball.powerLevel` (aura) kullanıyor; top 180 px/s altına yavaşlarsa aura ve güç sönüyor — çok yavaş power lob çatışmada 0 sayılabilir.

## Oturum 38 — M7 mobil UI/UX (Sami: "telefon/Android oyunu, yatay ekran, hepsi")
- **M7.1 Yatay + tam ekran:** Telefon dik tutulunca tam ekran "TELEFONU YAN ÇEVİR" (dönen telefon animasyonu, CSS, `index.html`). Dokunmatik cihazda ilk dokunuşta tam ekran + yatay kilit (`systems/mobileShell.ts`; Android Chrome'da çalışır, iOS'ta sadece uyarı). Menüde "TAM EKRAN" düğmesi. Ana ekrana eklenebilir: `assets/manifest.webmanifest` (`display: fullscreen`, `orientation: landscape`), ikonlar `assets/icons/icon-192/512.png` (`gen_sprites.py` → `app_icon()`, alevli top).
- **M7.2 HUD:** Enerji barları üst köşelere, 3× büyük, koyu plaka üstünde; rakibin enerjisi de görünüyor (çatışma tablosu için önemli). Hücre dolunca küçük "pop". Dokunmatikte klavye/alt yazılar gizli. "BİTİR (TEST)" kalktı → sağ üstte duraklat düğmesi (52 px), menü: DEVAM / YENİDEN BAŞLA / ANA MENÜ; PC'de P veya ESC. Duraklatınca saat ve tween'ler duruyor.
- **M7.3 Dokunmatik:** Aksiyon basılıyken buton etrafında dolum halkası (önce beyaz, power sayılınca element renginde, enerji kadar dolu). Dash (enerji yok / bekleme / sersem) ve Özel (3 enerji yok) kullanılamazken soluk. Titreşim (`systems/haptics.ts`): şut 12 ms, power 35, çatışma 55, gol desenli — ayarlar `config/controls.ts`.
- **M7.4 Menüler:** Hepsi pixel font + büyük kartlar (`systems/uiKit.ts`, ölçüler `config/menus.ts`). Karakter kartı: portre, arketip, element topu + adı, HIZ/ŞUT/GÜÇ çubukları, özel hareket. Saha seçimi 2×2 kart, zemin renk örneği. Son seçilen karakter/saha hatırlanıyor (localStorage). Sonuç ekranı: KAZANDIN / KAYBETTİN / BERABERE + RÖVANŞ.
- **Doğrulama (Playwright, Pixel 7 yatay emülasyonu; geçici hook kaldırıldı):** tüm ekranların görüntüsü alındı; duraklatınca 0.6 sn'de saat değişmedi; dik görünümde uyarı çıkıyor; manifest ve ikon 200. Konsol hatası yok, build temiz.
- **Bilinen:** Tam ekran/yatay kilit ve titreşim gerçek telefonda denenmedi (emülatör desteklemiyor). Offline çalışma (service worker) yok. Kongo sahası seçim kartında mor, oyunda gri sokak — kart rengi `tintColor`'dan geliyor.

## Oturum 39 — M8 Kafa Topu tarzı ana menü + karakter gelişimi (Sami'nin isteği)
- **Hub (`MenuScene`):** gece stadyumu arka planı (`systems/hubBackdrop.ts`: gradyan gök, projektörler, pixel seyirci, çizgili çim), üstte yıldız rozetli hesap seviyesi + XP çubuğu, altın ve elmas hapları; ortada kaidede seçili karakter (nefes alır gibi sallanıyor, dokununca Karakter ekranı); isim plakası LV + XP; solda takılı özellikler (kilitli slotlar "LV 2 / LV 6"), sağda element kartı; altta "pixel modern" KARAKTER ve OYNA düğmeleri (`makeFancyButton`: yuvarlak, parlak üst, 3D alt kenar, pixel ikon). İkonlar `gen_sprites.py` → `icon_coin/gem/star/whistle/shirt/lock`.
- **Gelişim (`config/progression.ts`, `systems/profile.ts`, localStorage):** maç sonu XP = 30 + galibiyet 40 / beraberlik 15 + gol başı 10; altın 50/25/10 + gol başı 5; elmas: 3+ farkla galibiyet 1, her seviye atlama 5. Seviye eşiği 100, 150, 200… (maks 10). Hesap seviyesi her 250 XP.
- **Özellikler (seviyeyle açılır, slota takılır):** Çevik (Lv2, dash bekleme 0.75 sn), Isınmış (Lv3, maça 1 enerjiyle başla), Duvar (Lv5, parry +3 kare), İkinci Nefes (Lv7, pasif enerji 4 sn). Slot: Lv2'de 1, Lv6'da 2. Sadece oyuncuda etkili, AI'da değil.
- **Karakter ekranı (`CharactersScene`):** solda 4 karakter (Arjantin/Kenya "YAKINDA"), sağda seviye/XP, element, HIZ/ŞUT/GÜÇ, özel hareket, özellik tak/çıkar (slot doluysa ekran sallanır), SEÇ ve OYNA. Eski karakter seçim ekranı kaldırıldı; OYNA → saha → maç.
- **Sonuç ekranı:** KAZANDIN/KAYBETTİN + skor, sırayla beliren +XP / +altın / +elmas, seviye atlayınca "BREZİLYA LV 2!" ve yeni açılan özellik; RÖVANŞ / DEVAM. Duraklat menüsü de yeni düğme stilinde.
- **Doğrulama (Playwright, Pixel 7 yatay; geçici hook kaldırıldı):** 4-1 galibiyet → +110 XP, +70 altın, +6 elmas (büyük fark 1 + seviye 5), Lv2 ve "Çevik" açıldı, profil kaydedildi. Lv6 + Çevik + Isınmış takılıyken maç başında enerji 1, dash çarpanı 0.75. Konsol hatası yok, build temiz.
- **Kalan / karar bekleyen:** altın ve elmasın harcanacağı yer (market? karakter açma? kostüm?), diğer hub düğmeleri.
- **Bilinen:** Profil sadece o cihazda (localStorage); tarayıcı verisi silinirse sıfırlanır. Seviye dengesi tahmini.

## Oturum 40 — Hava kombosu: falso vole + rövaşata (Sami'nin fikri)
- **Falso:** Havadayken yukarı/aşağı dash (`AIR_CURVE_DASH_MIN_Z` 0.35 üstü z) o zıplamaya falso hakkı verir (`Character.airCurveSide`, yere inince sıfırlanır). Ardından Aksiyon (vole) → top dash yönünün tersine %25 sapmayla çıkar, `Ball.spin` (400 z/s², sönme 1.4/s) ile dash tarafına kıvrılır; hız ×1.1. Oyuncunun üstünde "FALSO!" yazısı. Topla zıplanmışsa top hava dash'i boyunca oyuncuyla birlikte gider (yoksa dash topu bırakıp uzaklaşıyordu). Çatışma ve kontrol falsoyu siler.
- **Rövaşata:** Havada, erişilebilir yüksek topta Özel bırakılınca (3 enerji): "RÖVAŞATA!" portre geçişi, seviye 3 kendi elementiyle şut (×1.05), karakter ters takla atıyor (merkez etrafında −300°, 0.38 sn). Hava dash'i önceden yapılmışsa rövaşata da falsolu.
- **Not (Sami'nin gördüğü "3. güçte falso"):** Önceden gerçek falso yoktu; görülen sapma büyük ihtimalle AI'ın nişan sapması/duvar sekmesi ya da Kenya'daki rüzgardı.
- **Doğrulama (Playwright, adım adım; geçici hook kaldırıldı):** Topla zıpla + Aksiyon → düz (z 105 sabit) gol. Zıpla + yukarı dash + Aksiyon → z 121→101→128 eğri, gol. Aşağı dash → 95→115→88 ters eğri, gol. Rövaşata: enerji 3→0, `ball_lightning3`/`ball_fire3`, gerçek zamanlı ekran görüntüsünde takla görünüyor. Konsol hatası yok, build temiz.
- **Bilinen:** AI kombo kullanmıyor (BACKLOG). Falso gücü hissiyata göre `CURVE_ACCEL` / `CURVE_AIM_OFFSET` ile ayarlanabilir.

## Oturum 41 — PC kontrolleri: WASD + Space + Shift + fare (Sami'nin isteği)
- WASD hareket (oklar da duruyor), Space zıpla, Shift dash, sol tık Aksiyon (şut/tut; basılı tutunca power şarjı), sağ tık Özel (süper / havada rövaşata). Klavye yedeği: J = Aksiyon, E = Özel; P/ESC duraklat. Tek kareden kısa tıklar da sayılıyor (latch).
- Fare artık dokunmatik joystick'i ve ekrandaki tuşları tetiklemiyor (`pointer.wasTouch`); duraklat gibi UI düğmelerine tıklamak şut saymıyor. Sağ tık menüsü zaten kapalı.
- Maç içi alt yazı ve CLAUDE.md §4 güncellendi.
- **Doğrulama (Playwright, gerçek klavye/fare olayları; geçici hook kaldırıldı):** W → z 100→120, D → x 250→289, Space → y 44, Shift → dash + 1 enerji, sol yarıya fare basılı → oyuncu kımıldamadı (joystick 0,0), top ayaktayken sol tık → şut (453 px/s), 3 enerjiyle sağ tık → süper (enerji 0, seviye 3). Konsol hatası yok, build temiz.

## Oturum 42 — Yayın hazırlığı değerlendirmesi + arka plan yol haritası (Sami'nin sorusu)
- Soru: "Telefonda çıkmaya uygun mu? Arka planda olması gereken her şeyi haritaya ekle."
- `docs/ROADMAP.md`'ye yayın durumu değerlendirmesi ve iki yeni aşama eklendi: **M9** (sunucusuz tek oyunculu Play Store v1: teknik paket, içerik/cila, mağaza/yasal) ve **M10** (oyun mantığını ayırma, hesap/bulut kayıt, online maç, canlı işletme, para kazanma). Kod değişmedi.
- Google Play kuralları web'den kontrol edildi (Kasım 2026): yeni kişisel hesaplarda 12 test kullanıcısı / 14 gün kapalı test, targetSdk 36 (31 Ağustos 2026'dan beri).
- Karar bekleyenler (Sami): Play hesabı (25 $), hata raporlama servisi, hedef kitle, altın/elmas kullanımı, online mimarisi, para kazanma modeli.

## Oturum 43 — Zamanlanmış M6 kontrolü
- M6'nın tüm maddeleri zaten işaretli; yeni kapsam eklenmedi, kod değişmedi.

## Oturum 44 — Zamanlanmış M6 kontrolü (18.11.2026)
- M6'nın tüm maddeleri zaten işaretli; yeni kapsam eklenmedi, kod değişmedi.

## Oturum 45 — Zamanlanmış M6 kontrolü (18.11.2026)
- M6 tamamen işaretli; kod değişmedi.

## Oturum 46 — Zamanlanmış M6 kontrolü (18.11.2026)
- M6 tamamen işaretli; kod değişmedi.

## Oturum 47 — M9.1: internetsiz çalışma + Android (Capacitor) paketi (18.11.2026, zamanlanmış)
- **İnternetsiz:** Build sırasında `sw.js` üretiliyor (`tools/build/serviceWorkerPlugin.ts`, ayarlar `src/config/offline.ts`). Tüm JS + `assets/` önceden önbelleğe alınıyor; önbellek adı içerik özeti → her deploy yeni önbellek, eskisi siliniyor. Sayfa açılışı önce ağdan (yeni sürüm bir sonraki açılışta), yoksa önbellekten. Dev sunucusunda ve Android uygulamasında kapalı.
- **Android:** Capacitor 8 (`capacitor.config.ts`, `android/`), paket `com.samiboran.platformfootball`, **targetSdk 36**, compileSdk 36, minSdk 24, yatay ekran. İkon/açılış ekranı `npm run android:icons` ile oyun ikonundan. `npm run build:android` göreli base ile derleyip `cap sync` yapıyor; Pages derlemesi aynı (`/platform-football/`). Ayrıntı: `docs/ANDROID.md`.
- **CI:** `.github/workflows/android.yml` her push'ta imzasız debug APK üretip artifact olarak yüklüyor (Pages deploy'undan ayrı iş). Pages iş akışı Node 22'ye çıktı (Capacitor CLI şartı).
- **Doğrulama (Playwright):** önizlemede SW kontrolü aldı, 104 dosya önbellekte; sunucu kapatılıp yeniden yükleyince menü açıldı, hata yok. Sahte yeni sürümde eski önbellek silindi. Göreli base derlemesi kök adreste sorunsuz açıldı. Bu ortamda Android SDK/Gradle'a erişim yok → APK derlemesi CI'da doğrulanıyor.
- **Sami bekliyor:** imza anahtarı (keystore) + GitHub Secrets (adımlar `docs/ANDROID.md`), hata raporlama servisi seçimi, gerçek telefonda 60 FPS testi.
- **Kalan (M9.1):** geri tuşu, arka planda duraklatma, safe-area, yükleme ekranı, kayıt sürümleme.

## Oturum 48 — M9.1: Android geri tuşu + arka planda duraklatma (18.11.2026, zamanlanmış)
- **Geri tuşu** (`@capacitor/app`, `src/systems/appLifecycle.ts`, ayarlar `src/config/lifecycle.ts`): maçta duraklat (tekrar basınca devam), Karakter / Saha seçimi / Sonuç → ana menü, ana menüde "ÇIKILSIN MI?" penceresi (EVET uygulamayı kapatır, HAYIR ya da ikinci geri basış pencereyi kapatır). Sahne `onBackButton()` yazarak kendi davranışını belirleyebiliyor.
- **Arka plan:** sekme gizlenince / uygulama arka plana gidince ses tamamen susuyor (Web Audio askıya), maç duraklatma menüsüne geçiyor. Geri gelince ses açılıyor, maç oyuncu DEVAM diyene kadar bekliyor.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** menüde geri → pencere açıldı, ikinci geri → kapandı, HAYIR → kapandı; Karakter ve Saha ekranından geri → Menü; maçta geri → duraklat, tekrar → devam (süre akıyor); `visibilitychange` gizli → duraklatıldı + mute, görünür → mute kalktı, süre donuk. Konsol hatası yok, build ve `build:android` (cap sync) temiz. Gerçek cihaz geri tuşu CI APK'sıyla telefonda denenmeli.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi.
- **Kalan (M9.1):** safe-area, yükleme ekranı, kayıt sürümleme.

## Oturum 49 — Sami'nin geri bildirimi: standart saha, gövde bloğu, isimler, GÜÇ, ekipman + M9.1 Android kalanları (19.11.2026)
- **Standart Saha:** efektsiz çim saha eklendi, varsayılan ve PvP/2v2 sahası (`DEFAULT_STADIUM`, `PVP_STADIUM`). Saha seçiminde üstte geniş kart. Temalı sahalar yumuşatıldı: Kenya sürtünme 2.6→1.6, rüzgar 35→20; Brezilya sekme 0.6→0.75; Arjantin sürtünme 1.2→1.15. Arjantin'in "dar alan" yavaşlaması tanımlıydı ama uygulanmıyordu → artık uygulanıyor (0.95).
- **Gövde bloğu (Sami'nin "içinden geçiyor" hissi gerçekti):** Tut'a basmayınca hızlı şut gövdeden geçiyordu (bakış yönü fark etmiyordu). Şimdi normal şut seker, power şut düşürüp geçer. Tut'a basmak her zaman daha iyi. Hızlı şut "tünellemesin" diye kare boyunca süpürülerek kontrol ediliyor.
- **Statlar gözden geçirildi:** HIZ ve ŞUT çalışıyordu; **GÜÇ ekranda vardı ama hiçbir şey yapmıyordu** → artık gövde gücü (düşme süresi ÷ GÜÇ, gövdeden sekme × GÜÇ). Kullanılmayan `catchChance` ve `cooldownSeconds` silindi. 4 özellik (perk) çalışıyor; sadece oyuncuda.
- **İsimler:** Tiago (BRA), Nico (ARG), Baraka (KEN), Kiala (COD). Tabela takım kodunu, menü/kart/gol bandı karakter adını gösteriyor.
- **Ekipman:** `config/equipment.ts` + `EquipmentScene` (menüde EKİPMAN). 3 yuva, 10 parça, altınla alınır, hepsi takaslı (±3–12%). Maçta HIZ/ŞUT/GÜÇ/dash beklemesi/falso'ya çarpılıyor. Fonta `%` ve `,` eklendi (`gen_sprites.py`).
- **M9.1 kalanlar:** kayıt sürümleme (`pf.profile.v2`, v1 kaydı otomatik taşınıyor, `MIGRATIONS` zinciri); yükleme ekranı (HTML "YÜKLENİYOR" + Boot'ta ilerleme çubuğu, açılış süresi `localStorage['pf.bootMs']`); safe-area (`#app` env/--safe-area-inset dolgusu, Capacitor SystemBars `insetsHandling: css`, uygulamada durum/gezinme çubukları gizli). Bu sırada eski bir hata da düzeldi: canvas iki kez ortalanıyordu (geniş ekranda sağa kayık).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** v1 kaydı → v2 (altın/karakter korunur, varsayılan ekipman); 400 altınla Kaptan Bandı alındı (50 kaldı), 400'lük Golcü Bandı alınamadı; maçta GÜÇ 0.9×1.12=1.008; varsayılan saha standard; normal şut gövdeden sekti (sonra oyuncu topu aldı), seviye 2 power şut oyuncuyu düşürüp devam etti; safe-area 80 px sol boşlukta canvas 110 px'ten başlıyor; açılış ~570 ms (masaüstü). Konsol hatası yok; build ve build:android temiz.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS + çentikli ekran + geri tuşu testi.
- **Bilinen:** ekipman sprite'ta görünmüyor (renk kutusu); AI'da perk/ekipman yok (BACKLOG).

## Oturum 50 — M9.2: ses efektleri, müzik, seyirci (19.11.2026, zamanlanmış)
- **M9.1 durumu:** Claude'un yapabileceği her şey bitti; kalanlar Sami'de (imzalı AAB keystore, gerçek telefonda 60 FPS, hata raporlama servisi).
- **Ses (M9.2.1):** Tümü çalışma anında Web Audio ile üretiliyor — dosya yok, lisans yok, internetsiz çalışıyor. Ayarlar `src/config/audio.ts`, motor `src/systems/SoundFX.ts` (master ← sfx / müzik / seyirci kanalları).
  - Efektler: deri top vuruşu (gümleme + tık), power/çatışma patlaması (hitstop anında, kesitten sonra), kesit sırasında yükselen "şarj" sesi, top sekmesi (yer/duvar/direk/gövde, hıza göre şiddet, hafif yuvarlanmada sessiz), eldiven sesi (tutuş), mükemmel parry çınlaması, dash rüzgârı, zıplama, içecek, menü tık sesi, düdük (başlangıç uzun, bitiş kısa-kısa-uzun), gol jingle'ı, sonuç ekranında kazandın/berabere/kaybettin melodisi.
  - Seyirci: maç boyunca uğultu döngüsü; power şutta "ooh", golde kükreme.
  - Müzik: özgün chiptune — menüde samba havası (C–Am–F–G, 112 BPM), maçta sürükleyici minör döngü (138 BPM, kısık melodi). Duraklatınca müzik + seyirci kısılıyor.
  - Tarayıcı kuralı gereği ses ilk dokunuşta açılıyor. Ses/müzik aç-kapa `soundFX.setSfxEnabled / setMusicEnabled` ile hazır, tercih `pf.audio.sfx` / `pf.audio.music` — ayarlar ekranı bunları kullanacak.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** OfflineAudioContext ile 23 sesin hepsi render edildi: hepsi duyulur, hiçbiri kırpmıyor (en yüksek tepe 0.59). Maçta gerçek oyunda düdük/sekme/zıplama/dash/vuruş/gol çağrıları geldi; duraklatma kanalları kıstı, devam açtı; sonuç ekranında müzik + seyirci durdu; arka plana gidince ses bağlamı askıya alındı. Konsol hatası yok, build temiz.
- **Kalan (M9.2):** ayarlar ekranı (sıradaki), eğitim, AI zorluk, lig, TR/EN dil, denge turu.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; seslerin kulağa hoş gelip gelmediği (ayarlar `config/audio.ts`).
- **Bilinen:** sesler sentez — "gerçek kayıt" kalitesinde değil; istenirse ileride lisanssız örneklerle değiştirilebilir (çağrı noktaları aynı kalır).

## Oturum 51 — M9.2: Ayarlar ekranı (19.11.2026, zamanlanmış)
- **AYARLAR** (`src/scenes/SettingsScene.ts`, ayarlar `src/config/settings.ts`, kayıt `src/systems/settings.ts` → `localStorage['pf.settings.v1']`). Ana menüde üst barda **AYAR** düğmesi (elmas hapı biraz sola kaydı). Android geri tuşu → ana menü.
  - Ses efektleri / müzik aç-kapa (SoundFX'in mevcut `pf.audio.*` tercihleri), titreşim aç-kapa (açınca kısa örnek titreşim; `haptics.ts` artık ayara bakıyor).
  - Tuş boyutu KÜÇÜK / ORTA / BÜYÜK (×0.85 / 1 / 1.18 — joystick dahil, küme köşeye orantılı yaklaşıyor, BÜYÜK de ekrana sığıyor), şeffaflık %40 / %70 / %100.
  - El düzeni SAĞ EL / SOL EL: sol elde tuş kümesi sola, joystick bölgesi sağ yarıya geçiyor (ayna).
  - Dil: TÜRKÇE (YAKINDA etiketi) — İngilizce, M9.2 "Dil" maddesiyle açılacak.
  - Sağda canlı önizleme (mini maç ekranında tuşların yeri/boyu/şeffaflığı), altta VARSAYILAN.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** menüden AYAR → Ayarlar açıldı; titreşim/boyut/şeffaflık/el/müzik değişip kaydedildi; dil satırı değişmedi; SOL EL + BÜYÜK maçta tuşlar solda, sağ yarıya dokunup sürükleyince oyuncu yürüdü (x 295→365), sol yarı joystick olmadı; VARSAYILAN her şeyi geri aldı, maç varsayılan düzende. Konsol hatası yok, build temiz.
- **Kalan (M9.2):** ilk açılış eğitimi (sıradaki), AI zorluk seviyeleri, lig modu, TR/EN dil, denge turu.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri ve Arjantin/Kenya kararı.
- **Bilinen:** ayar değişikliği açık bir maça değil, bir sonraki maça uygulanır (duraklatma menüsünde Ayarlar yok).

## Oturum 50 — Şut açıları, nişan çizgisi, duvardan banko (19.11.2026, Sami'nin isteği)
- **Sabit açılar:** joystick 45 / 70 / 90 / 110 / 135 dereceye yapışıyor (`config/aim.ts`, `systems/aim.ts`). Yerden şut, vole ve rövaşatada geçerli. Joystick boşken artık her zaman ileri (90°) — eskiden bakış yönüne gidiyordu, geriye bakarken kendi kalesine şut çıkabiliyordu.
- **Nişan çizgisi:** top ayaktayken kesik çizgi, bir yan duvar sekmesini gösterir; şarj ederken parlaklaşır; lobda gizli. Sadece insan oyuncuda, Ayarlar'da "NİŞAN ÇİZGİSİ" ile kapanır (ayar satırları biraz sıkıştırıldı).
- **Duvar:** yan duvar sekmesi 0.55 → 0.85, uç duvar 0.55 → 0.6.
- **Bulunan asıl hata:** yer sürtünmesi x ve z'ye ayrı ayrı uygulanıyordu → çapraz şutta küçük bileşen (z) önce bitiyor, top düzleşip duvara hiç ulaşamıyordu. Artık hız vektörüne uygulanıyor; çapraz şutlar gittiği yöne gidiyor.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** joystick 30°→45, 79°→70, 117°→110, yukarı→45, geri-aşağı→135. Orta derinlikten 45° normal şut yan duvara çarpıp sekiyor; 45° seviye-2 power şut duvardan sekip **gol** oldu. Ayarlar ekranı 8 satır sığıyor. Konsol hatası yok, build temiz.
- **Bilinen:** AI açılara yapışmıyor ve bankoyu bilinçli kullanmıyor (kendi nişanı var). Normal şutla uzaktan banko gol zor — bilerek; daha kolay olsun istenirse `BALL_SIDE_WALL_RESTITUTION` ya da açı listesi değiştirilebilir.


## Oturum 52 — M9.2: İlk açılış eğitimi (19.11.2026, zamanlanmış)
- **EĞİTİM** (`src/systems/Tutorial.ts`, ayarlar/metinler `src/config/tutorial.ts`): süresiz bir maç içinde (Standart Saha, seçili karakter) 9 adımlık mini görev: Hareket (x ve derinlikte yürü, % gösterir) → Zıpla ×2 → Dash ×2 → Şut ×2 → Power şut → Lob → Tut/Parry ×2 (rakip yarıdan oyuncuya deneme şutları gelir, mükemmel parry ayrıca yazılır) → Falso (topla zıpla, havada yukarı/aşağı dash, vole; dash'siz vole yapınca uyarı) → Rövaşata (top oyuncunun yanına havaya atılır, zıpla + Özel).
  - Eğitimde enerji hep dolu, saat yok (tabela altında "EĞİTİM"), içecek yok, rakip kalede durur, gol sayılmaz; top her adımda yeniden hazırlanır (ayağa / havaya / uzağa), kaçarsa ~2 sn sonra geri gelir.
  - Metinler dokunmatik ve PC için ayrı (AKSİYON/ÖZEL vs SOL TIK/SAĞ TIK, WASD/SPACE/SHIFT).
  - **İlk açılış:** ana menü ilk kez açılınca eğitim kendiliğinden başlar (`pf.tutorial.seen`, bir kez — yarıda çıkılsa da tekrar zorlamaz). Panelde **ATLA**; bitince "EĞİTİM TAMAM!" → MAÇA BAŞLA / ANA MENÜ (`pf.tutorial.done`). Ayarlar ekranında **EĞİTİM** düğmesiyle tekrar oynanır.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** temiz tarayıcıda açılış doğrudan eğitime gitti; klavyeyle 9 adımın hepsi gerçek oyun girdileriyle tamamlandı (falso ve rövaşata dahil), bitiş ekranı → ANA MENÜ, Ayarlar > EĞİTİM tekrar başlattı, sayfa yenilenince menü açıldı (tekrar eğitim yok). Bulunan hata: havaya atılan top yerden başlayınca ayak hemen yakalıyordu → atış yakalama yüksekliğinin üstünden başlıyor (`TUTORIAL_TOSS_START_Y`). Konsol hatası yok, build temiz.
- **Kalan (M9.2):** AI zorluk seviyeleri (sıradaki), lig modu, TR/EN dil, denge turu.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri ve Arjantin/Kenya kararı.
- **Bilinen:** eğitim metinleri şimdilik sadece Türkçe (Dil maddesiyle EN gelecek). Mevcut oyuncular da bir kez eğitimle karşılaşır (ATLA ile geçilir).

## Oturum 53 — M9.2: AI zorluk seviyeleri + AI falso/rövaşata (19.11.2026, zamanlanmış)
- **Zorluk** (`src/config/difficulty.ts`, kayıt `src/systems/difficulty.ts` → `localStorage['pf.aiDifficulty']`): **KOLAY / ORTA / ZOR**. Ayarlanan: tepki süresi (0.26 / 0.15 / 0.09 sn), tutarken derinlik hatası, mükemmel parry şansı, nişan sapması, topu izleme hızı, şut isteği/aralığı, power şut şansı, koşu hızı (×0.9 / 1 / 1.06), falso ve rövaşata şansı, ödül çarpanı (XP+altın ×0.75 / 1 / 1.35). **ORTA = eski AI'ın birebir değerleri** (denge bozulmadı); taşınan sabitler `config/opponent.ts`'ten kaldırıldı.
  - Saha seçim ekranında GERİ ile MAÇA BAŞLA arasında "RAKİP" + üç renkli düğme; seçim hatırlanıyor, rövanş aynı zorlukla. Maçta süre altında küçük renkli etiket (KOLAY/ORTA/ZOR), eğitimde yok.
- **AI hava kombosu:** yüksek topa zıplarken (ORTA %30, ZOR %60) havada top tarafına yukarı/aşağı dash atıyor (1 enerji, insanla aynı kural) ve vole falso oluyor — "FALSO!" yazısı AI'ın üstünde. Bar doluyken havadaki topa (ORTA %35, ZOR %70) **rövaşata**: tam bar, seviye 3, kendi elementi, "RÖVAŞATA!" kesiti, takla; dash'liyse falsolu. KOLAY ikisini de kullanmıyor.
- **Bulunan hata (eski):** AI, voleden sonra hitstop bitince hâlâ menzildeki topa ikinci kez vuruyordu (falsonun dönüşünü de siliyordu) → vuruştan sonra 0.35 sn yeniden vuruş kilidi (`OPPONENT_AERIAL_RESTRIKE_SECONDS`).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** saha seçiminde ZOR seçilip maç başladı, AI zor profille kuruldu, etiket göründü. Zorlanmış şanslarla AI'a lob atıldı: falso voleleri çıktı, dönüş (spin) top kaleye/gole kadar korundu; rövaşata kesitle çıktı; şans 0 iken hiçbiri olmadı. Ödül: 2-1 galibiyet KOLAY 68 XP/45 altın, ORTA 90/60, ZOR 122/81. Üç zorlukta da maç hatasız oynandı. Konsol hatası yok, build temiz.
- **Kalan (M9.2):** lig/hikaye modu (sıradaki), TR/EN dil, denge turu.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri ve Arjantin/Kenya kararı; zorluk değerlerinin oynayınca nasıl hissettirdiği (`config/difficulty.ts`).
- **Bilinen:** AI hâlâ sabit açılara yapışmıyor ve duvardan bankoyu bilinçli kullanmıyor; yerden süper hareketi kullanmıyor (bilerek). AI'da ekipman/özellik yok. Başlama vuruşunda orta çizgideki topu AI almıyor (eskiden de böyleydi, insan başlatıyor).

## Oturum 54 — M9.2: Lig/hikaye modu "Sokak Dünya Kupası" (19.11.2026, zamanlanmış)
- **LİG** (`src/scenes/LeagueScene.ts`, veri `src/config/league.ts`, mantık `src/systems/league.ts`): ana menünün alt sırasında KARAKTER ile OYNA arasında altın **LİG** düğmesi (kupa ikonu). 4 aşama, 7 maç: **Mahalle** (2 maç, KOLAY: Standart, Brezilya) → **Şehir** (2, ORTA: Arjantin, Kenya) → **Kıta** (2: Kongo ORTA, Brezilya ZOR) → **Dünya Finali** (1, ZOR, Standart). Her maçın sahası, zorluğu ve tercih edilen rakibi config'te; rakip oyuncunun kendi karakteriyse (kadro 2 kişi) diğer karakter gelir.
  - Lig ekranı: 4 aşama kartı (tamamlanan TAMAM, sıradaki sarı çerçeve + yanıp sönen nokta, kilitli soluk + kilit), maç başına nokta, aşama bonusu (altın/elmas); altta sıradaki maç: rakip, saha, zorluk; OYNA. Kazanılan kupa sayısı sağ üstte.
  - Kural: **galibiyet = sıradaki maç**, beraberlik/yenilgi = aynı maç tekrar (ceza yok). Aşamanın son maçı kazanılınca bonus (60 / 100+1 / 150+2 / 250+5 altın+elmas). Final kazanılınca "DÜNYA ŞAMPİYONU!", kupa +1, lig ekranında **YENİ SEZON** ile baştan.
  - Lig maçlarında ödül ×1.1 (`LEAGUE_REWARD_MULTIPLIER`, zorluk çarpanının üstüne). Maçta süre altında "ŞEHİR 1/2 - ORTA" etiketi (artık gölgeli, çimde okunuyor). Duraklatmada ANA MENÜ yerine LİG. Sonuç ekranında SONRAKİ MAÇ / TEKRAR DENE + LİG; Android geri → ana menü.
- **Kayıt v3:** profil şemasına `league { next, titles }` eklendi, `pf.profile.v2` → v3 otomatik taşınıyor (ilerleme sıfırdan başlar, altın/elmas/XP korunur).
- **Grafik:** `gen_sprites.py`'ye `icon_trophy` (kupa) eklendi, sprite sheet yenilendi.
- **Doğrulama (Playwright, geçici hook kaldırıldı):** v2 kaydı v3'e taşındı (altın/elmas korundu). Menü → LİG → OYNA: maç Standart/KOLAY/Kiala ile başladı; 0-1 yenilgide ilerleme 0'da kaldı, TEKRAR DENE aynı maçı açtı; 7 maç SONRAKİ MAÇ ile kazanıldı, her maçın sahası/zorluğu config'le aynı, aşama bonusları doğru eklendi, finalde kupa 1 oldu; YENİ SEZON ilerlemeyi 0'a aldı, kupa kaldı. Hızlı maç (OYNA → saha seçimi) değişmedi, ligi etkilemiyor, RÖVANŞ duruyor. Lig maçında klavyeyle oynandı, duraklatma menüsü LİG gösterdi. Konsol hatası yok, build temiz.
- **Kalan (M9.2):** TR/EN dil (sıradaki), denge turu (gerçek oyuncu geri bildirimi gerekiyor).
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri ve Arjantin/Kenya kararı; lig merdiveninin uzunluğu/zorlukları ve bonusların hissi (`config/league.ts`).
- **Bilinen:** Kadro 2 kişi olduğu için lig rakibi hep diğer karakter (Arjantin/Kenya açılınca `rival` alanları anlam kazanacak). Ligde rakip isimleri/hikâye metni yok, sadece aşama adları. Lig maçında karakter, ana menüde seçili olan.


## Oturum 55 — M9.2: Türkçe + İngilizce; M9.3: gizlilik politikası (20.11.2026, zamanlanmış)
- **Dil** (`src/i18n/index.ts`, çeviriler `src/i18n/en.ts`): gettext tarzı — koddaki Türkçe metin anahtar, **bütün İngilizce tek dosyada**. Oyundaki tüm yazılar piksel font (BitmapText) ile çizildiği için `BitmapText.setText` bir kez sarıldı: her etiket/tuş/HUD yazısı çizilirken çevriliyor (config'lerde yüklenirken kurulan sabitler dahil). Türkçe'de hiçbir şey değişmiyor.
  - Birleşik metinler parçalanıp çevriliyor (`"SIRADAKİ: ŞEHİR 1/2 - ORTA"` → `NEXT: CITY 1/2 - MEDIUM`, `+60 ALTIN` → `+60 GOLD`, `ŞEHİR TAMAM!` → `CITY CLEARED!`, `GÜÇ 2` → `POWER 2`). İngilizcede isimlerdeki noktalı İ düz I oluyor (TİAGO → TIAGO). Sayılar dile göre (1.250 / 1,250). `index.html`'deki "YÜKLENİYOR" ve "TELEFONU YAN ÇEVİR" de çevriliyor, `<html lang>` güncelleniyor.
  - **İlk açılış:** kayıtlı dil yoksa cihaz dili (tr* → Türkçe, diğer her şey → English). Ayarlar > **DİL** artık TÜRKÇE ⇄ ENGLISH arasında geçiyor, ekran anında yenileniyor. VARSAYILAN dili sıfırlamıyor (okuyamadığı dilde takılı kalmasın).
  - Dev modunda İngilizce açıkken çevirisi bulunmayan yazılar `window.__i18nMissing`'de toplanıyor; yeni metin eklerken `en.ts`'e satır eklemek yeterli (CLAUDE.md §10'a not düşüldü).
- **Gizlilik politikası:** `assets/privacy.html` → https://samiboran.github.io/platform-football/privacy.html — TR + EN: kişisel veri yok, reklam/analiz yok, ilerleme ve ayarlar sadece cihazda (localStorage), izinler (internet, titreşim), çocuklar, iletişim (şimdilik GitHub Issues).
- **Doğrulama (Playwright, geçici hook kaldırıldı):** İngilizce modda menü, karakterler, ekipman, ayarlar, saha seçimi, lig, maç (normal + lig + eğitim), duraklatma, 3 sonuç ekranı (lig aşaması, yenilgi, şampiyonluk) gezildi — çevrilmemiş yazı listesinde yalnızca isimler/takım kodları/LV kaldı; ekran görüntülerinde taşan yazı yok. Kesit/gol/çıkış diyaloğu metinleri ayrıca kontrol edildi. en-US tarayıcı → İngilizce, tr-TR → Türkçe açıldı; Ayarlar'da DİL iki yönde çalıştı ve kaydedildi. Konsol hatası yok, build temiz.
- **Kalan (M9):** denge turu (gerçek oyuncu geri bildirimi gerekiyor); M9.3'te data safety formu metni, mağaza görselleri/açıklamaları, isim kontrolü, sürüm numaralama.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri, Arjantin/Kenya kararı; Google Play hesabı (25 $), IARC/hedef kitle beyanı; gizlilik sayfasına e-posta eklemek isterse; İngilizce metinlerin tonu (`src/i18n/en.ts`).
- **Bilinen:** Android'de titreşim için manifestte `VIBRATE` izni yok (WebView `navigator.vibrate` sessizce çalışmayabilir) — gerçek cihazda bakılmalı. Mağaza sayfası metinleri (TR/EN) henüz yok.

## Oturum 56 — M9.3: Data safety cevapları + mağaza sayfası (20.11.2026, zamanlanmış)
- **Data safety** (`docs/store/DATA_SAFETY.md`): Play Console formunun cevapları — "kullanıcı verisi toplanıyor/paylaşılıyor mu?" **Hayır** (kodda kontrol: ağ isteği/SDK yok, her şey cihazda `localStorage`). İzin tablosu, reklam/uygulama erişimi beyanları ve hata raporlama / satın alma / online gelince formun nasıl değişeceği listelendi.
- **Mağaza sayfası** (`docs/store/`): `icon-512.png`; TR ve EN için 1920×1080 **5 ekran görüntüsü** (power şut şarjı + nişan çizgisi, portre kesiti, ana menü, lig, saha seçimi) ve **1024×500 tanıtım görseli** (bulanık saha + Tiago/Kiala portreleri + oyunun kendi piksel fontuyla başlık). `LISTING.md`: kısa (≤80) ve uzun açıklama TR/EN, kategori, gizlilik URL'si.
  - Üretim araçları: `tools/store/capture.cjs` (dev sunucusunda maçı sürüp dokunmatik cihaz gibi ekran alıyor) ve `tools/store/feature_graphic.py`. Bunun için `src/main.ts`'e **sadece dev'de** çalışan `window.__game` kancası eklendi (prod paketinde yok, kontrol edildi).
- **Android:** manifeste `VIBRATE` izni eklendi (önceki oturumun bilinen sorunu — WebView'da titreşim için gerekli).
- **Doğrulama:** ekran görüntülerine ve tanıtım görseline bakıldı (TR/EN çeviriler doğru, PC tuş satırı yok, taşma yok); kısa açıklama uzunlukları 75/78, uzun açıklamalar ~1300/1400 karakter. `npm run build` temiz, prod paketinde `__game` yok, prod sayfası konsol hatasız açıldı.
- **Kalan (M9):** isim/marka kontrolü, sürüm numaralama (versionName/versionCode) — sıradaki; denge turu (gerçek oyuncu geri bildirimi gerekiyor).
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri, Arjantin/Kenya kararı; Google Play hesabı (25 $), kapalı test (12 kişi/14 gün), IARC/hedef kitle beyanı, Play Console'a formları/metinleri girmek, iletişim e-postası. **Yeni:** oyundaki "Sokak Dünya Kupası" adı — "World Cup" FIFA markası; mağaza metinleri ve tanıtım görselinde bilerek "sokak turnuvası / 1V1 street football" kullanıldı, oyun içi ad değişsin mi?
- **Bilinen:** Maç ekran görüntülerinde skor 0-1 (AI, script topa yürürken gol attı; kozmetik — istenirse yeniden alınır). Ana menüde dokunmatik tarayıcıda "TAM" (tam ekran) düğmesi görünüyor; mağaza görüntüsünde de var.

## Oturum 57 — M9.3: Sürüm numaralama + isim/marka kontrolü (20.11.2026, zamanlanmış)
- **Sürüm** (`src/config/version.ts`, `docs/store/VERSIONING.md`): tek kaynak `package.json` `version` (şu an 0.1.0). `android/app/build.gradle` package.json'u okuyup `versionName` = semver, `versionCode` = MAJOR·10000 + MINOR·100 + PATCH (0.1.0 → 100) yapıyor — elle yazılan "1.0"/1 kalktı. Vite `__APP_VERSION__` ile oyuna da gidiyor: Ayarlar ekranının sağ alt köşesinde soluk **V0.1.0**.
- **Sürüm notları:** `docs/store/release-notes/<sürüm>.md` (`## tr-TR` / `## en-US`, Play sınırı 500 karakter). İlk not 0.1.0 (kapalı test) yazıldı. `npm run release:check` sürümün şemaya uyduğunu ve notun TR/EN olup sınırı aşmadığını kontrol ediyor (281/313 karakter).
- **İsim/marka** (`docs/store/NAME_CHECK.md`): "Platform Football" için Play/web aramasında çakışan oyun/marka bulunmadı. Kod + grafik taraması: gerçek oyuncu, kulüp, arma, bayrak, ekipman markası yok; kupa ikonu genel bir kupa. Tek açık konu FIFA markası "Dünya Kupası/World Cup" → ROADMAP'e ayrı **(Sami)** maddesi olarak eklendi, 3 isim önerisi dosyada.
- **Doğrulama:** `npm run build` temiz, `release:check` OK; Playwright ile Ayarlar ekranı TR ve EN açıldı, sürüm etiketi iki dilde de `V0.1.0` (İngilizce sayı biçimi bozmuyor), konsol hatası yok. Gradle değişikliği Actions'taki Android debug APK işinde doğrulanıyor.
- **Kalan (M9, Claude'un yapabileceği):** yok — denge turu gerçek oyuncu geri bildirimi bekliyor; kalan her şey Sami'de.
- **Sami bekliyor:** keystore + GitHub Secrets (imzalı AAB), hata raporlama servisi, gerçek telefonda 60 FPS testi; altın/elmas harcama yeri, Arjantin/Kenya kararı; Google Play hesabı (25 $), kapalı test (12 kişi/14 gün), IARC/hedef kitle beyanı; **lig adı "Sokak Dünya Kupası" değişsin mi**; Play'e ilk yüklemede sürüm 0.1.0 mı yoksa başka bir numara mı.
- **Bilinen:** versionCode şemasında MINOR/PATCH 100'ü geçemez (script hata verir).

## Oturum 58 — (20.11.2026, zamanlanmış) Claude'un yapabileceği M9 maddesi kalmadı; iş yapılmadı, kalanlar Sami/gerçek oyuncu geri bildirimi bekliyor (bkz. Oturum 57).

## Oturum 59 — (20.11.2026, zamanlanmış) Yine Claude'un yapabileceği M9 maddesi yok; değişiklik yapılmadı, kalanlar Sami'yi bekliyor (bkz. Oturum 57).

## Oturum 60 — (21.11.2026, zamanlanmış) Claude'un yapabileceği M9 maddesi yok; değişiklik yapılmadı, kalanlar Sami'yi bekliyor (bkz. Oturum 57).

## Oturum 61 — (21.11.2026, zamanlanmış) Claude'un yapabileceği M9 maddesi yok; değişiklik yapılmadı, kalanlar Sami'yi bekliyor (bkz. Oturum 57).
