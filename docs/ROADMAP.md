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
