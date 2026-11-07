# Denge Sofrası — 12 Aylık Yemek Planı

Kan şekeri yüksekliği ve karaciğer yağlanması için düşünülmüş, yalnızca sabah ve akşam öğünlerinden oluşan 12 aylık örnek yemek planı uygulaması.

## Bu uygulama ne yapar?

- Ay bazlı 7 günlük sabah-akşam menü örneleri
- Pratik pazar listesi (işaretlenebilir, kopyalanabilir)
- Tabak rehberi (½ sebze, ¼ protein, ¼ tam tahıl/baklıyat)
- Önemli sağlık notları (diyetisyen/doktor danışmanlığı önerisi)
- **Telefon ana ekranına "uygulama gibi" eklenebilir (PWA)** ve ilk ziyaretten sonra çevrimdışı çalışır.

## Telefonuna indirme / kurulum (PWA)

Bu site klasik bir uygulama mağazası (App Store / Google Play) uygulaması değil; tarayıcı üzerinden ana ekranına eklenen bir **Progressive Web App (PWA)**'dır.

### Android (Chrome)
1. Uygulamayı aç: `https://explorerstreasure1-alt.github.io/yemek-program-m/glucose-and-liver-diet-plan/` (ya da kendi alan adın).
2. Chrome'un üç nokta menüsünden **"Uygulamayı yükle"** veya **"Ana ekrana ekle"** seçeneğine bas.
3. Ana ekrandan "Denge Sofrası" simgesiyle açılır, artık çevrimdışı da menüye ulaşabilirsin.

### iPhone (Safari)
1. Uygulamayı Safari'de aç.
2. Altta **Paylaş** (kare ok) düğmesine bas.
3. **"Ana Ekrana Ekle"** seçeneğini seç ve ekle.
4. Ana ekrandan açar.

> İlk açışta üstteki "Yükle" düğmesiyle de bildirim alabilirsin.

## İkonlar (logo) ve PWA altyapısı

- Uygulama logosu: `public/icons/app-icon.svg`
- Eksik PNG ikon dosyaları (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) şu sayfadan üretilip `public/icons/` klasörüne kopyalanmalı:
  `public/icons/generate-icons.html` (tarayıcıda aç, indir, klasöre kopyala)
- `public/manifest.webmanifest` → uygulama manifesti (isim, renk, ikonlar)
- `public/sw.js` → service worker (çevrimdışı önbellek)
- `src/App.tsx` → `beforeinstallprompt` ile "ana ekrana ekle" istemi

## Yerel geliştirme ve build

```bash
# Bağımlılıkları kur
npm install

# Geliştirme sunucusu (http://localhost:5173)
npm run dev

# Production klasörünü oluştur (/dist)
npm run build

# Build'ını yerel olarak önizle
npm run preview
```

`vite.config.ts` dosyasında `vite-plugin-singlefile` eklentisi var, bu yüzden build sonucu tek bir HTML dosyası olarak paketlenir ve kolayca barındırılabilir.

## GitHub Pages'e yayımlama

Bu proje zaten şu repoda:
`https://github.com/explorerstreasure1-alt/yemek-program-m`

Klasör `glucose-and-liver-diet-plan/` altında. GitHub Pages için iki yol var:

### Yöntem A: `gh-pages` paketiyle (önerilen)

```bash
npm install --save-dev gh-pages
```

`package.json` içine bir deploy komutu ekle:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

Sonra:

```bash
git add .
git commit -m "PWA altyapısı ve ikon üretici eklendi"
git push origin main
npm run deploy
```

Site şu adreste yayına girer:
`https://explorerstreasure1-alt.github.io/yemek-program-m/`

> Eğer repo kökünde değil de bir alt klasörde (`glucose-and-liver-diet-plan/`) çalışılıyorsa, `vite.config.ts` içine `base: '/yemek-program-m/glucose-and-liver-diet-plan/'` eklemen gerekebilir (GitHub Pages kullanıcı/org sitesi için repo adı prefix'i gerekir).

### Yöntem B: GitHub Actions ile

`.github/workflows/deploy.yml` oluşturup `actions/setup-node`, `vite build` ve `actions/upload-pages-artifact` + `actions/deploy-pages` adımlarıyla push'lanan her commit'te otomatik yayımlanabilir.

## Önemli sağlık notu

Bu menü genel bir örnektir, kişiye özel tedavi yerine geçmez. İnsülin veya kan şekerini düşüren ilaçlar (gliklazid, glimepirid vb.) kullananlar, iki öğün arasındaki uzun açlık riskine dikkat etmelidir. Başlamadan önce doktorunuz veya diyetisyeninizle danışın; ilaçlarınızı bu plana göre değiştirmeyin.

## Lisans

Kişisel kullanım için hazırlanmıştır.