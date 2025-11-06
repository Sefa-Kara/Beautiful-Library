window.initLibrary = null;
window.createShelves = null;
window.loadBooks = null;
window.setupDragging = null;

// Global olarak kitapları tutacak bir değişken ekleyelim
let popularBooks = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Search ve User Dropdown fonksiyonlarını aktifleştir
  setupSearch();
  setupUserDropdown();

  try {
    const response = await fetch("/api/favorites/popular");
    popularBooks = await response.json(); // Global değişkene atama yaptık

    if (!popularBooks.length) {
      document.getElementById("favoritesContainer").innerHTML =
        '<div class="no-books">No favorite books found</div>';
      return;
    }

    renderFavoriteBooks(popularBooks);
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading favorites:", error);
    document.getElementById("loading").textContent =
      "Error loading favorites...";
  }
});

// Search functionality için gerekli fonksiyonlar
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("searchSuggestions");
  let debounceTimer;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
      suggestionsContainer.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(() => {
      // Favori kitaplar arasında arama yap
      const matchingBooks = popularBooks
        .filter(
          (book) =>
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author &&
              book.author.toString().toLowerCase().includes(searchTerm))
        )
        .slice(0, 5); // Maksimum 5 öneri göster

      if (matchingBooks.length === 0) {
        suggestionsContainer.innerHTML =
          '<div class="no-suggestions">No books found</div>';
      } else {
        const html = matchingBooks
          .map(
            (book) => `
            <div class="suggestion-item" data-title="${book.title}">
              <div class="title">${highlightMatch(book.title, searchTerm)}</div>
              <div class="author">by ${book.author || "Unknown Author"}</div>
              <div class="favorite-count">${
                book.favoriteCount || 0
              } favorites</div>
            </div>
          `
          )
          .join("");

        suggestionsContainer.innerHTML = html;

        // Öneri tıklama olaylarını ekle
        const suggestionItems =
          suggestionsContainer.querySelectorAll(".suggestion-item");
        suggestionItems.forEach((item) => {
          item.addEventListener("click", () => {
            const selectedBook = matchingBooks.find(
              (b) => b.title === item.dataset.title
            );
            if (selectedBook) {
              searchInput.value = selectedBook.title;
              suggestionsContainer.style.display = "none";
              highlightBook(selectedBook);
            }
          });
        });
      }

      suggestionsContainer.style.display = "block";
    }, 300);
  });

  // Eşleşen metni vurgula
  function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  }

  // Dışarı tıklandığında önerileri kapat
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsContainer.style.display = "none";
    }
  });

  // Enter tuşuna basıldığında ilk öneriyi seç
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const firstSuggestion =
        suggestionsContainer.querySelector(".suggestion-item");
      if (firstSuggestion) {
        const title = firstSuggestion.dataset.title;
        const selectedBook = popularBooks.find((b) => b.title === title);
        if (selectedBook) {
          searchInput.value = selectedBook.title;
          suggestionsContainer.style.display = "none";
          highlightBook(selectedBook);
        }
      }
    }
  });
}

