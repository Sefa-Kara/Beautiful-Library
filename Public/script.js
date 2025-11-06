// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}

async function fetchBooks() {
  const res = await fetch("/books");
  return await res.json();
}

let allBooks = [];
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load AuthUtils if available
    if (typeof AuthUtils === "undefined") {
      const script = document.createElement("script");
      script.src = "/auth-utils.js";
      document.head.appendChild(script);
    }

    // Mevcut kullanıcı bilgilerini güncelle
    const token =
      typeof AuthUtils !== "undefined"
        ? AuthUtils.getToken()
        : localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
      // Verify token validity
      if (typeof AuthUtils !== "undefined") {
        const isValid = await AuthUtils.verifyToken();
        if (!isValid) {
          // Token invalid, user will be logged out
          return;
        }
      }

      try {
        const response = await fetch("/api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const favorites = await response.json();
          const user =
            typeof AuthUtils !== "undefined"
              ? AuthUtils.getUser()
              : JSON.parse(
                  localStorage.getItem("user") ||
                    sessionStorage.getItem("user") ||
                    "{}"
                );
          if (user) {
            user.favorites = favorites;
            if (typeof AuthUtils !== "undefined") {
              const storage = AuthUtils.getStorage();
              storage.setItem("user", JSON.stringify(user));
            } else {
              const storage =
                localStorage.getItem("rememberMe") === "true"
                  ? localStorage
                  : sessionStorage;
              storage.setItem("user", JSON.stringify(user));
            }
          }
        }
      } catch (e) {
        console.error("Error updating favorites:", e);
      }
    }

    // Only initialize main library if bookshelf container exists
    const wrapper = document.getElementById("bookshelfWrapper");
    const shelfIndicators = document.getElementById("shelfIndicators");
    const isMainPage = !!(wrapper && shelfIndicators);

    if (isMainPage) {
      allBooks = await fetchBooks();
      console.log("Fetched books:", allBooks.length);
      if (!Array.isArray(allBooks) || allBooks.length === 0) {
        console.error("No books loaded");
        return;
      }
      initLibrary();

      // Check if we need to navigate to a book (from About/Contact pages)
      const navigateToBookData = localStorage.getItem("navigateToBook");
      if (navigateToBookData) {
        try {
          const book = JSON.parse(navigateToBookData);
          localStorage.removeItem("navigateToBook");
          // Wait for library to initialize, then navigate
          setTimeout(() => {
            navigateToBook(book);
          }, 500);
        } catch (e) {
          console.error("Error parsing navigateToBook:", e);
        }
      }
    }
  } catch (error) {
    console.error("Error loading books:", error);
    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.textContent = "Error loading library...";
  }
});

// Global variables
let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let currentTranslateX = 0;
let currentShelfIndex = 0;
let isAnimating = false;
const shelves = {};
const shelfLetters = [];
const bookColors = [
  "#8B4513",
  "#A0522D",
  "#CD853F",
  "#D2691E",
  "#B22222",
  "#DC143C",
  "#8B0000",
  "#800000",
  "#2F4F4F",
  "#556B2F",
  "#6B8E23",
  "#808000",
  "#483D8B",
  "#4B0082",
  "#800080",
  "#8B008B",
  "#4682B4",
  "#5F9EA0",
  "#008B8B",
  "#2E8B57",
];

// Initialize the library
function initLibrary() {
  createShelves();
  console.log("shelves created");
  loadBooks();
  console.log("books loaded");
  setupDragging();
  console.log("setup dragged");
  setupModal();
  console.log("setup modal");
  setupUserDropdown();
  console.log("setup user drop down");
  setupSearch();
  console.log("search setup");
  createShelfIndicators();
  console.log("shelf indicators");
  centerShelf(0);
  document.getElementById("loading").style.display = "none";
}

