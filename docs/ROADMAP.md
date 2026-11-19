# ROADMAP — Platform Football

Kaynak: `CLAUDE.md` bölüm 8. Sırayla git, bir milestone bitmeden sonrakine geçme.

## M0 — İskelet
- [x] Vite + Phaser 3 + TypeScript projesi kur
- [x] Sahne yapısı: Boot / Menu / Match / Result
- [x] `src/config/arena.ts` ile ölçü sabitleri
- [x] Placeholder saha, iki kale, orta çizgi, sabit kamera
- [x] GitHub Pages deploy pipeline'ı kur (`.github/workflows/deploy.yml`)
- [x] **İlk deploy'u yap** — https://samiboran.github.io/platform-football/

**Doğrulama:** Build hatasız geçiyor ✅. Deploy edilen linkte saha ve iki kale görünüyor mü — Sami'nin kendi tarayıcısında teyit etmesi lazım (bu sandbox github.io'ya erişemiyor).

## M1 — Hareket
- [x] Joystick: x ekseni + z (derinlik) hareketi (+ klavye ok tuşları PC için)
- [x] Low gravity zıplama (y ekseni)
- [x] Gölge sistemi (karakter kısmı — top M2'de eklenecek, sistem zaten top için de kullanılabilir)
- [x] Depth sort (z'ye göre render sırası)
- [x] Orta çizgi ve saha kenarı sınırları

**Doğrulama:** ✅ Karakter dört yöne gidiyor, zıplıyor, gölge yerde doğru yerde duruyor (y'yi takip etmiyor, küçülüp soluyor), orta çizgiyi ve touchline'ları geçemiyor, arkadaki karakter öndekinin arkasında çiziliyor — hepsi Playwright ile ekran görüntüleriyle doğrulandı.

## M2 — Top
- [x] Top fiziği: yerçekimi, yerden sekme, sürtünme
- [x] Duvardan sekme (touchline'lar)
- [x] Karakter-top teması, z toleranslı hitbox (ilk sürüm: basit "dribble nudge" — Oturum 19'da gerçek kuvvet-tabanlı dribble control sistemine değişti, bkz. docs/PROGRESS.md)
- [x] Gol algılama, skor, maç süresi, ResultScene

**Doğrulama:** ✅ Top gerçekçi sekiyor (yerçekimi + restitution ile sekip yavaşlıyor), kaleye girince gol sayılıyor (her iki kale de test edildi), skor tablosu ve geri sayan süre çalışıyor, süre bitince (veya "Bitir" ile) ResultScene'de son skor gösteriliyor — Playwright ile uçtan uca doğrulandı, konsol hatası yok.

## M3 — Aksiyon ve power
- [x] Bağlamsal Aksiyon tuşu (top bizdeyse şut, değilse tut — Oturum 17'de insanın kendi tutma girdisi de eklendi, aşağıya bakın)
- [x] Joystick yönünden şut yönü (Aksiyon'a basıldığı andaki son joystick yönü, nötrse karakterin baktığı yön)
- [x] Dash (4 yön, yerde ve havada, joystick boşken bakılan yöne)
- [x] 3 segmentli power barı + UI (sol alt)
- [x] Power şut / power tutuş matrisi
- [x] Dash'in power tüketimi (yerde ~%25, havada ~%35)
- [x] Tutma cooldown'u ve dinamik tutma şansı (top hızına göre düşüyor)

**Doğrulama:** ✅ Matristeki dört hücre de (Power şut+Power tutuş→tutar, Power şut+Normal tutuş→tutamaz, Normal şut+Power tutuş→tutar/boşa gider, Normal şut+Normal tutuş→hıza bağlı şans) Playwright ile deterministik olarak (Math.random override) test edildi, hepsi doğru sonuç verdi. Dash'in yerde/havada farklı power maliyeti ve power şutun hız çarpanı da ayrıca doğrulandı. Power barı UI'da doğru doluyor/boşalıyor.

**Kapsam notu (güncel, Oturum 17):** İlk sürümde sağ kaleye ayrı bir AI kaleci karakteri eklenmişti (`AIKeeper.ts`), sonra sol kaleye de bir tane. Sami bunu test edip "kalede duran adamlar" şeklinde iki kez şikayet etti ve top zaman zaman o duran karakterle sıkışıyordu. **Kaldırıldı** — artık CLAUDE.md'nin orijinal tasarımına birebir dönüldü: ayrı bir kaleci yok, her taraf kendi kalesini AYNI oyuncu/rakip karakteriyle, bağlamsal Aksiyon'la (topsuzken tut) savunuyor. Bkz. M5.

**Kapsam notu (güncel, Oturum 19):** Özellik tuşunun süper hareketi anlık basışta tetiklemesi power şut/tutuş kombosunu imkansız kılıyordu (Özel'e basar basmaz süper fırlıyor, Aksiyon'a sıra gelmiyordu) — düzeltildi: süper artık Özel bırakıldığında, sadece o basılı tutuş boyunca Aksiyon'a hiç basılmamışsa tetikleniyor. Ayrıca top artık tam bir "dribble control" sistemiyle sürülüyor (top asla oyuncunun konumuna kilitlenmiyor, kuvvet/lerp ile sürükleniyor) — bkz. docs/PROGRESS.md Oturum 19.

## M4 — Karakterler
- [x] 4 karakterin veri tanımı (`src/config/characters.ts`): hız, güç, şut gücü, tutma şansı, cooldown
- [x] Karakter seçim ekranı
- [x] Her karakterin özel hareketi (3 segment süper): Brezilya (capoeira ters vuruş — bakılan yöne ham güç), Arjantin (gambeta — garanti isabetli, kaleye kilitli kontrollü şut), Kenya (poşet top — zayıf ama çok kaotik sapma), Kongo (ritimli zamanlama — doğru anda basınca bonus hız, ÖZEL tuşu o an yeşil parlıyor)
- [x] Gerçek karakter sprite'ları (`assets/characters/<id>/{front,back,left,right,slide,jump}.png`) — Sami Midjourney ile üretti, Claude Code arka planı temizleyip (rembg/U2Net) oyuna bağladı. Yön (front/back/left/right) ve poz (slide=Dash, jump=zıplama) artık gerçek sanat, placeholder kafa+gövde silueti sadece F1 debug referans karakterinde kaldı.
- [x] İlk denge ayarı (arketipe göre hız/güç/şut gücü/tutma/cooldown çarpanları)

**Doğrulama:** ✅ Dört karakter de seçilip oynanabiliyor, hız/güç istatistikleri gerçekten hareket ve top temasına yansıyor (kod düzeyinde doğrulandı). 4 süper hareketin dördü de Playwright ile ayrı ayrı tetiklenip beklenen hız formülü, tam bar tüketimi ve (yetersiz bar varken) no-op davranışı doğrulandı; Kenya'nın ekstra kaos genliği ve Kongo'nun on-beat bonusu + ÖZEL tuşunun ritim penceresinde yeşile dönmesi ayrıca doğrulandı. Süper şutlar artık AI kaleciye karşı bile bir committed power tutuşu %50 ihtimalle geçebiliyor (CLAUDE.md: "özel şuta karşı düşer") — deterministik test edildi. Gerçek sprite'ların 4 yönü ve 2 pozu (jump/slide) Playwright ile deterministik doğrulandı — doğru texture, doğru anda değişiyor. "İstatistik farkları hissediliyor / kimse ezmiyor" kısmı gerçek oynanış testi gerektiriyor — Sami'nin geri bildirimini bekliyor.

## M5 — Kabuk
- [x] Ana menü (M0'dan beri var), saha seçimi
- [x] 4 saha, veri tabanlı mekanik etkiler (top sekme/sürtünme çarpanı, rüzgar; "dar alan hissi" oyuncu hız çarpanıyla temsil ediliyor — saha geometrisini maça göre değiştirmek çok daha büyük bir iş olurdu) — Oturum 20'de görsel tarafı da gerçek hale geldi: her sahanın kendi zemin rengi var (kum/toprak/toprak/sokak), Kenya'da ayrıca çamur lekesi görseli
- [x] Gerçek AI rakip (`src/entities/AIOpponent.ts`): sağ yarı sahada dolaşan, topu kovalayan, dribbling yapan/şut çeken bilgisayar oyuncusu — karakterini insanın seçiminden farklı rastgele bir karakterden alıyor. Kendi kalesini de kendisi savunuyor (ayrı bir kaleci yok, aşağıdaki doğrulamaya bakın). Oturum 20'de insana daha az "güdümlü/omniscient" hissettirmesi için top takibine gecikme ve tutma kararına reaksiyon süresi eklendi.
- [x] İnsanın kendi "tut" input'u: Aksiyon topa dokunmadan basılırsa ve gerçek bir şut kendi kalesine geliyorsa (`ball.lastTouchWasShot`, hedefte, menzilde) tutma denemesi yapılıyor — Özellik'le birlikte basılırsa ve bar varsa power tutuş.
- [ ] Lig/hikaye akışı: mahalle → şehir → kıta → dünya finali — gerçek rakip artık var, ama lig/kademe yapısı (farklı zorluk/karakter havuzları, ilerleme) henüz kurulmadı
- [x] Ses efektleri (sentezlenmiş: şut/gol/düdük), seyirci tepkileri (tribünde placeholder noktalar, golde zıplayıp parlıyor) — sürekli kalabalık gürültüsü (sessizlik→uğultu→tezahürat) henüz yok
- [x] Mobil dokunmatik kontrollerin son ayarı — çoklu dokunuş açığı bulunup düzeltildi (`input.activePointers`), joystick+zıpla artık aynı anda çalışıyor

**Doğrulama:** ✅ AI rakip kendi yarı sahasında topu kovalıyor, karşı yarıya geçmiyor, top elindeyken dribbling/şut arasında karar veriyor. Artık ne insanın ne rakibin kalesinde duran ayrı bir "kaleci" var — ekranda sadece 2 karakter (Sami'nin şikayetinin doğrudan çözümü). Matrisin 4 hücresi de (bu sefer insanın kendi Aksiyon'undan ve rakibin otomatik savunmasından) deterministik test edildi: power+power tutar, power+normal tutamaz, normal+normal hıza göre şans, yetersiz power'da power tutuş denemesi otomatik normale düşüyor. Sıradan dribbling artık hiçbir zaman tutma denemesi tetiklemiyor (regression). Top artık hiçbir yerde sıkışmıyor — bir şut ya gol olur ya tutulur, ortada takılı kalmıyor. Bir ligi baştan sona oynayıp bitirebiliyorum — **henüz değil, lig/kademe yapısı yok, ama artık gerçek bir rakibe karşı tek maç oynanabiliyor**. Telefonda tek elle oynanabiliyor — ✅ çoklu dokunuş doğrulandı (Playwright + gerçek CDP touch simülasyonu).

## M6 — Yeni tasarım (16.11.2026 kararları, CLAUDE.md bölüm 5)
Zamanlanmış ajan bu listeyi yukarıdan aşağı işler. Her oturumda 1–2 madde, build + doğrulama + commit + deploy.

### M6.0 Grafik (pixel art)
- [x] Prosedürel sprite üreticisi (`tools/pixelart/gen_sprites.py`) — Brezilya + Kongo: 4 yön, jump, slide, catch, stunned, kick, 4 karelik koşu
- [x] Top aura sprite'ları (güç 0–3) ve enerji içeceği (`assets/fx/`)
- [x] Kadro 2 karaktere indirildi (`CHARACTER_ORDER`)
- [x] Koşu animasyonu (`run_<dir>_0..3`), `slide_right`, `kick_*`, `catch`, `stunned` pozlarını `Character.ts`'e bağla (BootScene yüklemesi + poz seçimi)
- [x] Topu `ball_power<N>.png` ile çiz, güç seviyesine göre aura
- [x] Saha, tribün ve HUD'u pixel art'a çek (Pixel Cup Soccer havası, `pitchRenderer.ts`)
- [x] Sprite kalitesi ikinci tur: gölgelendirme, koşu karelerinde kol/bacak netliği

### M6.1 Enerji ekonomisi
- [x] Dash: her zaman 1 enerji, 1 sn bekleme (`config/power.ts`)
- [x] Pasif dolum +1 / 5 sn
- [x] Enerji içeceği pickup: 12 sn'de bir, iki sahada ayna konumda, +1 (nadiren altın +2)
- [x] Gol yiyene +1

### M6.2 Şut
- [x] Dokun = normal şut, basılı tut = power shot (tüm enerjiyi harcar), tutarken büyüyen aura
- [x] Lob: joystick geri + şut; yavaş, gölge düşüş noktasını gösterir; zıplayıp kafa/vole ile karşılanır
- [x] AI rakip yeni şut tiplerini kullanır

### M6.3 Tutma ve güç çatışması
- [x] Eski matris yerine fark tablosu (`systems/catchMatrix.ts`): ≤0 tut (+1 geri), 1 tut-sek, 2 düş/sersem + karşıya sek, 3 gol
- [x] Mükemmel parry: ~6 karelik pencere, çatışmada +1, +1 enerji, flaş
- [x] Sersemleme durumu (stunned pozu, 0.6 sn yavaşlama)

### M6.4 His
- [x] Hitstop (4 / 8 / 12 kare), hafif ekran sarsıntısı
- [x] Giriş tamponu ~8 kare (Aksiyon; M6.2 ile öne alındı)
- [x] Power shot öncesi Tsubasa tarzı portre ara geçişi (0.5 sn)
- [x] Gol kutlaması: isim bandı + power gollerinde ağır çekim tekrar

**Doğrulama:** Fark tablosunun 4 satırı da deterministik test edilir. Dash 1 enerji/1 sn kuralı, lob, parry penceresi ve içecek spawn'ı ayrı ayrı doğrulanır. Deploy linki konsol hatasız açılır.

## M7 — Mobil UI/UX (17.11.2026, Sami: "Android oyunu yapıyoruz, yatay ekran, hepsi")
### M7.1 Yatay ekran + tam ekran
- [x] Dikey tutunca "telefonu yan çevir" uyarısı
- [x] İlk dokunuşta tam ekran + yatay kilit (Android Chrome), menüde tam ekran düğmesi
- [x] Ana ekrana eklenebilir uygulama (manifest, ikon, `display: fullscreen`, `orientation: landscape`)

### M7.2 Maç içi HUD
- [x] Enerji barı başparmağın kapatmadığı yere (üst sol), daha büyük
- [x] Dokunmatik cihazda klavye/alt yazılar gizli
- [x] "BİTİR (TEST)" yerine duraklat menüsü (Devam / Yeniden / Ana menü)

### M7.3 Dokunmatik kontroller
- [x] Aksiyon basılı tutulurken güç dolum halkası (element renginde)
- [x] Kullanılamayan tuş soluk (dash: enerji yok / bekleme; özel: 3 enerji yok)
- [x] Titreşim: şut, power, çatışma, gol

### M7.4 Menü akışı
- [x] Ana menü, karakter ve saha seçimi pixel font + büyük dokunmatik kartlar
- [x] Kartta element, özel hareket ve istatistik çubukları

## M8 — Ana menü ve gelişim (17.11.2026, Sami: Kafa Topu tarzı menü, "pixel modern")
- [x] Hub: üstte hesap seviyesi + altın + elmas, ortada kaide üstünde seçili karakter, KARAKTER / OYNA
- [x] Karakter seviyesi: oynadığın karakter XP kazanır (maç sonu ödül: XP, altın, nadiren elmas)
- [x] Seviyeyle açılan, takılıp çıkarılan özellikler (slot: Lv2'de 1, Lv6'da 2) — oyunda etkili
- [x] Karakter ekranı (liste, seviye, istatistik, özellik tak/çıkar, seç), sonuç ekranında ödüller
- [ ] Altın / elmas harcama yeri (market, karakter açma) — Sami karar verecek
- [ ] ETKİNLİK / TAKIM / SOSYAL gibi diğer hub düğmeleri

---

## Yayın durumu — 17.11.2026 değerlendirmesi
**Kısa cevap: Play Store'a çıkmaya henüz hazır değil; arkadaşlara APK olarak test ettirmeye hazır.**
Oynanış çekirdeği (hareket, şut/tut/çatışma, enerji, kombolar, AI, gelişim, mobil kontroller) sağlam. Eksikler oyunun kendisinden çok "etrafındaki" şeyler: internetsiz çalışma, Android paketi, gerçek ses, eğitim, ayarlar, mağaza/yasal zorunluluklar ve hiç olmayan sunucu tarafı.
Etiketler: **(Sami)** = senin kararın, **(₺)** = ücretli servis/hesap, **(şart)** = yayın için zorunlu.

## M9 — Telefon yayını hazırlığı (sunucusuz, tek oyunculu v1)
### M9.1 Teknik paket
- [x] İnternetsiz çalışma: service worker + önbellek, sürüm güncellenince yeni dosyaları alma
- [x] Android paketi: Capacitor ile sarma, paket adı (ör. `com.samiboran.platformfootball`), **targetSdk 36** (Play'in Ağustos 2026 kuralı) **(şart)**
- [ ] GitHub Actions'ta otomatik APK/AAB üretimi; imza anahtarı (keystore) GitHub Secrets'ta, yedeği Sami'de **(şart)** — imzasız debug APK CI'ı hazır (`android.yml`), imzalı AAB keystore bekliyor (Sami)
- [x] Android geri tuşu: maçta duraklat, menüde bir önceki ekran, ana menüde "çıkılsın mı?"
- [x] Uygulama arka plana gidince maçı duraklat, sesi kapat (`visibilitychange` / Capacitor `appStateChange`)
- [x] Çentik/kenar güvenli alanı (safe-area): HUD ve tuşlar kamera deliğinin altına girmesin
- [x] Yükleme ekranı (Boot'ta ilerleme çubuğu), ilk açılış süresi ölçümü
- [ ] Gerçek orta seviye Android'de 60 FPS testi, gerekirse efekt kalitesi ayarı
- [x] Kayıt sürümleme: profil şeması değişince eski kaydı taşıma (`pf.profile.v1` → v2)
- [ ] Hata/çökme raporlama (Sentry ücretsiz katman ya da Firebase Crashlytics) **(Sami)**

### M9.2 İçerik ve cila
- [x] Gerçek ses efektleri + menü/maç müziği (lisanssız/üretilmiş), seyirci sesi
- [x] Ayarlar ekranı: ses, müzik, titreşim aç/kapa, tuş boyutu/şeffaflığı, sol-sağ el düzeni, dil — dil satırı TÜRKÇE'de sabit, EN aşağıdaki "Dil" maddesiyle açılacak
- [x] İlk açılışta eğitim: hareket, şut/power, tut/parry, lob, falso, rövaşata (adım adım mini görevler) — 9 adım, Ayarlar > EĞİTİM ile tekrar
- [ ] AI zorluk seviyeleri (kolay/orta/zor) + AI'ın falso ve rövaşata kullanması (BACKLOG)
- [ ] Lig/hikaye modu (M5'ten açık kalan): mahalle → şehir → kıta → dünya finali
- [ ] Altın/elmasın harcanacağı yer: karakter açma, kostüm/forma, top efekti **(Sami)**
- [ ] Arjantin ve Kenya'yı açmak (sprite + denge) — v1 için şart değil **(Sami)**
- [ ] Dil: Türkçe + İngilizce (metinleri tek dosyada topla)
- [ ] Denge turu: XP eğrisi, özellikler, AI, lob/falso gücü (gerçek oyunculardan geri bildirimle)

### M9.3 Mağaza ve yasal (Google Play)
- [ ] Google Play geliştirici hesabı (tek seferlik 25 $) **(₺)(Sami)(şart)**
- [ ] Yeni kişisel hesaplarda **kapalı test: en az 12 test kullanıcısı, 14 gün kesintisiz** — sonra üretime başvuru **(şart)**
- [ ] Gizlilik politikası sayfası (GitHub Pages'te barındırılabilir) **(şart)**
- [ ] Data safety (veri güvenliği) formu: hangi veri toplanıyor (sunucusuz v1'de neredeyse hiç) **(şart)**
- [ ] İçerik derecelendirme (IARC anketi) ve hedef kitle beyanı — çocuklara yönelik seçilirse Aileler politikası devreye girer **(şart)(Sami)**
- [ ] Mağaza sayfası: 512×512 ikon, 1024×500 tanıtım görseli, en az 2 ekran görüntüsü, kısa/uzun açıklama (TR/EN) **(şart)**
- [ ] İsim/marka kontrolü ("Platform Football"), gerçek oyuncu/kulüp adı ve logosu kullanmama
- [ ] Sürüm numaralama (versionName / versionCode) ve sürüm notları düzeni
- [ ] (İleride) iOS: Apple Developer hesabı yıllık 99 $, Mac/Xcode gerekir **(₺)(Sami)**

## M10 — Arka plan (backend) altyapısı
### M10.1 Oyun mantığını ekrandan ayırma (her online yolun ön şartı)
- [ ] `src/sim/`: Phaser'sız saf TypeScript maç simülasyonu (karakter, top, çatışma, enerji, kombolar)
- [ ] Sabit adımlı döngü (60 Hz), girdiye dayalı (her karede iki oyuncunun tuşları)
- [ ] Tohumlu rastgele sayı üretici (`Math.random` yerine) — şu an 8 dosyada `Math.random` var
- [ ] Phaser sahnesi sadece çizer ve ses/efekt oynatır; cut-in/hitstop/gol olayları simülasyondan olay olarak gelir
- [ ] Birim testleri (Vitest): fark tablosu, parry, dash kuralı, falso, ödüller; CI'da çalışsın
- [ ] Maç tekrar kaydı (girdi dizisi) — hata ayıklama ve ileride paylaşma için

### M10.2 Hesap ve bulut kayıt
- [ ] Supabase projesi: misafir (anonim) giriş, sonra Google ile bağlama **(Sami)**
- [ ] `profiles` tablosu: altın, elmas, XP, karakter seviyeleri, özellikler; Row Level Security
- [ ] Telefondaki kaydı buluta taşıma ve cihazlar arası senkron (çakışma kuralı: sunucu kazanır)
- [ ] Ödüller sunucuda hesaplansın (Edge Function maç sonucunu doğrular) — altın/elmas hilesine karşı
- [ ] Kullanıcı adı + küfür/uygunsuz isim filtresi
- [ ] **Hesap silme:** uygulama içinden ve web'den hesap + veri silme isteği (Play, hesap açılan uygulamalarda zorunlu tutuyor) **(şart)**
- [ ] KVKK/GDPR aydınlatma metni, gizlilik politikasının güncellenmesi **(şart)**

### M10.3 Online maç
- [ ] Mimari kararı: (A) sunucu-otoriteli Colyseus (Fly.io/Railway, ~5 $/ay) / (B) telefon-telefon WebRTC + Supabase eşleştirme / (C) rollback **(Sami)(₺ A için)**
- [ ] Oda kodu ile arkadaş maçı (ilk prototip)
- [ ] Ağ kodu: kendi karakterinde istemci tahmini, rakip ve top için ara değerleme, sunucu düzeltmesi; cut-in/hitstop/gol olayları senkron
- [ ] Ping göstergesi, bağlantı kopunca yeniden bağlanma, süre dolarsa hükmen kaybetme kuralı
- [ ] Rastgele rakip eşleştirme kuyruğu + kupa/MMR puanı, yakın seviyeyle eşleştirme
- [ ] Sunucu bölgesi (Avrupa / İstanbul'a yakın), gecikme ölçümü
- [ ] Hile koruması: girdi doğrulama, hız sınırı, imkânsız hareket tespiti
- [ ] Online maçta AI'ın yerine bot (eşleşme bulunamazsa)

### M10.4 Canlı işletme (live ops)
- [ ] Analitik: maç süresi, karakter başına kazanma oranı, ilk gün/7. gün geri dönüş — gizlilik uyumlu **(Sami)**
- [ ] Uzaktan ayar (remote config): denge değerlerini güncelleme çıkarmadan değiştirme
- [ ] Sıralama tablosu, sezonlar, ETKİNLİK düğmesi için haftalık görevler
- [ ] Bildirimler (izinli, ileride)
- [ ] Şikâyet/raporlama, banlama aracı
- [ ] Sunucu izleme, yedekleme, maliyet alarmı **(₺)**

### M10.5 Para kazanma (karar bekliyor)
- [ ] Model: tamamen ücretsiz / reklam / uygulama içi satın alma (elmas) / tek seferlik ücret **(Sami)**
- [ ] Satın alma varsa Google Play Billing + sunucuda makbuz doğrulama **(₺ Play %15–30 komisyon)**
- [ ] Reklam varsa: rıza ekranı (GDPR/KVKK, Google UMP), ödüllü reklam yerleri, Data safety güncellemesi
