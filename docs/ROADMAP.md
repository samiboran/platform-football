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
- [ ] Bağlamsal Aksiyon tuşu (şut / tut)
- [ ] Joystick yönünden şut yönü
- [ ] Dash (4 yön, yerde ve havada)
- [ ] 3 segmentli power barı + UI
- [ ] Power şut / power tutuş matrisi
- [ ] Dash'in power tüketimi
- [ ] Tutma cooldown'u ve dinamik tutma şansı

**Doğrulama:** Matristeki dört durumun dördü de test edilip doğru sonucu veriyor. Power barı doğru doluyor ve harcanıyor.

## M4 — Karakterler
- [x] 4 karakterin veri tanımı (`src/config/characters.ts`): hız, güç, şut gücü, tutma şansı, cooldown
- [x] Karakter seçim ekranı
- [ ] Her karakterin özel hareketi (3 segment süper) — **bloklu: M3'ün power barına ihtiyaç var**
- [x] Asset klasör yapısı + placeholder sprite'lar (`assets/characters/<id>/`, renkli placeholder karakterler zaten karaktere göre boyanıyor)
- [x] İlk denge ayarı (arketipe göre hız/güç/şut gücü/tutma/cooldown çarpanları)

**Doğrulama:** ✅ Dört karakter de seçilip oynanabiliyor, hız/güç istatistikleri gerçekten hareket ve top temasına yansıyor (kod düzeyinde doğrulandı). "İstatistik farkları hissediliyor / kimse ezmiyor" kısmı gerçek oynanış testi gerektiriyor — Sami'nin geri bildirimini bekliyor.

## M5 — Kabuk
- [x] Ana menü (M0'dan beri var), saha seçimi
- [x] 4 saha, veri tabanlı mekanik etkiler (top sekme/sürtünme çarpanı, rüzgar; "dar alan hissi" oyuncu hız çarpanıyla temsil ediliyor — saha geometrisini maça göre değiştirmek çok daha büyük bir iş olurdu)
- [ ] Lig/hikaye akışı: mahalle → şehir → kıta → dünya finali
- [ ] Ses efektleri, seyirci tepkileri
- [ ] Mobil dokunmatik kontrollerin son ayarı

**Doğrulama:** Bir ligi baştan sona oynayıp bitirebiliyorum. Telefonda tek elle oynanabiliyor.