// Create A-Z shelves
function createShelves() {
  const wrapper = document.getElementById("bookshelfWrapper");

  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    shelfLetters.push(letter);

    const shelf = document.createElement("div");
    shelf.className = "shelf";
    shelf.id = `shelf-${letter}`;

    shelf.innerHTML = `
                    <div class="shelf-label">${letter}</div>
                    <div class="shelf-board">
                        <div class="books-container" id="books-${letter}"></div>
                    </div>
                `;

    wrapper.appendChild(shelf);
    shelves[letter] = [];
  }
}

// Create shelf indicators
function createShelfIndicators() {
  const indicatorsContainer = document.getElementById("shelfIndicators");
  if (!indicatorsContainer) return;
  indicatorsContainer.innerHTML = "";

  shelfLetters.forEach((letter, index) => {
    const indicator = document.createElement("div");
    indicator.className = "shelf-indicator";
    if (index === 0) indicator.classList.add("active");
    indicator.dataset.index = index;
    indicator.addEventListener("click", () => {
      centerShelf(index);
    });
    indicatorsContainer.appendChild(indicator);
  });
}

// Center a specific shelf
function centerShelf(index) {
  if (isAnimating) return;

  isAnimating = true;
  currentShelfIndex = index;

  // Calculate the position to center this shelf
  const shelfWidth = window.innerWidth * 0.6; // 60vw
  const targetPosition = -index * shelfWidth;

  // Update indicators
  document.querySelectorAll(".shelf-indicator").forEach((indicator, i) => {
    if (i === index) {
      indicator.classList.add("active");
    } else {
      indicator.classList.remove("active");
    }
  });

  // Animate to the target position
  const wrapper = document.getElementById("bookshelfWrapper");
  wrapper.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
  wrapper.style.transform = `translateX(${targetPosition}px)`;
  currentTranslateX = targetPosition;

  // Reset transition after animation completes
  setTimeout(() => {
    wrapper.style.transition = "none";
    isAnimating = false;
  }, 500);
}

function loadBooks() {
  distributeBooks(allBooks);
}

// Distribute books to appropriate shelves
function distributeBooks(books) {
  books.forEach((book) => {
    const firstLetter = book.title[0].toUpperCase();
    if (firstLetter >= "A" && firstLetter <= "Z") {
      if (!shelves[firstLetter]) {
        shelves[firstLetter] = [];
      }
      shelves[firstLetter].push(book);
    }
  });

  // Sort books in each shelf and render
  Object.keys(shelves).forEach((letter) => {
    shelves[letter].sort((a, b) => a.title.localeCompare(b.title));
    renderShelf(letter);
  });
}

// Render books in a shelf with multiple floors
function renderShelf(letter) {
  const container = document.getElementById(`books-${letter}`);
  container.innerHTML = "";

  if (shelves[letter].length === 0) {
    container.innerHTML = '<div class="no-books">No books yet</div>';
    return;
  }

  // Calculate how many floors we need (max 17 books per floor)
  const booksPerFloor = 17;
  const numFloors = Math.ceil(shelves[letter].length / booksPerFloor);

  for (let floor = 0; floor < numFloors; floor++) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "shelf-floor";

    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `Floor ${floor + 1}`;
    floorDiv.appendChild(floorLabel);

    const floorBooksDiv = document.createElement("div");
    floorBooksDiv.className = "floor-books";
    floorBooksDiv.id = `floor-books-${letter}-${floor}`;

    // Add books for this floor
    const startIndex = floor * booksPerFloor;
    const endIndex = Math.min(
      startIndex + booksPerFloor,
      shelves[letter].length
    );

    for (let i = startIndex; i < endIndex; i++) {
      const book = shelves[letter][i];
      const bookSpine = createBookSpine(book, i);
      floorBooksDiv.appendChild(bookSpine);
    }

    floorDiv.appendChild(floorBooksDiv);
    container.appendChild(floorDiv);

    // Adjust book widths to fit exactly 735px for 17 books
    if (endIndex - startIndex === booksPerFloor) {
      adjustBookWidths(`floor-books-${letter}-${floor}`);
    }
  }
}

