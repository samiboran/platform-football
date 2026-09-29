# Karakter Sanat Brief'i — Midjourney için

Bu doküman, `assets/characters/<id>/` klasörlerine gerçek görsel koymak için
Midjourney'e (veya başka bir illüstratöre) verilecek hazır prompt'ları içerir.
CLAUDE.md'nin öngördüğü pipeline: çok açılı/çok pozlu illüstrasyon üret →
sonra pixel art'a çevir → oyuna koy. Bu belge sadece ilk adımı (illüstrasyon
üretimi) kolaylaştırmak için.

**Varsayım:** "Kayma" = oyundaki Dash hareketi (yöne doğru hızlı kayan
hamle), tackle/kapma mekaniği değil — oyunda öyle bir mekanik yok. Yanlışsa
söyle, düzeltirim.

---

## 1. Oyunun görsel çerçevesi (Midjourney'e bunu anlatmak lazım)

- **Kamera açısı:** Sabit, hafif yukarıdan bakan, 3/4 açılı retro futbol
  oyunu kamerası — Sensible Soccer / Kick Off / Pixel Cup Soccer tarzı.
  Karakter tam yandan ya da tam üstten değil, hafif yukarıdan ve hafif
  çapraz görünüyor.
- **Stil:** Pixel Cup Soccer Ultimate Edition referansı — chibi oranlar
  (büyükçe kafa, küçük/tıknaz gövde), kalın siyah outline, düz/parlak renk
  bloklama, az detay (küçük boyutta okunması lazım — oyun içi karakter
  boyu ekranın sadece ~%13'ü kadar). Midjourney'den doğrudan "pixel art"
  istemek yerine **temiz, düz-renkli illüstrasyon/vektör hissi** iste —
  pixelleştirme ayrı bir adımda (Photoshop/Aseprite vb.) yapılacak, Midjourney
  bunu tutarsız/gürültülü pikselli çıkarabiliyor.
- **Arka plan:** Düz beyaz veya düz tek renk — sonradan kesip
  pixelleştirmek/arka planı silmek kolay olsun.
- **Palet:** Her karakterin oyun içi zaten atanmış bir ana rengi var (forma
  rengi gibi düşün), aşağıda her karakterin altında yazıyor. Tutarlılık için
  bu renk illüstrasyonda da ana renk olarak kullanılmalı.

## 2. Ortak poz/açı listesi (4 karakter için de birebir aynı)

İstediğin 3 hareket + oyunun ihtiyacı olan 2 ek poz (gerekmiyorsa atla):

| Poz | Açıklama | Not |
|---|---|---|
| **Duruş (idle)** | Ayakta, hafif hazır duruş, topa bakıyor | *ek önerim* |
| **Koşma** | Koşu pozu, bir bacak önde, kollar hareketde | istediğin |
| **Zıplama** | Havada, bacaklar hafif çekik, kollar dengede | istediğin |
| **Kayma (Dash)** | Yöne doğru eğilmiş, alçak, hızlı kayan/atılan poz | istediğin |
| **Şut** | Bacak geriden öne savrulmuş, topa vuruyor | *ek önerim* |

Her poz için **4 yön** yeterli (önden, arkadan, sol profil, sağ profil) —
sol/sağ birbirinin aynasıdır, tek biri üretilip oyun kodunda çevrilebilir
(Phaser'da `flipX` bedava). 8 yön (çapraz açılar dahil) daha pürüzsüz durur
ama ilk pas için şart değil.

**Tek bir görselde "character sheet" olarak istemek en verimlisi** —
Midjourney'e şöyle bir prompt yapısı işe yarıyor:

```
character reference sheet, [KARAKTER TANIMI], multiple views,
front view, back view, side view, running pose, jumping pose,
sliding pose, chibi proportions, bold black outline, flat colors,
plain white background, consistent character design, full body,
2D game character concept art --ar 16:9 --style raw
```

**Tutarlılık ipucu:** İlk karakteri (Brezilya) üret, beğendiğin görselin
Midjourney linkini `--sref <link>` olarak diğer 3 karakterde de kullan —
4'ü de aynı çizim stilinde çıkar, birbirine hiç benzemeyen 4 farklı tarz
almazsın.

---

## 3. Karakter 1 — Brezilya

**Kimlik (CLAUDE.md bölüm 6):** Favela/plaj çocuğu, hızlı/elektrik
arketip, özel hareketi capoeira ters vuruşu (ginga çalımı).
**Ana renk:** sarı `#F1C40F`.

**Vizyon notu:** Yalın ayak ya da eski/yıpranmış spor ayakkabı, kolej
tişörtü/atlet tarzı basit kıyafet, favela/plaj enerjisi — canlı, dinamik,
esnek duruş (capoeira'nın akışkanlığı hissedilsin). Ten tonu gerçek
Brezilyalı çeşitliliğini yansıtsın (tek bir "placeholder" ten tonuna
sıkışma).

```
character reference sheet, young brazilian favela street football kid,
age 10-12, athletic and flexible build (capoeira-inspired posture),
barefoot or worn sneakers, simple tank top and shorts, bright yellow
(#F1C40F) as primary color accent, multiple views: front view, back view,
side view, running pose, jumping pose, low sliding dash pose, kicking pose,
chibi proportions, bold black outline, flat colors, plain white background,
consistent character design, full body, 2D sports game character concept
art, Pixel Cup Soccer style --ar 16:9 --style raw
```

---

## 4. Karakter 2 — Arjantin

**Kimlik:** Potrero (toprak arsa) çocuğu, dengeli arketip, özel hareketi
gambeta (dar alanda top kontrolü).
**Ana renk:** açık mavi `#6FA8DC`.

**Vizyon notu:** Toz toprak bir arsada oynayan çocuk, sade/klasik forma
(Arjantin bayrağının açık mavisi), dengeli/sakin duruş — ne çok kaslı ne
çok zayıf, "her şeyi orta karar iyi yapan" hissi.

```
character reference sheet, young argentinian potrero (dusty vacant lot)
street football kid, age 10-12, balanced athletic build, simple light
blue (#6FA8DC) football jersey and shorts, worn sneakers, calm confident
posture, multiple views: front view, back view, side view, running pose,
jumping pose, low sliding dash pose, kicking pose, chibi proportions,
bold black outline, flat colors, plain white background, consistent
character design, full body, 2D sports game character concept art,
Pixel Cup Soccer style --ar 16:9 --style raw
```

---

## 5. Karakter 3 — Kenya

**Kimlik:** Topunu poşetten yapan çocuk, zayıf şut/kaotik arketip, özel
hareketi poşet top (havada öngörülemez sapması).
**Ana renk:** turuncu `#E67E22`.

**Vizyon notu:** Sıska/çevik yapı, yalın ayak, toprak/savan tonlarında
sade kıyafet, elinde ya da yanında bandaj/plastik poşetle sarılmış
doğaçlama bir top imgesi eklenebilir (karakterin kimliğinin görsel imzası).

```
character reference sheet, young kenyan street football kid, age 10-12,
lean and agile build, barefoot, simple earth-toned worn clothing, orange
(#E67E22) as primary color accent, holding or standing near a makeshift
plastic-bag football (bundled plastic bags wrapped with string), multiple
views: front view, back view, side view, running pose, jumping pose, low
sliding dash pose, kicking pose, chibi proportions, bold black outline,
flat colors, plain white background, consistent character design, full
body, 2D sports game character concept art, Pixel Cup Soccer style --ar
16:9 --style raw
```

---

## 6. Karakter 4 — Kongo

**Kimlik:** Kinşasa, sapeur/rumba kültürü, güçlü/iri arketip, özel hareketi
ritimli zamanlama (doğru anda basınca power bonusu).
**Ana renk:** mor `#9B59B6`.

**Vizyon notu:** En güçlü/iri karakter ama Kongo'nun **sapeur** kültürü çok
belirgin bir görsel kimlik — rengarenk, şık, "dandy" bir stil detayı
(parlak renkli tek bir aksesuar: kravat, şapka, kolye, renkli çorap gibi)
sade forma/şort üstüne eklensin, sokakta oynarken bile bir zarafet/ritim
hissi versin.

```
character reference sheet, young congolese (kinshasa) street football
kid, age 10-12, strong sturdy build, simple football jersey and shorts in
purple (#9B59B6), one flamboyant sapeur-style fashion accent (bright
colored tie, hat, or bold socks) reflecting Congolese sapeur dandy
culture, confident rhythmic posture, multiple views: front view, back
view, side view, running pose, jumping pose, low sliding dash pose,
kicking pose, chibi proportions, bold black outline, flat colors, plain
white background, consistent character design, full body, 2D sports game
character concept art, Pixel Cup Soccer style --ar 16:9 --style raw
```

---

## 7. Sonraki adım (bu belgenin kapsamı dışında)

1. Midjourney'den 4 character sheet çıkınca, her pozu/açıyı tek tek kırp.
2. Pixel art'a çevir (Aseprite, Photoshop "pixelate" filtresi, ya da
   `pixelit`/`img2pixel` gibi bir araç) — hedef boyut oyunun kullandığı
   `CHARACTER_SPRITE_WIDTH` (40px) civarı.
3. Dosyaları `assets/characters/<id>/` altına koy (örn.
   `idle_front.png`, `run_front.png`, `jump.png`, `dash_left.png`,
   `dash_right.png`, `kick.png` gibi — tam isimlendirme oyuna bağlarken
   birlikte kararlaştırılır).
4. Bana haber ver, `Character.ts`'teki placeholder kafa+gövde şeklini
   gerçek sprite'larla değiştiririm.
