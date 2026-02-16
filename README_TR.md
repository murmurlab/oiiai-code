# OIIAI Code Extension

## Amaç
OIIAI Code, VS Code içinde eğlenceli bir “kedi eşlikçisi” deneyimi sunar. Aktivite çubuğundaki panelde kedinin durumunu (idle/typing/dvd) görür, kod yazarken kedi animasyonları ve sesleriyle küçük bir motivasyon katmanı edinirsiniz. İsterseniz editör üzerinde uçan kedi dekorasyonu açabilir, ayrıca seçtiğiniz bir görseli sürüklenebilir “floating” panelde görüntüleyebilirsiniz.

## Özellikler
- OIIAI paneli: kedi durumu (idle/typing/dvd) + animasyon + ses kontrolü
- Kod yazarken otomatik durum geçişleri (idle → typing → dvd)
- Editör üzerinde uçan kedi dekorasyonu (toggle)
- Seçilen görseli sürüklenebilir floating panelde açma

![](./gif.gif)

## Kurulum
- VS Code Marketplace üzerinden yükle: https://marketplace.visualstudio.com/items?itemName=murmurlab.oiiai
- Geliştirici kurulumu: `npm install` → `npm run compile` → VS Code’da F5.

## VSIX Build
- vsce yükle (bir kez): `npm i -g @vscode/vsce`
- Paketle: `npm run compile` → `vsce package`

## Kullanım
- Aktivite çubuğundaki **OIIAI** panelini açın.
- Komut Paleti’nden şu komutları çalıştırın:
   - **OIIAI: Open Floating Image** — bir görsel seçip sürüklenebilir panelde açar.
   - **OIIAI: Toggle Flying Cat 🐱** — editör üzerinde uçan kedi dekorasyonunu aç/kapatır.

## Katkı
Katkılar memnuniyetle karşılanır. Lütfen bir issue açın veya PR gönderin.

## Lisans
Bu proje MIT lisansı ile lisanslanmıştır.

![s](./video.mp4)
<video src="./video.mp4" controls playsinline loop></video>