function adjustBookWidths(floorId) {
  const floorBooksDiv = document.getElementById(floorId);
  const books = floorBooksDiv.querySelectorAll(".book-spine");
  if (books.length === 0) return;

  const floorWidth = floorBooksDiv.clientWidth;
  const sideMargin = floorWidth * 0.02; // Kenarlarda %2 boşluk
  const gap = 8; // kitaplar arası boşluk
  const totalGap = (books.length - 1) * gap;

  // Kitapları kendi rastgele genişlik değerlerinde bırak
  let totalBookWidth = 0;
  books.forEach((book) => {
    const originalWidth =
      parseFloat(book.dataset.originalWidth) ||
      parseFloat(getComputedStyle(book).width);
    book.dataset.originalWidth = originalWidth;
    totalBookWidth += originalWidth;
  });

  // Eğer toplam genişlik + boşluklar > floorWidth, ufak bir oranla küçült
  const availableWidth = floorWidth - totalGap - 2 * sideMargin;
  const ratio =
    totalBookWidth > availableWidth ? availableWidth / totalBookWidth : 1;

  books.forEach((book) => {
    const newWidth = (parseFloat(book.dataset.originalWidth) || 40) * ratio;
    book.style.width = `${newWidth}px`;
  });
}

// Create a book spine element
function createBookSpine(book, index) {
  const spine = document.createElement("div");
  spine.className = "book-spine";

  // Random height between 180-240px
  const height = 180 + Math.random() * 60;
  spine.style.height = `${height}px`;

  // Base width between 35-50px (will be adjusted later if needed)
  const width = 35 + Math.random() * 15;
  spine.style.width = `${width}px`;

  // Assign color based on index
  const color = bookColors[index % bookColors.length];
  spine.style.background = `linear-gradient(90deg, 
                ${adjustColor(color, -30)} 0%, 
                ${color} 10%, 
                ${adjustColor(color, 20)} 50%, 
                ${color} 90%, 
                ${adjustColor(color, -30)} 100%)`;

  // Add title
  const title = document.createElement("div");
  title.className = "book-title";
  title.textContent =
    book.title.length > 30 ? book.title.substring(0, 30) + "..." : book.title;
  spine.appendChild(title);

  // Add click event
  spine.addEventListener("click", () => showBookDetails(book));

  return spine;
}

// Adjust color brightness
function adjustColor(color, amount) {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (
    (usePound ? "#" : "") +
    ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
  );
}

// Setup horizontal dragging
function setupDragging() {
  const container = document.getElementById("libraryContainer");
  const wrapper = document.getElementById("bookshelfWrapper");

  container.addEventListener("mousedown", (e) => {
    // Check if clicking on a book or modal
    if (e.target.closest(".book-spine") || e.target.closest(".modal")) return;

    isDragging = true;
    container.classList.add("dragging");
    startX = e.pageX;
    scrollLeft = currentTranslateX;
    wrapper.style.transition = "none";
    e.preventDefault();
  });

  container.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const x = e.pageX;
    const walk = (x - startX) * 1.5;
    currentTranslateX = scrollLeft + walk;

    // Limit scrolling
    const maxScroll = 0;
    const minScroll = -(wrapper.scrollWidth - window.innerWidth);
    currentTranslateX = Math.max(
      minScroll,
      Math.min(maxScroll, currentTranslateX)
    );

    wrapper.style.transform = `translateX(${currentTranslateX}px)`;
  });

  container.addEventListener("mouseup", () => {
    isDragging = false;
    container.classList.remove("dragging");

    // Snap to the nearest shelf
    snapToNearestShelf();
  });

  container.addEventListener("mouseleave", () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove("dragging");
      snapToNearestShelf();
    }
  });

  // Handle touch events for mobile
  container.addEventListener("touchstart", (e) => {
    if (e.target.closest(".book-spine") || e.target.closest(".modal")) return;

    isDragging = true;
    container.classList.add("dragging");
    startX = e.touches[0].pageX;
    scrollLeft = currentTranslateX;
    wrapper.style.transition = "none";
    e.preventDefault();
  });

  container.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    const x = e.touches[0].pageX;
    const walk = (x - startX) * 1.5;
    currentTranslateX = scrollLeft + walk;

    // Limit scrolling
    const maxScroll = 0;
    const minScroll = -(wrapper.scrollWidth - window.innerWidth);
    currentTranslateX = Math.max(
      minScroll,
      Math.min(maxScroll, currentTranslateX)
    );

    wrapper.style.transform = `translateX(${currentTranslateX}px)`;
    e.preventDefault();
  });

  container.addEventListener("touchend", () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove("dragging");
      snapToNearestShelf();
    }
  });
}

