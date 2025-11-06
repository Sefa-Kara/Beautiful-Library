let userProfile = null;
// allBooks is declared in script.js, we'll just use it

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
    // Fetch user profile
    const profileRes = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileRes.ok) {
      if (profileRes.status === 401) {
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
      throw new Error("Failed to load profile");
    }

    userProfile = await profileRes.json();

    // Fetch all books for metadata
    const booksRes = await fetch("/books");
    allBooks = await booksRes.json();

    renderProfile();
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("loading").textContent = "Error loading profile...";
  }
});

function renderProfile() {
  if (!userProfile) return;

  // Update header
  const avatar = document.getElementById("profileAvatar");
  const name = userProfile.name || "";
  const surname = userProfile.surname || "";
  avatar.innerHTML = `${name.charAt(0)}${surname.charAt(0)}`;

  document.getElementById("profileName").textContent = `${name} ${surname}`;
  document.getElementById("profileEmail").textContent = userProfile.email || "No email";
  
  const memberDate = userProfile.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString()
    : "Unknown";
  document.getElementById("memberSince").textContent = `Member since: ${memberDate}`;

  // Update stats
  document.getElementById("favoritesCount").textContent = (userProfile.favorites || []).length;
  document.getElementById("reviewsCount").textContent = (userProfile.reviews || []).length;

  // Render favorites
  renderFavorites(userProfile.favorites || []);
  
  // Render reviews
  renderReviews(userProfile.reviews || []);
}

function renderFavorites(favorites) {
  const container = document.getElementById("favoritesList");
  if (!favorites || favorites.length === 0) {
    container.innerHTML = '<div class="no-items">No favorite books yet</div>';
    return;
  }

  // Enrich with metadata
  const enrichedFavorites = favorites.map(fav => {
    const bookMeta = allBooks.find(b => b.title === fav.title);
    return {
      ...fav,
      author: fav.author || bookMeta?.author || "Unknown Author",
      year: bookMeta?.year || null,
      pages: bookMeta?.pages || null,
    };
  });

  container.innerHTML = enrichedFavorites.map((fav, index) => {
    return `
    <div class="favorite-item" data-book='${JSON.stringify(fav).replace(/'/g, "&#39;")}'>
      <h3><i class="fas fa-book"></i> ${escapeHtml(fav.title)}</h3>
      <p><strong>Author:</strong> ${escapeHtml(fav.author)}</p>
      ${fav.year ? `<p><strong>Year:</strong> ${fav.year}</p>` : ''}
      ${fav.pages ? `<p><strong>Pages:</strong> ${fav.pages}</p>` : ''}
      <p class="date-added"><strong>Added:</strong> ${formatDate(fav.dateAdded)}</p>
    </div>
  `;
  }).join('');

  // Add event listeners
  container.querySelectorAll('.favorite-item').forEach(item => {
    item.addEventListener('click', () => {
      const bookData = JSON.parse(item.dataset.book);
      showBookDetailsFromProfile(bookData);
    });
  });
}

function renderReviews(reviews) {
  const container = document.getElementById("reviewsList");
  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<div class="no-items">No reviews yet</div>';
    return;
  }

  // Sort by date (newest first)
  const sortedReviews = [...reviews].sort((a, b) => 
    new Date(b.dateReviewed || b.createdAt) - new Date(a.dateReviewed || a.createdAt)
  );

  container.innerHTML = sortedReviews.map(review => {
    const bookData = {
      title: review.title,
      author: review.author || 'Unknown Author',
      year: review.year || null,
      pages: review.pages || null,
    };
    return `
    <div class="review-item" data-book='${JSON.stringify(bookData).replace(/'/g, "&#39;")}'>
      <h3><i class="fas fa-book"></i> ${escapeHtml(review.title)}</h3>
      <div class="review-rating">${renderStars(review.rating || 0)}</div>
      <p class="review-text">${escapeHtml(review.review)}</p>
      <p class="date-reviewed"><strong>Reviewed:</strong> ${formatDate(review.dateReviewed)}</p>
    </div>
  `;
  }).join('');

  // Add event listeners
  container.querySelectorAll('.review-item').forEach(item => {
    item.addEventListener('click', () => {
      const bookData = JSON.parse(item.dataset.book);
      showBookDetailsFromProfile(bookData);
    });
  });
}

function renderStars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += i <= r ? '★' : '☆';
  }
  return out;
}

function formatDate(date) {
  if (!date) return "Unknown";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
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

// Helper function to show book details from profile page
window.showBookDetailsFromProfile = async function(book) {
  if (typeof showBookDetails === 'function') {
    showBookDetails(book);
  } else {
    showBookDetailsLocal(book);
  }
};

// Local showBookDetails function for profile page
function showBookDetailsLocal(book) {
  const modal = document.getElementById("bookModal");
  const details = document.getElementById("bookDetails");

  const token = localStorage.getItem("token");
  let isFavorite = false;

  if (token) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
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

// Reuse toggleFavorite from main script if available, or define local version
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
    
    // Reload profile to update stats
    location.reload();
  } catch (error) {
    console.error("Error toggling favorite:", error);
    alert("Failed to update favorites");
  }
};

