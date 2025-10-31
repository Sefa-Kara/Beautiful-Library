document.addEventListener("DOMContentLoaded", async () => {
  // Reuse dropdown and search from main script
  setupUserDropdown();
  setupSearch();
  // Ensure book and review modals work here too
  setupModal();
  (function ensureReviewModal() {
    if (typeof ensureReviewModalSetup === 'function') ensureReviewModalSetup();
  })();

  try {
    const res = await fetch("/api/reviews");
    const reviews = await res.json();
    renderReviews(reviews);
    document.getElementById("loading").style.display = "none";
  } catch (e) {
    console.error("Error loading reviews:", e);
    document.getElementById("loading").textContent = "Error loading reviews...";
  }
});

function renderReviews(reviews) {
  const list = document.getElementById("reviewsList");
  list.innerHTML = "";
  if (!Array.isArray(reviews) || reviews.length === 0) {
    list.innerHTML = '<div class="no-books">No reviews yet</div>';
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