// Snap to the nearest shelf
function snapToNearestShelf() {
  const shelfWidth = window.innerWidth * 0.6; // 60vw
  const currentPosition = -currentTranslateX;
  const shelfIndex = Math.round(currentPosition / shelfWidth);

  centerShelf(shelfIndex);
}

// Setup modal
function setupModal() {
  const modal = document.getElementById("bookModal");
  const closeBtn = document.getElementById("closeModal");

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
    }
  });
}

// Setup user dropdown
function setupUserDropdown() {
  const profile = document.getElementById("userProfile");
  const dropdown = document.getElementById("userDropdown");
  const dropdownHeader = document.getElementById("dropdownHeader");
  const dropdownMenu = document.getElementById("dropdownMenu");
  function isUserLoggedIn() {
    if (typeof AuthUtils !== "undefined") {
      return AuthUtils.isAuthenticated();
    }
    // Fallback
    return !!(localStorage.getItem("user") || sessionStorage.getItem("user"));
  }

  function updateDropdownContent() {
    if (isUserLoggedIn()) {
      // Giriş yapmış kullanıcı için görünüm
      const user =
        typeof AuthUtils !== "undefined"
          ? AuthUtils.getUser()
          : JSON.parse(
              localStorage.getItem("user") ||
                sessionStorage.getItem("user") ||
                "{}"
            );

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
      // Giriş yapmamış kullanıcı için görünüm
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

  // Sayfa yüklendiğinde dropdown içeriğini güncelle
  updateDropdownContent();

  // Çıkış yapma fonksiyonu
  window.logout = async function () {
    if (typeof AuthUtils !== "undefined") {
      await AuthUtils.logout("/");
    } else {
      // Fallback
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      updateDropdownContent();
      window.location.href = "/login";
    }
  };

  // Function to position dropdown relative to profile button
  function positionDropdown() {
    if (!profile || !dropdown) return;

    const profileRect = profile.getBoundingClientRect();
    const navbar = document.querySelector(".navbar");
    const navbarRect = navbar ? navbar.getBoundingClientRect() : null;

    // Position dropdown below the navbar, aligned with the profile button
    if (navbarRect) {
      dropdown.style.top = `${navbarRect.bottom}px`;
      dropdown.style.right = `${window.innerWidth - profileRect.right}px`;
    } else {
      // Fallback: position below profile button
      dropdown.style.top = `${profileRect.bottom + 5}px`;
      dropdown.style.right = `${window.innerWidth - profileRect.right}px`;
    }
  }

  profile.addEventListener("click", () => {
    positionDropdown(); // Reposition before showing
    dropdown.classList.toggle("show");
  });

  // Reposition dropdown on scroll and resize
  window.addEventListener("scroll", () => {
    if (dropdown.classList.contains("show")) {
      positionDropdown();
    }
  });

  window.addEventListener("resize", () => {
    if (dropdown.classList.contains("show")) {
      positionDropdown();
    }
  });

  // Dropdown dışına tıklandığında kapat
  window.addEventListener("click", (e) => {
    if (
      !e.target.closest("#userProfile") &&
      !e.target.closest("#userDropdown")
    ) {
      dropdown.classList.remove("show");
    }
  });
}

// Search functionality'i güncelleyelim
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("searchSuggestions");
  let debounceTimer;

  // Input event listener
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
      suggestionsContainer.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(() => {
      const matchingBooks = allBooks
        .filter(
          (book) =>
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author &&
              book.author.toString().toLowerCase().includes(searchTerm))
        )
        .slice(0, 5);

      if (matchingBooks.length === 0) {
        suggestionsContainer.innerHTML =
          '<div class="no-suggestions">No books found</div>';
      } else {
        const html = matchingBooks
          .map(
            (book) => `
                    <div class="suggestion-item" data-title="${book.title}">
                        <div class="title">${highlightMatch(
                          book.title,
                          searchTerm
                        )}</div>
                        <div class="author">by ${
                          book.author || "Unknown Author"
                        }</div>
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
              navigateToBook(selectedBook);
            }
          });
        });
      }

      suggestionsContainer.style.display = "block";
    }, 300);
  });

  // Focus event listener
  searchInput.addEventListener("focus", () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm.length >= 2) {
      suggestionsContainer.style.display = "block";
    }
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
        const selectedBook = allBooks.find((b) => b.title === title);
        if (selectedBook) {
          searchInput.value = selectedBook.title;
          suggestionsContainer.style.display = "none";
          navigateToBook(selectedBook);
        }
      }
    }
  });
}

// Kitaba git ve göster
function navigateToBook(book) {
  const firstLetter = book.title[0].toUpperCase();
  const shelfIndex = firstLetter.charCodeAt(0) - 65; // A=0, B=1, etc.

  // Önce ilgili shelf'e git
  centerShelf(shelfIndex);

  // Animasyon bittikten sonra kitabı bul ve göster
  setTimeout(() => {
    const shelfElement = document.getElementById(`shelf-${firstLetter}`);
    const bookElements = shelfElement.querySelectorAll(".book-spine");

    let targetBook;
    bookElements.forEach((bookEl) => {
      if (
        bookEl.querySelector(".book-title").textContent.includes(book.title)
      ) {
        targetBook = bookEl;
      }
    });

    if (targetBook) {
      // Kitabın konumuna scroll
      const shelfBoard = shelfElement.querySelector(".shelf-board");
      const bookTop = targetBook.offsetTop;

      shelfBoard.scrollTo({
        top: Math.max(0, bookTop - 100),
        behavior: "smooth",
      });

      // Kitap detaylarını göster
      setTimeout(() => {
        showBookDetails(book);
        // Kitabı vurgula
        targetBook.style.transform = "scale(1.05)";
        targetBook.style.boxShadow = "0 0 20px rgba(212, 175, 55, 0.5)";
        setTimeout(() => {
          targetBook.style.transform = "";
          targetBook.style.boxShadow = "";
        }, 2000);
      }, 500);
    }
  }, 500); // Shelf kayma animasyonu bittikten sonra
}

window.addEventListener("resize", () => {
  shelfLetters.forEach((letter) => {
    const floors = document.querySelectorAll(`#books-${letter} .shelf-floor`);
    floors.forEach((floor, index) => {
      adjustBookWidths(`floor-books-${letter}-${index}`);
    });
  });
  centerShelf(currentShelfIndex);
});

// showBookDetails fonksiyonunu güncelleyelim
async function showBookDetails(book) {
  const modal = document.getElementById("bookModal");
  const details = document.getElementById("bookDetails");

  // Kullanıcı ve favori durumunu kontrol et
  const token =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getToken()
      : localStorage.getItem("token") || sessionStorage.getItem("token");
  const user =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getUser()
      : localStorage.getItem("user") || sessionStorage.getItem("user")
      ? JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user")
        )
      : null;
  let isFavorite = false;
  let isReviewed = false;

  if (token && user) {
    try {
      // Favori kontrolü
      isFavorite = user.favorites?.some((fav) => fav.bookId === book.title);

      // Eğer localStorage'daki veri güncel değilse API'den kontrol et
      if (isFavorite === undefined) {
        const response = await fetch("/api/favorites/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookId: book.title }),
        });
        const data = await response.json();
        isFavorite = data.isFavorite;

        // Update user data
        if (
          isFavorite &&
          !user.favorites?.some((fav) => fav.bookId === book.title)
        ) {
          user.favorites = user.favorites || [];
          user.favorites.push({
            bookId: book.title,
            title: book.title,
            author: book.author,
          });
          if (typeof AuthUtils !== "undefined") {
            const storage = AuthUtils.getStorage();
            storage.setItem("user", JSON.stringify(user));
          } else {
            const storage =
              localStorage.getItem("rememberMe") === "true"
                ? localStorage
                : sessionStorage;
            storage.setItem("user", JSON.stringify(user));
          }
        }
      }
      // Review kontrolü
      try {
        const reviewResp = await fetch("/api/reviews/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookId: book.title }),
        });
        const reviewData = await reviewResp.json();
        isReviewed = !!reviewData.isReviewed;
      } catch (_) {}
    } catch (e) {
      console.error("Error checking favorite status:", e);
    }
  }

  // Escape HTML and prepare data attributes for safe handling
  const escapedTitle = escapeHtml(book.title || "");
  const escapedAuthor = escapeHtml(book.author || "Unknown Author");
  // Store original values (including null/undefined) for API calls, but use "Unknown Author" for display
  const bookData = JSON.stringify({
    title: book.title || "",
    author: book.author || null, // Use null instead of "Unknown Author" for API
  }).replace(/"/g, "&quot;");

  details.innerHTML = `
    <h2>${escapedTitle}</h2>
    <div class="book-header">
        <button class="favorite-btn ${isFavorite ? "active" : ""}" 
                data-bookid="${escapedTitle.replace(/"/g, "&quot;")}"
                data-bookdata="${bookData}">
            <i class="fas fa-star"></i>
            <span class="tooltip">${
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }</span>
        </button>
        <button class="favorite-btn review-btn ${isReviewed ? "active" : ""}" 
                ${isReviewed ? "disabled" : ""}
                data-bookid="${escapedTitle.replace(/"/g, "&quot;")}"
                data-bookdata="${bookData}">
            <i class="fas fa-pen"></i>
            <span class="tooltip">${
              isReviewed ? "Already reviewed" : "Add review"
            }</span>
        </button>
    </div>
    <p><strong>Author:</strong> ${escapedAuthor}</p>
    <p><strong>Year:</strong> ${book.year || "Unknown Year"}</p>
    <p><strong>Pages:</strong> ${book.pages || "Unknown Pages"}</p>
  `;

  // Add event listeners instead of inline onclick
  const favoriteBtn = details.querySelector(".favorite-btn:not(.review-btn)");
  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", () => {
      try {
        const bookDataStr = favoriteBtn.dataset.bookdata.replace(
          /&quot;/g,
          '"'
        );
        const bookData = JSON.parse(bookDataStr);
        // Use the original title and author, not "Unknown Author" fallback
        const bookTitle = bookData.title || "";
        const bookAuthor =
          bookData.author && bookData.author !== "Unknown Author"
            ? bookData.author
            : null;
        toggleFavorite(bookTitle, bookAuthor);
      } catch (error) {
        console.error("Error parsing book data:", error);
        showNotification("Error: Could not parse book data", "error");
      }
    });
  }

  const reviewBtn = details.querySelector(".review-btn");
  if (reviewBtn && !reviewBtn.disabled) {
    reviewBtn.addEventListener("click", () => {
      const bookData = JSON.parse(
        reviewBtn.dataset.bookdata.replace(/&quot;/g, '"')
      );
      openReviewModal(bookData.title, bookData.author);
    });
  }

  modal.classList.add("show");
}

