# CLAUDE.md — Platform Football (2D arcade futbol)

Bu dosya Claude Code için kalıcı bağlamdır. Her oturumda önce bunu oku.

Bu projenin kökü, bu CLAUDE.md'nin bulunduğu klasördür (`platform-football/`).
Tüm yollar (`src/`, `docs/`, `package.json`) bu klasöre göredir. Bu klasör
`Botan/` reposunun **yanında**, ondan bağımsız ayrı bir git reposudur —
Botan'daki DragonKick projesine dokunma.

---

## 0. Yetki ve çalışma şekli

- **Bana sormadan ilerle.** Adım adım onay isteme. Bir adımı bitir, kendin doğrula, commit et, sıradakine geç.
- **Deploy senin sorumluluğunda.** Her milestone sonunda build alıp GitHub Pages'e deploy et ve çalışan linki bildir.
- Sadece şu durumlarda dur ve sor: (a) ROADMAP dışında büyük bir tasarım kararı gerekiyorsa, (b) ücretli servis/hesap gerekiyorsa, (c) mevcut çalışan bir özelliği bozmadan ilerlemek mümkün değilse.
- Her oturumun sonunda `docs/ROADMAP.md` içindeki kutuları güncelle ve `docs/PROGRESS.md`'ye kısa bir oturum notu düş (ne yapıldı, ne kaldı, bilinen bug).
- Yorumları ve commit mesajlarını İngilizce yaz, bana verdiğin özetleri Türkçe yaz.

---

## 1. Oyun nedir

1v1 gerçek zamanlı arcade futbol. "Kafa Topu" mantığı, ama sahada derinlik ekseni de var.

- Ekranda **iki kale aynı anda** görünür. Kamera tamamen sabit, zoom yok, kaydırma yok.
- Orta çizgi **geçilemez**. Her oyuncu kendi yarısında kalır. Sadece top iki tarafa geçer.
- Kale = her iki tarafta arka duvar bölgesi.
- Maç süresi 2-3 dakika.
- Hedef platform: Android + PC (web build üzerinden).

**Görsel referans:** Pixel Cup Soccer (Batovi Games Studio) — retro pixel art.
**Oynanış hissi referansı:** Super Smash Bros — karakter yeteneği odaklı, refleks tabanlı.

---

## 2. Teknik yığın

- **Phaser 3 + TypeScript + Vite**
- Fizik: Arcade Physics (derinlik ekseni manuel yönetilecek, aşağıya bak)
- Deploy: **GitHub Pages**, `gh-pages` branch veya GitHub Actions ile
- Paket yöneticisi: npm
- Sahneler: `BootScene` → `MenuScene` → `MatchScene` → `ResultScene`

---

## 3. Arena ve ölçek (KRİTİK)

Referans görsellerde iki farklı şey var ve ikisini birleştiriyoruz:
- Kadraj birinci görselden: tek ekranda iki kale.
- Ölçek ikinci görselden: karakterler büyük ve yakın.

Bunu sağlamak için saha gerçek futbol sahası oranında **değil**, kısa bir arenadır:

| Şey | Değer |
|---|---|
| Oyun alanı | 960 x 540 (16:9 mantıksal çözünürlük) |
| Karakter boyu | Ekran yüksekliğinin %12-15'i (≈ 70px) |
| Yarı saha genişliği | ≈ 4-5 karakter genişliği |
| Derinlik bandı (yukarı-aşağı) | ≈ 3 karakter boyu |
| Kale genişliği (derinlikte) | Derinlik bandının ≈ %50'si |

Bu sayıları `src/config/arena.ts` içinde **tek bir yerde** tut, sahneler oradan okusun. Denge ayarı için bunları değiştirebilmem lazım.

### Derinlik (2.5D) mantığı
Üç eksen var: `x` (sağ-sol), `z` (saha derinliği, yukarı-aşağı), `y` (zıplama yüksekliği).

- Ekrandaki çizim pozisyonu: `screenY = baseY - z * depthScale - y`
- **Gölge zorunludur.** Hem top hem karakterler için. Gölge `z` düzlemine çizilir, `y` yüksekliğine göre küçülür/soluklaşır. Gölge olmadan oyun oynanamaz, bunu atlama.
- Derinlikte `z` sıralamasına göre render sırası (depth sort) uygula, arkadaki karakter öndekinin arkasında kalsın.
- Temas kontrolünde `z` toleransı yatay toleranstan geniş olsun, yoksa oyun sinir bozucu olur.

---

## 4. Kontroller

