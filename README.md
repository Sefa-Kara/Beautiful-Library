# Digital Library (Beautiful-Library)

Bu proje, kullanıcılara kitapları keşfetme, organize etme ve inceleme konusunda sürükleyici ve sezgisel bir deneyim sunmak için tasarlanmış kapsamlı bir web uygulamasıdır. Modern bir kütüphane yönetim sistemi oluşturmak için güzel bir görsel arayüzü güçlü arka uç işlevselliğiyle birleştirir.

Proje, **Open Library API**'den alınan verileri kullanarak dinamik bir sanal kütüphane oluşturur ve kullanıcıların hesap oluşturarak kendi favori listelerini ve kitap incelemelerini yönetmelerine olanak tanır.

![Digital Library Arayüzü (Örnek Resim)](https://i.imgur.com/example.png)
_(Projenizin bir ekran görüntüsünü veya GIF'ini buraya ekleyebilirsiniz.)_

## 📚 Temel Özellikler

- **Görsel Kütüphane Arayüzü:** Kitaplar, `index.html` dosyasında görüldüğü gibi A-Z harflerine göre düzenlenmiş sanal raflarda görsel olarak sergilenir.
- **Kullanıcı Kimlik Doğrulaması:** Güvenli kayıt (`/register`) ve giriş (`/login`) işlemleri. Parolalar `bcryptjs` ile hashlenir ve oturumlar `JWT` (JSON Web Tokens) ile yönetilir.
- **Kitap Keşfi:** Open Library API'den (`books.js` içinde yönetilir) alınan "tüm zamanların" ve "yıllık" trend kitap verileriyle zengin bir koleksiyon sunar.
- **Veri Optimizasyonu:** `books.js` servisi, Open Library'den çektiği verileri (örn. sayfa sayısı) zenginleştirir, `Map` kullanarak tekilleştirir ve sunucu tarafında önbelleğe (cache) alarak performansı artırır.
- **Kişisel Favoriler:** Kullanıcılar (`User.js` modelinde tanımlı) kitapları kendi kişisel "Favoriler" listesine ekleyebilir ve yönetebilir.
- **Kitap İncelemeleri:** Kullanıcılar kitaplara puan verebilir ve (`#reviewModal` aracılığıyla) detaylı yorumlar yazabilir.
- **Kullanıcı Profili:** Kullanıcılar kendi profil bilgilerini (`GET /me`, `PUT /me`) görüntüleyebilir ve güncelleyebilir.
- **Dinamik Arama:** Kitaplar ve yazarlar arasında hızlı arama yapmayı sağlayan bir arama çubuğu ve öneri sistemi.
- **İletişim Formu:** `contact.html` sayfasındaki form aracılığıyla kullanıcıların mesaj gönderebilmesi (arka uçta `nodemailer` paketi ile yönetilir).

## 💻 Kullanılan Teknolojiler (Tech Stack)

Proje, modern bir **MERN-benzeri** (MongoDB, Express, Node.js ve Vanilla JS) mimari üzerine kuruludur.

### Backend

- **Node.js:** Sunucu tarafı çalışma ortamı.
- **Express.js:** Hızlı ve minimalist web uygulama framework'ü, RESTful API katmanı.
- **MongoDB:** NoSQL veritabanı.
- **Mongoose:** MongoDB için zarif bir nesne modelleme (ODM) aracı. `User.js` modelinde kullanılır.
- **JSON Web Tokens (JWT):** Kullanıcı oturumlarını doğrulamak için güvenli token tabanlı kimlik doğrulama.
- **bcryptjs:** Kullanıcı parolalarını güvenli bir şekilde hashlemek için.
- **dotenv:** Ortam değişkenlerini yönetmek için.
- **Nodemailer:** İletişim formundan e-posta göndermek için.
- **node-fetch:** Sunucu tarafında Open Library API'ye istek atmak için.

### Frontend

- **HTML5:** Projenin iskeleti.
- **CSS3:** Stil ve görsel tasarım.
- **Vanilla JavaScript:** Arayüz mantığı, API istekleri (fetch), DOM manipülasyonu ve kullanıcı etkileşimleri.
- **Font Awesome:** İkonlar için.

### Geliştirme Araçları

- **Nodemon:** Geliştirme sırasında sunucunun otomatik olarak yeniden başlatılması için.

## 🚀 Kurulum ve Başlatma

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu klonlayın:**

    ```bash
    git clone [https://github.com/Sefa-Kara/Beautiful-Library.git](https://github.com/Sefa-Kara/Beautiful-Library.git)
    cd Beautiful-Library
    ```

2.  **Gerekli paketleri yükleyin:**

    ```bash
    npm install
    ```

3.  **Ortam Değişkenlerini Ayarlayın:**
    Ana dizinde `.env` adında bir dosya oluşturun ve aşağıdaki değişkenleri kendi bilgilerinizle doldurun:

    ```env
    # MongoDB bağlantı cümleniz
    MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/myLibraryDB

    # JWT için gizli anahtarınız
    JWT_SECRET=sizin_cok_gizli_anahtariniz

    # Sunucunun çalışacağı port
    PORT=3000

    # Nodemailer ayarları (opsiyonel, iletişim formu için)
    EMAIL_HOST=smtp.gmail.com
    EMAIL_USER=mailadresiniz@gmail.com
    EMAIL_PASS=uygulama_sifreniz
    ```

4.  **Uygulamayı başlatın (Geliştirme Modu):**
    `package.json` dosyasındaki `start` script'i `nodemon` kullanır:
    ```bash
    npm start
    ```

Sunucunuz varsayılan olarak `http://localhost:3000` adresinde çalışmaya başlayacaktır.

## ⚙️ Proje Mimarisi ve Mantığı

Projenin işleyişi temel olarak iki ana katmana ayrılmıştır:

### 1. Backend (Sunucu Tarafı)

- **Giriş Noktası:** `app.js` (tahmini, `package.json`'a göre) Express sunucusunu başlatır, middleware'leri (CORS, cookie-parser, express.static) yapılandırır ve rota dosyalarını (örn. `auth.js`) yükler.
- **Kimlik Doğrulama (`auth.js`):**
  - `/register`: Yeni kullanıcı oluşturur, şifreyi `bcrypt` ile hashler (`User.js` modelindeki `pre-save` hook'u sayesinde) ve bir JWT token döner.
  - `/login`: Kullanıcıyı e-posta ile bulur, `bcrypt.compare` ile şifreyi doğrular ve başarılıysa yeni bir JWT token döner.
  - `/me`: Geçerli bir token ile giriş yapmış kullanıcının favorileri ve incelemeleri dahil tüm profil bilgilerini döner.
- **Veri Modeli (`User.js`):**
  - Kullanıcıların `name`, `surname`, `email` ve `password` gibi temel bilgilerini tutar.
  - Ayrıca `favorites`, `readingHistory` ve `reviews` gibi kitaplarla ilgili verileri doğrudan kullanıcı belgesi içine gömülü diziler olarak saklar.
- **Kitap Servisi (`books.js`):**
  - Uygulamanın kitap verilerini yöneten çekirdek servisidir.
  - `initializeBooks` fonksiyonu, Open Library API'nin `/trending/alltime` ve `/trending/yearly` endpoint'lerine paralel istekler atar.
  - Gelen verileri tekilleştirir ve eksik bilgileri (sayfa sayısı gibi) tamamlamak için ek API çağrıları yapar.
  - Sonuçları sunucu tarafında bir `bookCache` değişkeninde saklayarak API limitlerine takılmayı ve yavaşlığı önler.

### 2. Frontend (İstemci Tarafı)

- **Ana Görünüm (`index.html`):** Kütüphanenin ana giriş noktasıdır. `script.js` (dosyası sağlanmadı) muhtemelen backend'den alınan kitap verilerini (`bookCache`) kullanarak A-Z raflarını dinamik olarak oluşturur.
- **Sayfalar (`about.html`, `contact.html`):** Proje ve geliştirici hakkında statik bilgiler sunar.
- **Etkileşim:**
  - Kullanıcı bir kitaba tıkladığında `#bookModal` açılır.
  - Kullanıcı yorum yapmak istediğinde `#reviewModal` kullanılır.
  - Tüm kullanıcıya özel işlemler (favoriye ekleme, yorum yapma) `fetch` API kullanılarak backend'e (örn. `/api/auth/me` veya `/api/books/favorite`) gönderilir.

## 📄 API Endpoints (Örnek)

`auth.js` dosyasına dayalı olarak tanımlanan ana kimlik doğrulama rotaları:

- `POST /api/auth/register`: Yeni kullanıcı kaydı.
- `POST /api/auth/login`: Kullanıcı girişi.
- `GET /api/auth/me`: Giriş yapmış kullanıcının profil bilgilerini getirir (Token gerektirir).
- `PUT /api/auth/me`: Kullanıcının profil bilgilerini günceller (Token gerektirir).

_(Not: `/api` öneki, Express'te rotalar gruplanırken kullanılan yaygın bir yöntemdir ve `app.js` dosyasındaki yapılandırmaya göre değişiklik gösterebilir.)_

## 🧑‍💻 Yazar

- **Mustafa Sefa Kara**
- **GitHub:** [@Sefa-Kara](https://github.com/Sefa-Kara)
- **LinkedIn:** [linkedin.com/in/mustafasefakara](https://www.linkedin.com/in/mustafasefakara/)
- **Portfolyo:** [mustafasefakara.biz.com](https://mustafasefakara.biz.com)
