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
- [x] Karakter-top teması, z toleranslı hitbox (basit "dribble nudge" — gerçek şut/tutuş matrisi M3'te)
- [x] Gol algılama, skor, maç süresi, ResultScene

**Doğrulama:** ✅ Top gerçekçi sekiyor (yerçekimi + restitution ile sekip yavaşlıyor), kaleye girince gol sayılıyor (her iki kale de test edildi), skor tablosu ve geri sayan süre çalışıyor, süre bitince (veya "Bitir" ile) ResultScene'de son skor gösteriliyor — Playwright ile uçtan uca doğrulandı, konsol hatası yok.

## M3 — Aksiyon ve power
- [x] Bağlamsal Aksiyon tuşu (top bizdeyse şut — tutma tarafı, karşı takım/AI kaleci ile sınırlı, aşağıya bakın)
- [x] Joystick yönünden şut yönü (Aksiyon'a basıldığı andaki son joystick yönü, nötrse karakterin baktığı yön)
- [x] Dash (4 yön, yerde ve havada, joystick boşken bakılan yöne)
- [x] 3 segmentli power barı + UI (sol alt)
- [x] Power şut / power tutuş matrisi
- [x] Dash'in power tüketimi (yerde ~%25, havada ~%35)
- [x] Tutma cooldown'u ve dinamik tutma şansı (top hızına göre düşüyor)

**Doğrulama:** ✅ Matristeki dört hücre de (Power şut+Power tutuş→tutar, Power şut+Normal tutuş→tutamaz, Normal şut+Power tutuş→tutar/boşa gider, Normal şut+Normal tutuş→hıza bağlı şans) Playwright ile deterministik olarak (Math.random override) test edildi, hepsi doğru sonuç verdi. Dash'in yerde/havada farklı power maliyeti ve power şutun hız çarpanı da ayrıca doğrulandı. Power barı UI'da doğru doluyor/boşalıyor.

**Kapsam notu:** Henüz ikinci bir insan oyuncu veya gerçek rakip AI yok, bu yüzden matrisi test edilebilir ve maçı oynanabilir kılmak için sağ kaleye basit bir AI kaleci eklendi (`src/entities/AIKeeper.ts`, CLAUDE.md'nin orijinal kapsamı dışında, bilinçli bir tasarım kararı). İnsan oyuncunun "tut" tarafı (kendi kalesini savunması) şu an fiilen kullanılmıyor çünkü kendi kalesine atan bir rakip yok — M3 rakip/AI opponent sistemi eklendiğinde devreye girecek.

## M4 — Karakterler
- [x] 4 karakterin veri tanımı (`src/config/characters.ts`): hız, güç, şut gücü, tutma şansı, cooldown
- [x] Karakter seçim ekranı
- [x] Her karakterin özel hareketi (3 segment süper): Brezilya (capoeira ters vuruş — bakılan yöne ham güç), Arjantin (gambeta — garanti isabetli, kaleye kilitli kontrollü şut), Kenya (poşet top — zayıf ama çok kaotik sapma), Kongo (ritimli zamanlama — doğru anda basınca bonus hız, ÖZEL tuşu o an yeşil parlıyor)
- [x] Asset klasör yapısı + placeholder sprite'lar (`assets/characters/<id>/`, renkli placeholder karakterler zaten karaktere göre boyanıyor)
- [x] İlk denge ayarı (arketipe göre hız/güç/şut gücü/tutma/cooldown çarpanları)

**Doğrulama:** ✅ Dört karakter de seçilip oynanabiliyor, hız/güç istatistikleri gerçekten hareket ve top temasına yansıyor (kod düzeyinde doğrulandı). 4 süper hareketin dördü de Playwright ile ayrı ayrı tetiklenip beklenen hız formülü, tam bar tüketimi ve (yetersiz bar varken) no-op davranışı doğrulandı; Kenya'nın ekstra kaos genliği ve Kongo'nun on-beat bonusu + ÖZEL tuşunun ritim penceresinde yeşile dönmesi ayrıca doğrulandı. Süper şutlar artık AI kaleciye karşı bile bir committed power tutuşu %50 ihtimalle geçebiliyor (CLAUDE.md: "özel şuta karşı düşer") — deterministik test edildi. "İstatistik farkları hissediliyor / kimse ezmiyor" kısmı gerçek oynanış testi gerektiriyor — Sami'nin geri bildirimini bekliyor.

## M5 — Kabuk
- [x] Ana menü (M0'dan beri var), saha seçimi
- [x] 4 saha, veri tabanlı mekanik etkiler (top sekme/sürtünme çarpanı, rüzgar; "dar alan hissi" oyuncu hız çarpanıyla temsil ediliyor — saha geometrisini maça göre değiştirmek çok daha büyük bir iş olurdu)
- [ ] Lig/hikaye akışı: mahalle → şehir → kıta → dünya finali — **bloklu: gerçek bir rakip (AI veya M3) olmadan "lig" anlamlı değil**
- [x] Ses efektleri (sentezlenmiş: şut/gol/düdük), seyirci tepkileri (tribünde placeholder noktalar, golde zıplayıp parlıyor) — sürekli kalabalık gürültüsü (sessizlik→uğultu→tezahürat) henüz yok
- [x] Mobil dokunmatik kontrollerin son ayarı — çoklu dokunuş açığı bulunup düzeltildi (`input.activePointers`), joystick+zıpla artık aynı anda çalışıyor

**Doğrulama:** Bir ligi baştan sona oynayıp bitirebiliyorum — **henüz değil, lig akışı yok**. Telefonda tek elle oynanabiliyor — ✅ çoklu dokunuş doğrulandı (Playwright + gerçek CDP touch simülasyonu).
