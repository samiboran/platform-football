# BACKLOG — Platform Football

Ertelenen veya sonraya bırakılan fikirler. Unutmamak için burada tutulur.

- **Sopa/taş mekaniği** (CLAUDE.md bölüm 6): sahada duran bir sopayla topu havalandırma,
  taş atarak kaleciyi yavaşlatma. M5'ten sonra değerlendirilecek.

## Benzer oyunlardan eksik mekanikler (araştırma, 17.11.2026)
Kaynaklar: Windjammers 1/2 (1v1, kendi yarısında kalma, power atış, tutma — bize en yakın tür),
Lethal League, Kafa Topu / Head Soccer, Haxball, Super Mario Strikers, Captain Tsubasa: Rise of New Champions.
Sami seçene kadar yapılmayacak; öncelik tahmini parantez içinde.

- ~~**Gövde bloğu**~~ — yapıldı 18.11.2026 (normal şut gövdeden seker, power şut devirip geçer).
- **Falso / kavisli şut (yüksek):** Windjammers'ta çeyrek daire joystick + atış = kavisli atış; Tsubasa'da "banana". Şarj ederken joystick'i çevirmek topa yan kuvvet versin.
- **Tek dokunuş geri vuruş (yüksek):** Windjammers "slap shot" / Lethal League parry-vuruş: gelen topa tam zamanında Aksiyon = tutmadan direkt geri şut. Erken = zayıf, tam an = hızlı.
- **Ralli hızlanması (orta):** Lethal League'de her geri vuruşta top hızlanır. Ardışık geri vuruşlarda şut hızı/power +1 kademeli artsın, kale görene kadar.
- **Kısa düşürme (orta):** Windjammers "drop shot": orta çizginin hemen arkasına düşen kısa lob (lob basılı tutma süresiyle mesafe).
- **Mükemmel tutuştan anında şarjlı şut (orta):** Windjammers'ta mükemmel tutuş/toss süper şarjını hemen başlatır. Bizde +1 enerji var; ek olarak 1 sn içinde atılan şuta +1 güç verilebilir.
- **Çalım vs. müdahale düellosu (düşük — orta çizgi geçilmediği için sınırlı):** Tsubasa/Strikers. Bizde rakip topa sadece kendi yarısında dokunuyor, o yüzden yalnızca orta çizgi kenarındaki top için anlamlı.
- **Geride olana kolaylık (düşük):** Windjammers'ta gerideki oyuncunun zamanlama penceresi genişler. Bizde gol yiyene +1 enerji var; parry penceresi de genişleyebilir.
- **Eşitlikte altın gol / skor bölgeleri (düşük):** Windjammers'ta kale bölgesine göre 3/5 puan, yere düşen lob 2 puan. Köşe golleri bonus olabilir.
- **Çalım hareketi / feint (düşük):** şarjı iptal edip yön değiştirme (Tsubasa feint). Rakip AI'ın tut zamanlamasını bozar.

## Hava kombosu — AI tarafı (17.11.2026)
- AI rakip henüz falso (hava dash + vole) ve rövaşata kullanmıyor; sadece oyuncu yapabiliyor. Denge oturunca AI'a da öğretilecek.

## Ekipman (18.11.2026)
- Ekipman şu an sadece renk kutusu; karakter sprite'ında görünmüyor (pabuç rengi, kol bandı, saç bandı `gen_sprites.py`'ye katman olarak eklenebilir).
- PvP gelince karar: ekipman etkileri PvP'de açık mı (küçük ve takaslı oldukları için şu an açık düşünülüyor), yoksa sadece görünüm mü?
- Elmasla alınan özel/görsel ekipman (altın pabuç vb.) — elmasın harcanacağı yer.
- AI rakipte özellik (perk) ve ekipman yok; zorluk seviyeleriyle (M9.2) birlikte verilebilir.

