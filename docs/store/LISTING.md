# Google Play mağaza sayfası (M9.3)

Play Console → Mağazada görünürlük → Ana mağaza girişi. Varsayılan dil **Türkçe (tr-TR)**, çeviri **English (en-US)**.
Görseller bu klasörde; yeniden üretmek için en alttaki komutlar.

## Görseller

| Alan | Kural (Play) | Dosya |
|---|---|---|
| Uygulama simgesi | 512×512, 32-bit PNG, ≤1 MB | `icon-512.png` (= `assets/icons/icon-512.png`) |
| Tanıtım görseli | 1024×500, JPG/24-bit PNG, alfa yok | `tr/feature_graphic.png`, `en/feature_graphic.png` |
| Telefon ekran görüntüleri | 2–8 adet, 16:9, kenar 320–3840 px | `tr/01..05_*.png`, `en/01..05_*.png` (1920×1080) |

Ekran görüntüleri sırası: 1 power şut şarjı (nişan çizgisi + aura) · 2 Tsubasa tarzı portre kesiti · 3 ana menü · 4 lig · 5 saha seçimi.
7" / 10" tablet görüntüsü zorunlu değil; istenirse aynı 1920×1080 dosyalar yüklenebilir.

## Uygulama adı (≤30)
- TR / EN: **Platform Football**

## Kısa açıklama (≤80)
- TR: `Power şutlar, parry'ler, falsolar: tek ekranda 1v1 pixel art sokak futbolu!` (75)
- EN: `Power shots, parries and curlers: 1v1 pixel-art street football on one screen!` (78)

## Uzun açıklama (≤4000)

### TR
```
Platform Football, tek ekranda oynanan hızlı bir 1v1 arcade futbol oyunu. İki kale aynı anda ekranda, kamera hiç kaymıyor: her şey refleks ve zamanlama.

⚡ POWER ŞUTLAR
Aksiyon'a basılı tut, enerji barını topa yükle ve bırak! Her karakter kendi elementiyle vurur: Tiago yıldırımla, Kiala alevle. Güçlü şutlarda çizgi roman tarzı portre kesiti girer.

🧤 TUT, PARRY, ÇATIŞ
Top sende değilse aynı tuş tutar. Şutun gücü tutuşundan fazlaysa kaleci düşer, eşitse sen kazanırsın. Son anda basarsan mükemmel parry: ekstra güç ve enerji.

🌀 FALSO VE RÖVAŞATA
Zıpla, havada dash at, vole vur: top önce ters tarafa çıkar, sonra kıvrılır. Havadaki topa süper hareketle rövaşata!

🏆 SOKAK TURNUVASI
Mahalleden başla, şehri ve kıtayı geç, finalde kupayı kaldır. 7 maçlık lig, kolay / orta / zor rakipler.

🏟️ FARKLI SAHALAR
Standart çim, Brezilya kumu, Arjantin toprağı, Kenya çamuru ve rüzgârı, Kongo'nun müzikli sokağı: her sahanın kendi fiziği var.

🎮 ÖZELLİKLER
• İnternetsiz oynanır, hesap gerekmez
• Reklam yok, veri toplanmaz
• Adım adım eğitim
• Seviye, yetenekler ve ekipman (pabuç, kol bandı, saç bandı)
• Dokunmatik joystick; tuş boyutu, şeffaflık ve sol/sağ el düzeni ayarlanabilir
• Türkçe ve İngilizce

Retro pixel art, kısa maçlar (2-3 dakika), tek elle bile oynanabilir.
```

### EN
```
Platform Football is a fast 1v1 arcade football game played on a single screen. Both goals are always in view and the camera never moves: it's all about reflexes and timing.

⚡ POWER SHOTS
Hold Action, pour your energy bar into the ball and let it fly! Every player strikes with their own element: Tiago with lightning, Kiala with fire. Big shots trigger a comic-style portrait cut-in.

🧤 CATCH, PARRY, CLASH
Without the ball, the same button catches. If the shot is stronger than your catch, you go down; if it's equal, you win the clash. Press at the last moment for a perfect parry: extra power and energy.

🌀 CURLERS AND BICYCLE KICKS
Jump, dash in mid-air, hit the volley: the ball swerves one way, then curls back. Meet a high ball with your special move for a bicycle kick!

🏆 STREET TOURNAMENT
Start in your neighbourhood, conquer the city and the continent, and lift the trophy in the final. A 7-match league against easy, medium and hard rivals.

🏟️ DIFFERENT PITCHES
Standard grass, Brazilian sand, Argentine dirt, Kenyan mud and wind, Congo's musical street: each pitch plays differently.

🎮 FEATURES
• Plays offline, no account needed
• No ads, no data collection
• Step-by-step tutorial
• Levels, perks and gear (boots, armband, headband)
• Touch joystick; adjustable button size, opacity and left/right-hand layout
• English and Turkish

Retro pixel art, short matches (2-3 minutes), playable even one-handed.
```

## Kategori ve etiketler
- Uygulama türü: **Oyun** · Kategori: **Spor** (alternatif: Arcade)
- Etiketler (Play listesinden seçilir): Futbol, Arcade, Pixel art, Tek oyunculu, Çevrimdışı
- İletişim: e-posta zorunlu (**Sami girer**); web sitesi: https://samiboran.github.io/platform-football/
- Gizlilik politikası URL'si: https://samiboran.github.io/platform-football/privacy.html

## Dikkat (isim/marka)
- Metinlerde gerçek oyuncu, kulüp, lig veya marka adı yok. Ülke adları sadece karakterin geldiği yer.
- **"Dünya Kupası / World Cup"** FIFA'nın tescilli markası. Oyundaki lig adı "Sokak Dünya Kupası" — mağaza metinlerinde ve tanıtım görselinde bilerek "sokak turnuvası / street tournament" yazıldı. Oyun içindeki adın değişip değişmeyeceği **Sami'nin kararı** (bkz. ROADMAP "İsim/marka kontrolü").

## Yeniden üretme
```
npx vite --port 5173 &                 # dev sunucusu (window.__game sadece dev'de var)
node tools/store/capture.cjs tr        # docs/store/tr/0*.png
node tools/store/capture.cjs en        # docs/store/en/0*.png
python3 tools/store/feature_graphic.py # docs/store/*/feature_graphic.png
```
