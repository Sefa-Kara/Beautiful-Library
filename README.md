# Digital Library (Beautiful-Library)

Modern ve kullanıcı dostu bir dijital kütüphane uygulaması. Kullanıcıların kitapları keşfetmesi, favorilerine eklemesi ve inceleme yazması için tasarlanmış kapsamlı bir web uygulamasıdır.

Proje, **Open Library API**'den alınan verileri kullanarak dinamik bir sanal kütüphane oluşturur ve kullanıcıların hesap oluşturarak kendi favori listelerini ve kitap incelemelerini yönetmelerine olanak tanır.

## 📚 Temel Özellikler

- **Görsel Kütüphane Arayüzü:** Kitaplar A-Z harflerine göre düzenlenmiş sanal raflarda görsel olarak sergilenir
- **Kullanıcı Kimlik Doğrulaması:** Güvenli kayıt ve giriş sistemi. Parolalar `bcryptjs` ile hashlenir ve oturumlar `JWT` ile yönetilir
- **Kitap Keşfi:** Open Library API'den alınan "tüm zamanların" ve "yıllık" trend kitap verileriyle zengin bir koleksiyon
- **Veri Optimizasyonu:** Kitap verileri sunucu tarafında önbelleğe alınır, tekilleştirilir ve zenginleştirilir
- **Kişisel Favoriler:** Kullanıcılar kitapları favorilerine ekleyebilir, silebilir ve popüler favorileri görüntüleyebilir
- **Kitap İncelemeleri:** Kullanıcılar kitaplara puan verebilir ve detaylı yorumlar yazabilir
- **Kullanıcı Profili:** Profil bilgilerini görüntüleme ve güncelleme
- **Dinamik Arama:** Kitaplar ve yazarlar arasında hızlı arama
- **Popüler Favoriler:** En çok favorilere eklenen kitapları görüntüleme
- **İletişim Formu:** Kullanıcıların mesaj gönderebilmesi için iletişim sayfası

## 💻 Kullanılan Teknolojiler

### Backend

- **Node.js** - Sunucu tarafı çalışma ortamı
- **Express.js 5.1.0** - Web uygulama framework'ü ve RESTful API katmanı
- **MongoDB** - NoSQL veritabanı
- **Mongoose 8.18.1** - MongoDB için ODM (Object Data Modeling)
- **JSON Web Tokens (JWT)** - Token tabanlı kimlik doğrulama
- **bcryptjs** - Parola hashleme
- **dotenv** - Ortam değişkenleri yönetimi
- **cookie-parser** - Cookie işleme middleware'i
- **cors** - Cross-Origin Resource Sharing desteği
- **node-fetch** - Sunucu tarafında HTTP istekleri
- **nodemailer** - E-posta gönderme (iletişim formu için)

### Frontend

- **HTML5** - Yapısal iskelet
- **CSS3** - Stil ve görsel tasarım
- **Vanilla JavaScript** - Arayüz mantığı, API istekleri, DOM manipülasyonu
- **Font Awesome** - İkon kütüphanesi

### Geliştirme Araçları

- **Nodemon** - Geliştirme sırasında otomatik sunucu yeniden başlatma

## 📁 Proje Yapısı

```
Beautiful-Library/
├── app.js                 # Ana uygulama giriş noktası
├── middleware/
│   └── auth.js           # JWT doğrulama middleware'i
├── models/
│   └── User.js           # Kullanıcı veri modeli
├── routes/
│   ├── auth.js           # Kimlik doğrulama rotaları
│   ├── favorites.js      # Favoriler rotaları
│   └── reviews.js        # İncelemeler rotaları
├── services/
│   └── books.js          # Kitap verisi yönetim servisi
└── Public/               # Frontend dosyaları
    ├── index.html        # Ana sayfa
    ├── script.js         # Ana sayfa JavaScript
    ├── style.css         # Ana stil dosyası
    ├── auth-utils.js     # Kimlik doğrulama yardımcı fonksiyonları
    ├── About/            # Hakkında sayfası
    ├── Contact/          # İletişim sayfası
    ├── Login/            # Giriş sayfası
    ├── Register/         # Kayıt sayfası
    ├── Profile/          # Profil sayfası
    ├── MyFavorites/      # Kullanıcı favorileri
    ├── MyReviews/        # Kullanıcı incelemeleri
    ├── Reviews/          # Tüm incelemeler
    └── Settings/         # Ayarlar sayfası
```

## 🚀 Kurulum ve Başlatma

### Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB (yerel veya MongoDB Atlas)
- npm veya yarn

### Adımlar

1. **Depoyu klonlayın:**

   ```bash
   git clone https://github.com/Sefa-Kara/Beautiful-Library.git
   cd Beautiful-Library
   ```

2. **Gerekli paketleri yükleyin:**

   ```bash
   npm install
   ```

