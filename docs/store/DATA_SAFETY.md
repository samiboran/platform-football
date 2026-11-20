# Google Play "Veri güvenliği" (Data safety) formu — cevaplar (M9.3)

Play Console → Uygulama içeriği → Veri güvenliği. Aşağıdaki cevaplar **v1** (sunucusuz, tek oyunculu,
reklamsız, analizsiz) için. Kodda kontrol edildi (20.11.2026): `src/` içinde `fetch` / XHR / WebSocket /
üçüncü taraf SDK yok; oyun verisi sadece `localStorage`'da (`pf.profile`, `pf.settings`, `pf.audio`,
`pf.aiDifficulty`, `pf.lastStadium`, `pf.tutorial.*`, `pf.bootMs`). Gizlilik politikası ile aynı:
https://samiboran.github.io/platform-football/privacy.html

## 1. Veri toplama ve güvenlik
| Soru | Cevap |
|---|---|
| Uygulamanız gerekli kullanıcı veri türlerinden herhangi birini topluyor veya paylaşıyor mu? | **Hayır** |

"Hayır" denince form biter; aşağıdaki bölümler Play'in sorabileceği ek sorular ve gerekçeler içindir.

**Neden "toplama" sayılmıyor:** Google'ın tanımına göre yalnızca cihazda kalan ve geliştiriciye/üçüncü tarafa
gönderilmeyen veri "toplanan veri" değildir. İlerleme ve ayarlar cihazdan hiç çıkmaz.

| Soru | Cevap |
|---|---|
| Veriler aktarım sırasında şifreleniyor mu? | Aktarılan veri yok (form "Hayır" ile bittiği için sorulmaz) |
| Kullanıcılar verilerinin silinmesini isteyebilir mi? | Hesap yok; uygulamayı silmek / uygulama verilerini temizlemek her şeyi siler |
| Hesap oluşturma | Yok (silme URL'si gerekmez) |

## 2. Veri türleri (hepsi: toplanmıyor, paylaşılmıyor)
Konum · Kişisel bilgiler (ad, e-posta, kimlik) · Finansal bilgiler · Sağlık ve fitness · Mesajlar ·
Fotoğraf ve videolar · Ses dosyaları · Dosyalar ve dokümanlar · Takvim · Kişiler ·
Uygulama etkinliği · Web'de gezinme · Uygulama bilgileri ve performans (çökme kayıtları, tanılama) ·
Cihaz veya diğer kimlikler.

## 3. İzinler (Manifest)
| İzin | Neden | Veri? |
|---|---|---|
| `INTERNET` | Capacitor WebView varsayılanı; oyun dosyaları APK içinde, ağ isteği yapılmıyor | Hayır |
| `VIBRATE` | Gol/şut titreşimi (Ayarlar'dan kapatılabilir) | Hayır |

## 4. Diğer "Uygulama içeriği" beyanları (aynı ekran grubu)
| Beyan | Cevap |
|---|---|
| Reklamlar | **Uygulamada reklam yok** |
| Uygulama erişimi | Tüm işlevler kısıtlama olmadan kullanılabilir (giriş yok) |
| Hükümet uygulaması / Finans / Sağlık | Hayır |
| İçerik derecelendirme (IARC) | **Sami doldurur** — şiddet yok, kan yok, kumar yok, kullanıcı etkileşimi yok, gerçek parayla satın alma yok |
| Hedef kitle | **Sami karar verir** — 13 yaş altı seçilirse Aileler politikası devreye girer |

## Bu cevapları DEĞİŞTİRECEK şeyler (ileride)
- **Hata raporlama** (Sentry / Crashlytics, ROADMAP M9.1 "(Sami)"): "Uygulama bilgileri ve performans →
  Çökme kayıtları + Tanılama" **toplanıyor** olur; Crashlytics ise "Cihaz kimlikleri" de. Amaç: Uygulama işlevselliği/Analiz.
  Gizlilik politikası da güncellenmeli.
- **Uygulama içi satın alma** (altın/elmas gerçek parayla): "Finansal bilgiler → Satın alma geçmişi" (Google Play
  Billing üzerinden) ve mağaza sayfasında "Uygulama içi satın alma içerir".
- **Online / sıralama / bulut kayıt** (M10): hesap kimliği, oyun içi etkinlik → form yeniden doldurulur, hesap
  silme URL'si zorunlu olur.
- **Reklam SDK'sı:** reklam kimliği (Cihaz kimlikleri) + `AD_ID` izni.
