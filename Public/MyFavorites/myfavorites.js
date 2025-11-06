let myFavorites = [];
// allBooks is declared in script.js, we'll just use it
// bookColors is declared in script.js, we'll just use it

document.addEventListener("DOMContentLoaded", async () => {
  // Load AuthUtils if not already loaded
  if (typeof AuthUtils === 'undefined') {
    const script = document.createElement('script');
    script.src = '/auth-utils.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  setupSearch();
  setupUserDropdown();
  setupModal();

  // Listen for logout events
  window.addEventListener('auth:logout', () => {
    window.location.href = '/login';
  });

  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    // Fetch user's own favorites
    const response = await fetch("/api/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof AuthUtils !== 'undefined') {
          AuthUtils.clearAuth();
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        }
        window.location.href = "/login";
        return;
      }
      throw new Error("Failed to load favorites");
    }

    myFavorites = await response.json();

    // Fetch all books for metadata
    const booksRes = await fetch("/books");
    allBooks = await booksRes.json();

    // Enrich favorites with metadata
    myFavorites = myFavorites.map(fav => {
      const bookMeta = allBooks.find(b => b.title === fav.title);
      return {
        ...fav,
        author: fav.author || bookMeta?.author || "Unknown Author",
        year: bookMeta?.year || null,
        pages: bookMeta?.pages || null,
      };
    });

    if (!myFavorites.length) {
      document.getElementById("favoritesContainer").innerHTML =
        '<div class="no-books">No favorite books yet. Start adding some!</div>';
      document.getElementById("loading").style.display = "none";
      return;
    }

    renderFavoriteBooks(myFavorites);
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading favorites:", error);
    document.getElementById("loading").textContent = "Error loading favorites...";
  }
});

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
      const matchingBooks = myFavorites
        .filter(
          (book) =>
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author && book.author.toString().toLowerCase().includes(searchTerm))
        )
        .slice(0, 5);

      if (matchingBooks.length === 0) {
        suggestionsContainer.innerHTML = '<div class="no-suggestions">No books found</div>';
      } else {
        const html = matchingBooks
          .map(
            (book) => `
            <div class="suggestion-item" data-title="${book.title}">
              <div class="title">${highlightMatch(book.title, searchTerm)}</div>
              <div class="author">by ${book.author || "Unknown Author"}</div>
            </div>
          `
          )
          .join("");

        suggestionsContainer.innerHTML = html;

        const suggestionItems = suggestionsContainer.querySelectorAll(".suggestion-item");
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

  function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsContainer.style.display = "none";
    }
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const firstSuggestion = suggestionsContainer.querySelector(".suggestion-item");
      if (firstSuggestion) {
        const title = firstSuggestion.dataset.title;
        const selectedBook = myFavorites.find((b) => b.title === title);
        if (selectedBook) {
          searchInput.value = selectedBook.title;
          suggestionsContainer.style.display = "none";
          highlightBook(selectedBook);
        }
      }
    }
  });
}

function renderFavoriteBooks(books) {
  const container = document.getElementById("favoritesContainer");
  container.innerHTML = "";

  const booksPerFloor = 17;
  const numFloors = Math.ceil(books.length / booksPerFloor);

  for (let floor = 0; floor < numFloors; floor++) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "shelf-floor";

    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `Floor ${floor + 1}`;
    floorDiv.appendChild(floorLabel);

    const floorBooksDiv = document.createElement("div");
    floorBooksDiv.className = "floor-books";

    const startIndex = floor * booksPerFloor;
    const endIndex = Math.min(startIndex + booksPerFloor, books.length);

    for (let i = startIndex; i < endIndex; i++) {
      const book = books[i];
      const spine = createBookSpine(book, i);
      floorBooksDiv.appendChild(spine);
    }

    floorDiv.appendChild(floorBooksDiv);
    container.appendChild(floorDiv);

    if (endIndex - startIndex === booksPerFloor) {
      adjustBookWidths(floorBooksDiv);
    }
  }
}

