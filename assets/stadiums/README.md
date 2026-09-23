# Saha Asset'leri

CLAUDE.md bölüm 7: her saha görsel + mekanik olarak farklı. Her klasör bir
sahayı (`src/config/stadiums.ts`'teki `id` ile eşleşir) temsil ediyor:

```
brazil/       Kum sahil
argentina/    Potrero (toprak arsa)
kenya/        Toprak saha
congo/        Müzikli sokak
```

Gerçek pixel-art saha zemini/tribün görselleri gelene kadar oyun
`stadiums.ts`'teki `tintColor` ile boyanmış placeholder geometrik saha
kullanıyor (`src/systems/pitchRenderer.ts`).