async function toggleFavorite(bookId, author) {
  // Validate inputs first
  if (!bookId) {
    console.error("toggleFavorite called with invalid bookId:", bookId);
    showNotification("Error: Invalid book information", "error");
    return;
  }

  const token =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getToken()
      : localStorage.getItem("token") || sessionStorage.getItem("token");
  const user =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getUser()
      : localStorage.getItem("user") || sessionStorage.getItem("user")
      ? JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user")
        )
      : null;

  if (!token || !user) {
    showLoginAlert();
    return;
  }
  // CSS seçiciyi güvenli hale getirelim
  const favoriteBtn = document.querySelector(
    `.favorite-btn[data-bookid="${CSS.escape(bookId)}"]`
  );

  if (!favoriteBtn) {
    console.error("Favorite button not found for bookId:", bookId);
    showNotification("Error: Could not find favorite button", "error");
    return;
  }

  const isFavorite = favoriteBtn.classList.contains("active");

  // Validate inputs before making request
  if (!bookId || String(bookId).trim() === "") {
    console.error("Invalid bookId:", bookId);
    showNotification("Error: Invalid book ID", "error");
    return;
  }

  const requestBody = {
    bookId: String(bookId).trim(),
    title: String(bookId).trim(),
    author: author ? String(author).trim() : null,
    dateAdded: new Date().toISOString(),
  };

  try {
    const response = await fetch("/api/favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof AuthUtils !== "undefined") {
          AuthUtils.clearAuth();
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
        }
        showLoginAlert();
        return;
      }
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: `Server error (${response.status})` };
      }
      console.error("API Error:", errorData, "Request body:", requestBody);
      throw new Error(errorData.message || "Failed to update favorites");
    }

    favoriteBtn.classList.toggle("active");

    // Update tooltip text immediately
    const tooltip = favoriteBtn.querySelector(".tooltip");
    if (tooltip) {
      tooltip.textContent = favoriteBtn.classList.contains("active")
        ? "Remove from favorites"
        : "Add to favorites";
    }

    const updatedUser = { ...user };
    if (!isFavorite) {
      if (!updatedUser.favorites) updatedUser.favorites = [];
      updatedUser.favorites.push({ bookId, title: bookId, author });
      showNotification("Book added to favorites");
    } else {
      updatedUser.favorites = updatedUser.favorites.filter(
        (f) => f.bookId !== bookId
      );
      showNotification("Book Removed from favorites");
    }

    // Save updated user
    if (typeof AuthUtils !== "undefined") {
      const storage = AuthUtils.getStorage();
      storage.setItem("user", JSON.stringify(updatedUser));
    } else {
      const storage =
        localStorage.getItem("rememberMe") === "true"
          ? localStorage
          : sessionStorage;
      storage.setItem("user", JSON.stringify(updatedUser));
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    showNotification("Favoriler güncellenirken bir hata oluştu", "error");
  }
}