function createBookSpine(book, index) {
  const spine = document.createElement("div");
  spine.className = "book-spine";

  const height = 180 + Math.random() * 60;
  spine.style.height = `${height}px`;

  const width = 35 + Math.random() * 15;
  spine.style.width = `${width}px`;

  const color = bookColors[index % bookColors.length];
  spine.style.background = `linear-gradient(90deg, 
    ${adjustColor(color, -30)} 0%, 
    ${color} 10%, 
    ${adjustColor(color, 20)} 50%, 
    ${color} 90%, 
    ${adjustColor(color, -30)} 100%)`;

  const title = document.createElement("div");
  title.className = "book-title";
  title.textContent = book.title.length > 30 ? book.title.substring(0, 30) + "..." : book.title;
  spine.appendChild(title);

  spine.addEventListener("click", () => showBookDetails(book));

  return spine;
}

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

function adjustBookWidths(floorBooksDiv) {
  const books = floorBooksDiv.querySelectorAll(".book-spine");
  if (books.length === 0) return;

  const floorWidth = floorBooksDiv.clientWidth;
  const sideMargin = floorWidth * 0.02;
  const gap = 8;
  const totalGap = (books.length - 1) * gap;

  let totalBookWidth = 0;
  books.forEach((book) => {
    const originalWidth = parseFloat(book.dataset.originalWidth) || parseFloat(getComputedStyle(book).width);
    book.dataset.originalWidth = originalWidth;
    totalBookWidth += originalWidth;
  });

  const availableWidth = floorWidth - totalGap - 2 * sideMargin;
  const ratio = totalBookWidth > availableWidth ? availableWidth / totalBookWidth : 1;

  books.forEach((book) => {
    const newWidth = (parseFloat(book.dataset.originalWidth) || 40) * ratio;
    book.style.width = `${newWidth}px`;
  });
}

function highlightBook(book) {
  const bookSpines = document.querySelectorAll(".book-spine");
  let targetBook;

  bookSpines.forEach((spine) => {
    const titleElement = spine.querySelector(".book-title");
    if (titleElement && titleElement.textContent.includes(book.title)) {
      targetBook = spine;
      const floorElement = spine.closest(".shelf-floor");
      if (floorElement) {
        floorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      spine.style.transform = "scale(1.1) translateY(-10px)";
      spine.style.boxShadow = "0 0 20px rgba(212, 175, 55, 0.5)";
      spine.style.zIndex = "100";
      setTimeout(() => {
        spine.style.transform = "";
        spine.style.boxShadow = "";
        spine.style.zIndex = "";
      }, 2000);
      showBookDetails(book);
    }
  });
}

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

// Reuse showBookDetails and toggleFavorite from main script
window.showBookDetails = window.showBookDetails || async function(book) {
  const modal = document.getElementById("bookModal");
  const details = document.getElementById("bookDetails");

  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  let isFavorite = false;

  if (token) {
    try {
      const user = typeof AuthUtils !== 'undefined' 
        ? AuthUtils.getUser() 
        : JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      isFavorite = user.favorites?.some((fav) => fav.bookId === book.title);
    } catch (e) {
      console.error("Error checking favorite:", e);
    }
  }

  details.innerHTML = `
    <h2>${escapeHtml(book.title)}</h2>
    <div class="book-header">
        <button class="favorite-btn ${isFavorite ? "active" : ""}" 
                onclick="toggleFavorite('${book.title.replace(/'/g, "\\'")}', '${(book.author || "Unknown Author").replace(/'/g, "\\'")}')"
                data-bookid="${book.title.replace(/"/g, '&quot;')}">
            <i class="fas fa-star"></i>
            <span class="tooltip">${isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
        </button>
    </div>
    <p><strong>Author:</strong> ${escapeHtml(book.author || "Unknown Author")}</p>
    ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
    ${book.pages ? `<p><strong>Pages:</strong> ${book.pages}</p>` : ''}
  `;

  modal.classList.add("show");
};

window.toggleFavorite = window.toggleFavorite || async function(bookId, author) {
  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  if (!token) {
    alert("Please login to use favorites");
    return;
  }

  try {
    const user = typeof AuthUtils !== 'undefined' 
      ? AuthUtils.getUser() 
      : JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    const favoriteBtn = document.querySelector(`.favorite-btn[data-bookid="${CSS.escape(bookId)}"]`);
    const isFavorite = favoriteBtn.classList.contains("active");

    const response = await fetch("/api/favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookId: bookId,
        title: bookId,
        author: author,
        dateAdded: new Date(),
      }),
    });

    if (!response.ok) throw new Error("Failed to update favorites");

    favoriteBtn.classList.toggle("active");
    
    // Reload page to update list
    location.reload();
  } catch (error) {
    console.error("Error toggling favorite:", error);
    alert("Failed to update favorites");
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
}

