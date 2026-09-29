# Karakter Asset'leri

CLAUDE.md bölüm 6: Claude Code sprite üretmiyor, sadece yerleşimi hazırlıyor
— Sami Midjourney ile üretti (`docs/CHARACTER_ART_BRIEF.md`'teki prompt'larla),
kırpma/arka plan temizliği (`rembg`/U2Net) Claude Code tarafında yapıldı.

Her klasör bir karakter (`src/config/characters.ts`'teki `id` ile eşleşir),
altı poz PNG'si (şeffaf arka plan):

```
<id>/front.png   idle, kameraya bakıyor
<id>/back.png    idle, kameradan uzağa bakıyor
<id>/left.png    idle, sol profil
<id>/right.png   idle, sağ profil
<id>/slide.png   Kayma (Dash) pozu
<id>/jump.png    Zıplama pozu
```

`src/entities/Character.ts` facing'e göre front/back/left/right arasında,
`isDashing`/`y > 0` durumuna göre slide/jump'a geçiyor — ayrı koşu/yürüme
animasyon kareleri yok, statik poz değişimi yeterli (M4 art pass).

Henüz yok: kaleci-özel poz (tutma/dalış), süper hareket pozları — mevcut
6 pozla idare ediliyor. Gerekirse aynı pipeline ile eklenir.