3. **Ortam Değişkenlerini Ayarlayın:**

   Ana dizinde `.env` adında bir dosya oluşturun:

   ```env
   # MongoDB bağlantı URI'si
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority

   # JWT için gizli anahtar
   JWT_SECRET=sizin_cok_gizli_anahtariniz_buraya

   # Port (opsiyonel, varsayılan: 4000)
   PORT=4000
   ```

4. **Uygulamayı başlatın:**

   ```bash
   npm start
   ```

   Sunucu varsayılan olarak `http://localhost:4000` adresinde çalışmaya başlayacaktır.

## ⚙️ Proje Mimarisi

### Backend Mimarisi

#### Giriş Noktası (`app.js`)
- Express sunucusunu başlatır
- MongoDB bağlantısını yönetir
- Middleware'leri yapılandırır (CORS, cookie-parser, JSON parser)
- Statik dosyaları servis eder
- Route dosyalarını yükler

#### Kimlik Doğrulama (`routes/auth.js`)
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Kullanıcı profil bilgileri (Token gerekli)
- `PUT /api/auth/me` - Profil güncelleme (Token gerekli)

#### Favoriler (`routes/favorites.js`)
- `GET /api/favorites` - Kullanıcının favorileri (Token gerekli)
- `GET /api/favorites/popular` - Popüler favoriler (Herkese açık)
- `POST /api/favorites` - Favori ekleme (Token gerekli)
- `DELETE /api/favorites` - Favori silme (Token gerekli)
- `POST /api/favorites/check` - Favori durumu kontrolü (Token gerekli)

#### İncelemeler (`routes/reviews.js`)
- `GET /api/reviews` - Tüm incelemeler (Herkese açık)
- `POST /api/reviews` - İnceleme ekleme (Token gerekli)
- `GET /api/reviews/my-reviews` - Kullanıcının incelemeleri (Token gerekli)
- `POST /api/reviews/check` - İnceleme durumu kontrolü (Token gerekli)

#### Veri Modeli (`models/User.js`)
- Kullanıcı bilgileri: `name`, `surname`, `email`, `password`
- Gömülü diziler: `favorites`, `readingHistory`, `reviews`
- Otomatik parola hashleme (pre-save hook)
- Parola doğrulama metodu

#### Kitap Servisi (`services/books.js`)
- Open Library API'den kitap verilerini çeker
- Verileri tekilleştirir (Map kullanarak)
- Sayfa sayısı gibi eksik bilgileri tamamlar
- Sunucu tarafında önbelleğe alır (`bookCache`)
- Paralel API çağrıları ile performans optimizasyonu

#### Middleware (`middleware/auth.js`)
- JWT token doğrulama
- Korumalı route'lar için kimlik doğrulama

### Frontend Mimarisi

- **Ana Sayfa (`index.html`)**: A-Z raflarında kitapları gösterir
- **Kimlik Doğrulama**: Login ve Register sayfaları
- **Kullanıcı Sayfaları**: Profile, MyFavorites, MyReviews, Settings
- **Genel Sayfalar**: About, Contact, Reviews
- **API İletişimi**: `fetch` API ile RESTful endpoint'lere istekler
- **Token Yönetimi**: `auth-utils.js` ile token saklama ve doğrulama

## 📄 API Endpoints Özeti

### Kimlik Doğrulama
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Profil bilgileri (🔒)
- `PUT /api/auth/me` - Profil güncelleme (🔒)

### Favoriler
- `GET /api/favorites` - Kullanıcı favorileri (🔒)
- `GET /api/favorites/popular` - Popüler favoriler
- `POST /api/favorites` - Favori ekle (🔒)
- `DELETE /api/favorites` - Favori sil (🔒)
- `POST /api/favorites/check` - Favori kontrolü (🔒)

### İncelemeler
- `GET /api/reviews` - Tüm incelemeler
- `POST /api/reviews` - İnceleme ekle (🔒)
- `GET /api/reviews/my-reviews` - Kullanıcı incelemeleri (🔒)
- `POST /api/reviews/check` - İnceleme kontrolü (🔒)

### Kitaplar
- `GET /books` - Tüm kitapları getir

🔒 = JWT Token gerektirir

## 🔐 Güvenlik Özellikleri

- Parolalar bcryptjs ile hashlenir
- JWT token tabanlı kimlik doğrulama
- Token'lar 24 saat geçerlidir
- Middleware ile route koruması
- CORS yapılandırması
- Input validasyonu ve sanitizasyonu

## 🧑‍💻 Yazar

- **Mustafa Sefa Kara**
- **GitHub:** [@Sefa-Kara](https://github.com/Sefa-Kara)
- **LinkedIn:** [linkedin.com/in/mustafasefakara](https://www.linkedin.com/in/mustafasefakara/)

## 📝 Lisans

ISC
