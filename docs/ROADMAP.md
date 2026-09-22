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
- [ ] Joystick: x ekseni + z (derinlik) hareketi
- [ ] Low gravity zıplama (y ekseni)
- [ ] Gölge sistemi (karakter + top)
- [ ] Depth sort (z'ye göre render sırası)
- [ ] Orta çizgi ve saha kenarı sınırları

**Doğrulama:** Karakter dört yöne gidiyor, zıplıyor, gölge yerde doğru yerde duruyor, orta çizgiyi geçemiyor, arkadaki karakter öndekinin arkasında çiziliyor.

## M2 — Top
- [ ] Top fiziği: yerçekimi, yerden sekme, sürtünme
- [ ] Duvardan sekme
- [ ] Karakter-top teması, z toleranslı hitbox
- [ ] Gol algılama, skor, maç süresi, ResultScene

**Doğrulama:** Top gerçekçi sekiyor, kaleye girince gol sayılıyor, skor ve süre çalışıyor, maç bitince sonuç ekranı geliyor.

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
- [ ] 4 karakterin veri tanımı (`src/config/characters.ts`): hız, güç, şut gücü, tutma şansı, cooldown
- [ ] Karakter seçim ekranı
- [ ] Her karakterin özel hareketi (3 segment süper)
- [ ] Asset klasör yapısı + placeholder sprite'lar
- [ ] İlk denge ayarı

**Doğrulama:** Dört karakter de seçilip oynanabiliyor, istatistik farkları hissediliyor, hiçbiri açıkça diğerlerini eziyor değil.

## M5 — Kabuk
- [ ] Ana menü, saha seçimi
- [ ] 4 saha, veri tabanlı mekanik etkiler
- [ ] Lig/hikaye akışı: mahalle → şehir → kıta → dünya finali
- [ ] Ses efektleri, seyirci tepkileri
- [ ] Mobil dokunmatik kontrollerin son ayarı

**Doğrulama:** Bir ligi baştan sona oynayıp bitirebiliyorum. Telefonda tek elle oynanabiliyor.
