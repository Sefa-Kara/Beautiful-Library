let myReviews = [];
let filteredReviews = [];

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

  setupUserDropdown();
  setupReviewsSearch();
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
    const res = await fetch("/api/reviews/my-reviews", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
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
      throw new Error("Failed to load reviews");
    }

    myReviews = await res.json();
    filteredReviews = [...myReviews];
    renderReviews(filteredReviews);
    document.getElementById("loading").style.display = "none";
  } catch (e) {
    console.error("Error loading reviews:", e);
    document.getElementById("loading").textContent = "Error loading reviews...";
  }
});

function setupReviewsSearch() {
  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("searchSuggestions");
  let debounceTimer;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim().toLowerCase();

    debounceTimer = setTimeout(() => {
      if (searchTerm.length === 0) {
        filteredReviews = [...myReviews];
        renderReviews(filteredReviews);
        suggestionsContainer.style.display = "none";
        return;
      }

      if (searchTerm.length < 2) {
        suggestionsContainer.style.display = "none";
        return;
      }

      filteredReviews = myReviews.filter((review) => {
        const titleMatch = review.title && review.title.toLowerCase().includes(searchTerm);
        const reviewTextMatch = review.review && review.review.toLowerCase().includes(searchTerm);
        return titleMatch || reviewTextMatch;
      });

      renderReviews(filteredReviews);

      if (filteredReviews.length > 0) {
        const html = filteredReviews
          .slice(0, 5)
          .map(
            (review) => `
              <div class="suggestion-item">
                <div class="title">${highlightMatch(review.title, searchTerm)}</div>
                <div class="author">${formatDate(review.dateReviewed)}</div>
              </div>
            `
          )
          .join("");
        suggestionsContainer.innerHTML = html;
        suggestionsContainer.style.display = "block";
      } else {
        suggestionsContainer.innerHTML = '<div class="no-suggestions">No reviews found</div>';
        suggestionsContainer.style.display = "block";
      }
    }, 300);
  });

  function highlightMatch(text, searchTerm) {
    if (!text) return "";
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsContainer.style.display = "none";
    }
  });

  searchInput.addEventListener("focus", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm.length >= 2 && filteredReviews.length > 0) {
      suggestionsContainer.style.display = "block";
    }
  });
}

function renderReviews(reviews) {
  const list = document.getElementById("reviewsList");
  list.innerHTML = "";
  if (!Array.isArray(reviews) || reviews.length === 0) {
    list.innerHTML = '<div class="no-books">No reviews found</div>';
    return;
  }

  reviews.forEach((r) => {
    const card = document.createElement("div");
    card.className = "search-result-item";
    card.innerHTML = `
      <h3><i class="fas fa-book"></i> ${escapeHtml(r.title)}</h3>
      <p><strong>Date:</strong> ${formatDate(r.dateReviewed)}</p>
      <p><strong>Rating:</strong> ${renderStars(r.rating)}</p>
      <p>${escapeHtml(r.review)}</p>
    `;
    card.addEventListener("click", () => {
      showBookDetails({ title: r.title, author: r.author, year: r.year, pages: r.pages });
    });
    list.appendChild(card);
  });
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
}

function renderStars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += i <= r ? '★' : '☆';
  }
  return out;
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

// Reuse showBookDetails from main script if available
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