Sanal joystick (sol) + 4 tuş (sağ):

| Tuş | İşlev |
|---|---|
| **Aksiyon** | Top bizdeyse **şut**, değilse **tut** (bağlamsal) |
| **Zıpla** | Low gravity zıplama |
| **Dash** | Joystick yönüne dash, 4 yön (derinlik dahil), havada da çalışır |
| **Özellik** | Tek basış: süper hareket (3 segment). Aksiyon'la birlikte: power şut / power tutuş |

- Joystick boşken Dash'e basılırsa karakterin baktığı yöne dash atar.
- Şut yönü, Aksiyon'a basıldığı andaki joystick yönünden gelir (kaba yönler, serbest nişan yok).
- Yanlış yön veya kötü zamanlama → direk, auta çıkan top, isabetsiz şut. Otomatik kaleye nişan **yok**.
- PC'de klavye eşlemesi de olsun: yön tuşları + Z/X/C/Space gibi.

---

## 5. Power sistemi

3 segmentli bar, oyun boyunca dolar.

- 1 segment = power şut veya power tutuş
- Dash segment harcamaz, bir segmentin ~%25'ini eritir (havada dash biraz daha fazla)
- 3 segment dolu = karakterin süper hareketi

**Şut/tutuş matrisi:**

| Şut | Tutuş | Sonuç |
|---|---|---|
| Normal | Normal | Topun hızına göre şans |
| Power | Normal | Tutamaz, top seker veya gol |
| Power | Power | Tutar |
| Normal | Power | Garanti tutar ama bar boşa gider |

Tutma yeteneği cooldown'lu (örn. 5-8 sn, karaktere göre). Tutma şansı dinamiktir: hızlı topa veya özel şuta karşı düşer.

---

## 6. Karakterler (4 kişi)

Tema: dünyanın farklı yerlerinden sokak çocukları, "Sokak Dünya Kupası"na katılıyor. Özellikler ırk/fizik değil, **o yerin futbol kültüründen** geliyor.

| Karakter | Kimlik | Özellik | Arketip |
|---|---|---|---|
| Brezilya | Favela/plaj çocuğu | Capoeira ters vuruşu, ginga çalımı | Hızlı/elektrik |
| Arjantin | Potrero (toprak arsa) çocuğu | Gambeta, dar alanda top kontrolü | Dengeli |
| Kenya | Topunu poşetten yapan çocuk | Poşet top: havada öngörülemez sapar | Zayıf şut, kaotik |
| Kongo | Kinşasa, sapeur/rumba kültürü | Ritimli zamanlama, doğru anda basınca power bonusu | Güçlü/iri |

Mevcut arketipler (hızlı elektrik, güçlü iri, vurunca alevli, beyzbol sopalı serseri) bu dörtlüye dağıtılabilir. Sopa/taş mekaniği (sahada duran sopa ile topu havalandırma, taş atarak kaleciyi yavaşlatma) **şimdilik ertelendi**, M5'ten sonra.

Sprite pipeline: Adobe Illustrator Turntable ile çok açılı görünüm → pixel art'a dönüştürme. **Sen sprite üretmiyorsun.** M4'e kadar renkli placeholder dikdörtgen/basit sprite kullan, asset yerleşimini `assets/characters/<name>/` yapısına hazırla, ben görselleri sonra koyarım.

---

## 7. Sahalar

Her saha görsel + mekanik olarak farklı:
- Brezilya: kum, top daha az seker
- Arjantin: engebeli toprak, dar alan hissi
- Kenya: toprak saha, rüzgar topu etkiler
- Kongo: müzikli sokak, ritim görsele yansır

Saha etkileri `src/config/stadiums.ts` içinde veri olarak tanımlansın, kod içine gömülmesin.

---

## 8. Yol haritası

Sırayla git. Bir milestone bitmeden sonrakine geçme.

### M0 — İskelet
- [ ] Vite + Phaser 3 + TypeScript projesi kur
- [ ] Sahne yapısı: Boot / Menu / Match / Result
- [ ] `src/config/arena.ts` ile ölçü sabitleri
- [ ] Placeholder saha, iki kale, orta çizgi, sabit kamera
- [ ] GitHub Pages deploy pipeline'ı kur ve **ilk deploy'u yap**

**Doğrulama:** Build hatasız geçiyor, deploy edilen linkte saha ve iki kale görünüyor, ekran hiç kaymıyor.