// Notification function
function showNotification(message, type = "success") {
  // Remove existing notifications
  const existing = document.querySelectorAll(".notification");
  existing.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Add styles if not already present
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        opacity: 1;
        transition: opacity 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 300px;
      }
      .notification.success {
        background: #4caf50;
      }
      .notification.error {
        background: #f44336;
      }
      .notification.info {
        background: #2196f3;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Show login alert function
function showLoginAlert() {
  const alertDiv = document.createElement("div");
  alertDiv.className = "login-alert";
  alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-exclamation-circle"></i>
            <p>Please login to use favorites feature</p>
            <div class="alert-buttons">
                <button onclick="redirectToLogin()">Login</button>
                <button onclick="closeLoginAlert(this)">Cancel</button>
            </div>
        </div>
    `;
  document.body.appendChild(alertDiv);
}

// Close login alert function
function closeLoginAlert(button) {
  const alertDiv = button.closest(".login-alert");
  if (alertDiv) {
    alertDiv.style.opacity = "0";
    setTimeout(() => {
      alertDiv.remove();
    }, 300);
  }
}

// Redirect to login page
function redirectToLogin() {
  // Save current page URL to redirect back after login
  if (typeof AuthUtils !== "undefined") {
    AuthUtils.saveReturnUrl(window.location.pathname);
  } else {
    sessionStorage.setItem("returnUrl", window.location.pathname);
  }
  window.location.href = "/login";
}

// Review Modal logic
let currentReviewContext = { bookId: null, author: null, rating: 0 };

function ensureReviewModalSetup() {
  const modal = document.getElementById("reviewModal");
  if (!modal || modal.dataset.bound === "true") return;
  const stars = Array.from(document.querySelectorAll("#reviewStars span"));
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const val = parseInt(star.dataset.value, 10);
      currentReviewContext.rating = val;
      stars.forEach((s) => {
        s.classList.toggle("active", parseInt(s.dataset.value, 10) <= val);
      });
    });
  });

  document.getElementById("closeReviewModal").addEventListener("click", () => {
    modal.classList.remove("show");
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });

  document
    .getElementById("submitReviewBtn")
    .addEventListener("click", submitReviewFromModal);
  modal.dataset.bound = "true";
}

function openReviewModal(bookId, author) {
  const token =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getToken()
      : localStorage.getItem("token") || sessionStorage.getItem("token");
  const user =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getUser()
      : localStorage.getItem("user") || sessionStorage.getItem("user")
      ? JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user")
        )
      : null;
  if (!token || !user) {
    showLoginAlert();
    return;
  }
  ensureReviewModalSetup();
  currentReviewContext = { bookId, author, rating: 0 };
  const modal = document.getElementById("reviewModal");
  const textarea = document.getElementById("reviewText");
  textarea.value = "";
  document
    .querySelectorAll("#reviewStars span")
    .forEach((s) => s.classList.remove("active"));
  modal.classList.add("show");
}

async function submitReviewFromModal() {
  const token =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getToken()
      : localStorage.getItem("token") || sessionStorage.getItem("token");
  const user =
    typeof AuthUtils !== "undefined"
      ? AuthUtils.getUser()
      : localStorage.getItem("user") || sessionStorage.getItem("user")
      ? JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user")
        )
      : null;
  if (!token || !user) {
    showLoginAlert();
    return;
  }
  const text = document.getElementById("reviewText").value.trim();
  const rating = currentReviewContext.rating || 0;
  if (!text) {
    showNotification("Please write a review", "error");
    return;
  }
  if (rating < 1 || rating > 5) {
    showNotification("Please select a star rating", "error");
    return;
  }
  const { bookId } = currentReviewContext;
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookId, title: bookId, review: text, rating }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to submit review");
    }

    // Disable review button in book modal
    const btn = document.querySelector(
      `.review-btn[data-bookid="${CSS.escape(bookId)}"]`
    );
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("disabled", "true");
      const tooltip = btn.querySelector(".tooltip");
      if (tooltip) tooltip.textContent = "Already reviewed";
    }

    // Update local user cache
    user.reviews = user.reviews || [];
    user.reviews.push({
      bookId,
      title: bookId,
      review: text,
      rating,
      dateReviewed: new Date().toISOString(),
    });

    // Save updated user
    if (typeof AuthUtils !== "undefined") {
      const storage = AuthUtils.getStorage();
      storage.setItem("user", JSON.stringify(user));
    } else {
      const storage =
        localStorage.getItem("rememberMe") === "true"
          ? localStorage
          : sessionStorage;
      storage.setItem("user", JSON.stringify(user));
    }

    document.getElementById("reviewModal").classList.remove("show");
    showNotification("Review submitted");
  } catch (e) {
    console.error(e);
    showNotification(e.message || "Failed to submit review", "error");
  }
}