// User dropdown için gerekli fonksiyonlar
function setupUserDropdown() {
  const profile = document.getElementById("userProfile");
  const dropdown = document.getElementById("userDropdown");
  const dropdownHeader = document.getElementById("dropdownHeader");
  const dropdownMenu = document.getElementById("dropdownMenu");

  function isUserLoggedIn() {
    if (typeof AuthUtils !== 'undefined') {
      return AuthUtils.isAuthenticated();
    }
    return !!(localStorage.getItem("user") || sessionStorage.getItem("user"));
  }

  function updateDropdownContent() {
    if (isUserLoggedIn()) {
      // Giriş yapmış kullanıcı için görünüm
      const user = typeof AuthUtils !== 'undefined' 
        ? AuthUtils.getUser() 
        : JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");

      profile.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0)}${user.surname.charAt(
        0
      )}</div>
        <span class="user-name">${user.name} ${user.surname}</span>
        <i class="fas fa-chevron-down"></i>
      `;

      dropdownHeader.innerHTML = `
        <h3>${user.name} ${user.surname}</h3>
        <p>${user.membershipType || "Standard Member"}</p>
      `;

      dropdownMenu.innerHTML = `
        <li><a href="/profile"><i class="fas fa-user"></i> My Profile</a></li>
        <li><a href="/my-favorites"><i class="fas fa-bookmark"></i> My Favorites</a></li>
        <li><a href="/my-reviews"><i class="fas fa-star"></i> My Reviews</a></li>
        <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        <li><a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      `;
    } else {
      profile.innerHTML = `
        <div class="user-avatar"><i class="fas fa-user"></i></div>
        <span class="user-name">Guest</span>
        <i class="fas fa-chevron-down"></i>
      `;

      dropdownHeader.innerHTML = `
        <h3>Welcome, Guest</h3>
        <p>Please login to continue</p>
      `;

      dropdownMenu.innerHTML = `
        <li><a href="/login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
        <li><a href="/register"><i class="fas fa-user-plus"></i> Register</a></li>
      `;
    }
  }

  // Çıkış yapma fonksiyonu
  window.logout = async function () {
    if (typeof AuthUtils !== 'undefined') {
      await AuthUtils.logout('/login');
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      updateDropdownContent();
      window.location.href = "/login";
    }
  };

  profile.addEventListener("click", () => {
    dropdown.classList.toggle("show");
  });

  // Dropdown dışına tıklandığında kapat
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#userProfile") &&
      !e.target.closest("#userDropdown")
    ) {
      dropdown.classList.remove("show");
    }
  });

  // Sayfa yüklendiğinde ve kullanıcı durumu değiştiğinde dropdown içeriğini güncelle
  updateDropdownContent();
  window.addEventListener("storage", (e) => {
    if (e.key === "user") {
      updateDropdownContent();
    }
  });
}

function renderFavoriteBooks(books) {
  const container = document.getElementById("favoritesContainer");
  container.innerHTML = "";

  const booksPerFloor = 17; // Her katta maksimum 17 kitap
  const numFloors = Math.ceil(books.length / booksPerFloor);

  for (let floor = 0; floor < numFloors; floor++) {
    // Create floor container
    const floorDiv = document.createElement("div");
    floorDiv.className = "shelf-floor";

    // Add floor label
    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `Floor ${floor + 1}`;
    floorDiv.appendChild(floorLabel);

    // Create floor books container
    const floorBooksDiv = document.createElement("div");
    floorBooksDiv.className = "floor-books";

    // Calculate start and end indices for this floor
    const startIndex = floor * booksPerFloor;
    const endIndex = Math.min(startIndex + booksPerFloor, books.length);

    // Add books for this floor
    for (let i = startIndex; i < endIndex; i++) {
      const book = books[i];
      const spine = document.createElement("div");
      spine.className = "book-spine";

      // Random height between 180-240px
      const height = 180 + Math.random() * 60;
      spine.style.height = `${height}px`;

      // Random width between 35-50px
      const width = 35 + Math.random() * 15;
      spine.style.width = `${width}px`;

      // Color based on index
      const color = bookColors[i % bookColors.length];
      spine.style.background = `linear-gradient(90deg, 
              ${adjustColor(color, -30)} 0%, 
              ${color} 10%, 
              ${adjustColor(color, 20)} 50%, 
              ${color} 90%, 
              ${adjustColor(color, -30)} 100%)`;

      // Book title
      const title = document.createElement("div");
      title.className = "book-title";
      title.textContent =
        book.title.length > 30
          ? book.title.substring(0, 30) + "..."
          : book.title;
      spine.appendChild(title);

      // Favorite count tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "favorite-count";
      tooltip.textContent = `${book.favoriteCount || 0} favorites`;
      spine.appendChild(tooltip);

      // Click event
      spine.addEventListener("click", () => showBookDetails(book));

      floorBooksDiv.appendChild(spine);
    }

    floorDiv.appendChild(floorBooksDiv);
    container.appendChild(floorDiv);
  }
}

function adjustColor(color, amount) {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.max(Math.min(r, 255), 0);
  g = Math.max(Math.min(g, 255), 0);
  b = Math.max(Math.min(b, 255), 0);

  return (
    (usePound ? "#" : "") +
    ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
  );
}

// toggleFavorite fonksiyonunu ekleyelim
async function toggleFavorite(bookId, author) {
  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  const user = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getUser() 
    : (localStorage.getItem("user") || sessionStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user")) : null);

  if (!token || !user) {
    showLoginAlert();
    return;
  }

  try {
    const button = document.querySelector(
      `.favorite-btn[data-bookid="${CSS.escape(bookId)}"]`
    );
    const isCurrentlyFavorite = button.classList.contains("active");

    const response = await fetch("/api/favorites", {
      method: isCurrentlyFavorite ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookId,
        title: bookId, // bookId olarak title kullanıyoruz
        author,
        dateAdded: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update favorites");
    }

    // Buton durumunu güncelle
    button.classList.toggle("active");
    
    // Update tooltip text immediately
    const tooltip = button.querySelector(".tooltip");
    if (tooltip) {
      tooltip.textContent = button.classList.contains("active") 
        ? "Remove from favorites" 
        : "Add to favorites";
    }

    // Kitabın güncel favori durumunu API'den al
    const popularResponse = await fetch("/api/favorites/popular");
    const updatedPopularBooks = await popularResponse.json();

    if (isCurrentlyFavorite) {
      // Favorilerden çıkar
      if (!user.favorites) user.favorites = [];
      user.favorites = user.favorites.filter((fav) => fav.bookId !== bookId);
      showNotification("Kitap favorilerinizden çıkarıldı");

      // Popüler kitaplar listesini güncelle
      const updatedBook = updatedPopularBooks.find(
        (book) => book.bookId === bookId
      );
      const bookIndex = popularBooks.findIndex((book) => book.title === bookId);

      if (bookIndex !== -1) {
        if (updatedBook) {
          // Kitap hala popüler listesinde varsa, sayısını güncelle
          popularBooks[bookIndex].favoriteCount = updatedBook.favoriteCount;
        } else {
          // Kitap artık popüler değilse listeden kaldır
          popularBooks.splice(bookIndex, 1);
        }
      }
    } else {
      // Favorilere ekle
      if (!user.favorites) user.favorites = [];
      user.favorites.push({ bookId, title: bookId, author, dateAdded: new Date() });
      showNotification("Kitap favorilerinize eklendi");

      // Popüler kitaplar listesini güncelle
      const updatedBook = updatedPopularBooks.find(
        (book) => book.bookId === bookId
      );
      const bookIndex = popularBooks.findIndex((book) => book.title === bookId);

      if (updatedBook) {
        if (bookIndex !== -1) {
          popularBooks[bookIndex].favoriteCount = updatedBook.favoriteCount;
        } else {
          popularBooks.push(updatedBook);
        }
      }
    }

    // Update user data
    if (typeof AuthUtils !== 'undefined') {
      const storage = AuthUtils.getStorage();
      storage.setItem("user", JSON.stringify(user));
    } else {
      const storage = localStorage.getItem("rememberMe") === "true" ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(user));
    }

    // Sayfayı yeniden render et
    popularBooks = popularBooks.sort(
      (a, b) => b.favoriteCount - a.favoriteCount
    );
    renderFavoriteBooks(popularBooks);

    // Kitap detayları modalı açıksa, oradaki favori sayısını da güncelle
    const bookDetailsElement = document.getElementById("bookDetails");
    if (bookDetailsElement.style.display !== "none") {
      const favoriteCountElement =
        bookDetailsElement.querySelector("p:last-child");
      const updatedBook = popularBooks.find((book) => book.title === bookId);
      if (favoriteCountElement && updatedBook) {
        favoriteCountElement.innerHTML = `<strong>Favorite Count:</strong> ${updatedBook.favoriteCount}`;
      }
    }
  } catch (error) {
    console.error("Error updating favorites:", error);
    showNotification("Bir hata oluştu. Lütfen tekrar deneyin.", "error");
  }
}

// Bildirim gösterme fonksiyonu
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3 saniye sonra bildirimi kaldır
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// CSS için stil ekleyelim
const notificationStyle = document.createElement("style");
notificationStyle.textContent = `
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.notification.success {
  background-color: #4caf50;
}

.notification.error {
  background-color: #f44336;
}
`;
document.head.appendChild(notificationStyle);

// Modal kapama işlemleri
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("bookModal").classList.remove("show");
});

window.addEventListener("click", (e) => {
  const modal = document.getElementById("bookModal");
  if (e.target === modal) {
    modal.classList.remove("show");
  }
});

// Kitabı vurgulama ve gösterme fonksiyonu
function highlightBook(book) {
  const bookSpines = document.querySelectorAll(".book-spine");
  let targetBook;

  bookSpines.forEach((spine) => {
    const titleElement = spine.querySelector(".book-title");
    if (titleElement && titleElement.textContent.includes(book.title)) {
      targetBook = spine;

      // Kitabın bulunduğu floor'a scroll
      const floorElement = spine.closest(".shelf-floor");
      if (floorElement) {
        floorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Kitabı vurgula
      spine.style.transform = "scale(1.1) translateY(-10px)";
      spine.style.boxShadow = "0 0 20px rgba(212, 175, 55, 0.5)";
      spine.style.zIndex = "100";

      // 2 saniye sonra vurgulamayı kaldır
      setTimeout(() => {
        spine.style.transform = "";
        spine.style.boxShadow = "";
        spine.style.zIndex = "";
      }, 2000);

      // Kitap detaylarını göster
      showBookDetails(book);
    }
  });
}

// Remove custom styles - use main stylesheet instead