### M1 — Hareket
- [ ] Joystick: x ekseni + z (derinlik) hareketi
- [ ] Low gravity zıplama (y ekseni)
- [ ] Gölge sistemi (karakter + top)
- [ ] Depth sort (z'ye göre render sırası)
- [ ] Orta çizgi ve saha kenarı sınırları

**Doğrulama:** Karakter dört yöne gidiyor, zıplıyor, gölge yerde doğru yerde duruyor, orta çizgiyi geçemiyor, arkadaki karakter öndekinin arkasında çiziliyor.

### M2 — Top
- [ ] Top fiziği: yerçekimi, yerden sekme, sürtünme
- [ ] Duvardan sekme
- [ ] Karakter-top teması, z toleranslı hitbox
- [ ] Gol algılama, skor, maç süresi, ResultScene

**Doğrulama:** Top gerçekçi sekiyor, kaleye girince gol sayılıyor, skor ve süre çalışıyor, maç bitince sonuç ekranı geliyor.

### M3 — Aksiyon ve power
- [ ] Bağlamsal Aksiyon tuşu (şut / tut)
- [ ] Joystick yönünden şut yönü
- [ ] Dash (4 yön, yerde ve havada)
- [ ] 3 segmentli power barı + UI
- [ ] Power şut / power tutuş matrisi
- [ ] Dash'in power tüketimi
- [ ] Tutma cooldown'u ve dinamik tutma şansı

**Doğrulama:** Matristeki dört durumun dördü de test edilip doğru sonucu veriyor. Power barı doğru doluyor ve harcanıyor.

### M4 — Karakterler
- [ ] 4 karakterin veri tanımı (`src/config/characters.ts`): hız, güç, şut gücü, tutma şansı, cooldown
- [ ] Karakter seçim ekranı
- [ ] Her karakterin özel hareketi (3 segment süper)
- [ ] Asset klasör yapısı + placeholder sprite'lar
- [ ] İlk denge ayarı

**Doğrulama:** Dört karakter de seçilip oynanabiliyor, istatistik farkları hissediliyor, hiçbiri açıkça diğerlerini eziyor değil.

### M5 — Kabuk
- [ ] Ana menü, saha seçimi
- [ ] 4 saha, veri tabanlı mekanik etkiler
- [ ] Lig/hikaye akışı: mahalle → şehir → kıta → dünya finali
- [ ] Ses efektleri, seyirci tepkileri
- [ ] Mobil dokunmatik kontrollerin son ayarı

**Doğrulama:** Bir ligi baştan sona oynayıp bitirebiliyorum. Telefonda tek elle oynanabiliyor.

---

## 9. Her adımda uyacağın döngü

1. `docs/ROADMAP.md`'yi oku, sıradaki bitmemiş maddeyi al.
2. Kodu yaz.
3. `npm run build` çalıştır — hata varsa düzelt, bana sorma.
4. Dev sunucuda kendi kendine test et. Mümkünse o mekanik için küçük bir test veya debug tuşu ekle (örn. F1 hitbox'ları gösterir).
5. Milestone'un doğrulama maddelerini tek tek kontrol et.
6. `docs/ROADMAP.md` kutularını işaretle, `docs/PROGRESS.md`'ye not düş.
7. Commit + push.
8. Milestone bittiyse **deploy et**, linki doğrula (sayfa açılıyor mu, konsol hatası var mı), bana bildir.

---

## 10. Kurallar ve tuzaklar

- **Sihirli sayı yazma.** Tüm ölçü, hız, cooldown, power değerleri config dosyalarında olsun.
- **Gölgeyi atlama.** Derinlik olan bir oyunda gölge olmadan top nerede anlaşılmaz.
- Mobil öncelikli: dokunmatik alanlar yeterince büyük olsun, tuşlar parmağın altında kalmasın.
- Sabit kamera kuralını bozma. Zoom, takip, sarsıntı (hafif screen shake hariç) yok.
- Performans hedefi: orta seviye Android telefonda 60 FPS.
- Her commit çalışır durumda olsun; yarım bırakılmış build kırıcı kod push etme.
- Bir şey ertelendiyse (sopa/taş mekaniği gibi) `docs/BACKLOG.md`'ye yaz, sessizce unutma.

---

## 11. Deploy

- Her milestone sonunda `gh-pages`e deploy.
- Vite `base` ayarını repo adına göre doğru kur, yoksa Pages'te boş sayfa gelir — bu en sık yapılan hata, deploy sonrası linki mutlaka açıp kontrol et.
- Deploy sonrası bana: link + o milestone'da ne eklendiği + bilinen sorunlar.
