# Karakter Asset'leri

CLAUDE.md bölüm 6: Claude Code sprite üretmiyor, sadece yerleşimi hazırlıyor.
Her klasör bir karakter (`src/config/characters.ts`'teki `id` ile eşleşir):

```
brazil/       Brezilya
argentina/    Arjantin
kenya/        Kenya
congo/        Kongo
```

Adobe Illustrator Turntable ile üretilen çok açılı görünümler pixel art'a
çevrildikten sonra buraya konacak (idle, koşu, zıplama, şut animasyon
kareleri vb.). Görseller gelene kadar oyun `CHARACTER_SPRITE_WIDTH x
CHARACTER_HEIGHT` boyutunda renkli placeholder dikdörtgen kullanıyor
(`characters.ts`'teki `color` alanı).
