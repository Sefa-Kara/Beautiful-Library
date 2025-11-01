let allReviews = [];
let filteredReviews = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Reuse dropdown and search from main script
  setupUserDropdown();
  setupReviewsSearch();
  // Ensure book and review modals work here too
  setupModal();
  (function ensureReviewModal() {
    if (typeof ensureReviewModalSetup === 'function') ensureReviewModalSetup();
  })();

  try {
    const res = await fetch("/api/reviews");
    allReviews = await res.json();
    filteredReviews = [...allReviews];
    renderReviews(filteredReviews);
    document.getElementById("loading").style.display = "none";
  } catch (e) {
    console.error("Error loading reviews:", e);
    document.getElementById("loading").textContent = "Error loading reviews...";
  }
});

// Custom search for Reviews page
function setupReviewsSearch() {
  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("searchSuggestions");
  let debounceTimer;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim().toLowerCase();

    debounceTimer = setTimeout(() => {
      if (searchTerm.length === 0) {
        // Show all reviews if search is empty
        filteredReviews = [...allReviews];
        renderReviews(filteredReviews);
        suggestionsContainer.style.display = "none";
        return;
      }

      if (searchTerm.length < 2) {
        suggestionsContainer.style.display = "none";
        return;
      }

      // Filter reviews by title or review text
      filteredReviews = allReviews.filter((review) => {
        const titleMatch = review.title && review.title.toLowerCase().includes(searchTerm);
        const reviewTextMatch = review.review && review.review.toLowerCase().includes(searchTerm);
        const reviewerMatch = review.reviewerName && review.reviewerName.toLowerCase().includes(searchTerm);
        return titleMatch || reviewTextMatch || reviewerMatch;
      });

      // Update the displayed reviews
      renderReviews(filteredReviews);

      // Show suggestions if there are matches
      if (filteredReviews.length > 0) {
        const html = filteredReviews
          .slice(0, 5)
          .map(
            (review) => `
              <div class="suggestion-item">
                <div class="title">${highlightMatch(review.title, searchTerm)}</div>
                <div class="author">by ${review.reviewerName || "Unknown"}</div>
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

  // Highlight matching text
  function highlightMatch(text, searchTerm) {
    if (!text) return "";
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  }

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsContainer.style.display = "none";
    }
  });

  // Handle focus
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
      <h3><i class=\"fas fa-book\"></i> ${r.title}</h3>
      <p><strong>Reviewer:</strong> ${r.reviewerName || "Unknown"}</p>
      <p><strong>Date:</strong> ${formatDate(r.dateReviewed)}</p>
      <p><strong>Rating:</strong> ${renderStars(r.rating)}</p>
      <p>${escapeHtml(r.review)}</p>
    `;
    card.addEventListener("click", () => {
      // Open the same book details modal with full metadata
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


