document.addEventListener("DOMContentLoaded", async () => {
  // Setup user dropdown
  setupUserDropdown();

  // Load books first, then setup search
  try {
    const books = await fetchBooks();
    console.log("About page: Loaded", books.length, "books");
    if (books.length === 0) {
      console.warn("About page: No books loaded!");
    }
    setupSearch(books);
  } catch (error) {
    console.error("About page: Error loading books:", error);
  }

  // Add scroll animations
  setupScrollAnimations();
});

// User dropdown functionality
function setupUserDropdown() {
  const profile = document.getElementById("userProfile");
  const dropdown = document.getElementById("userDropdown");
  const dropdownHeader = document.getElementById("dropdownHeader");
  const dropdownMenu = document.getElementById("dropdownMenu");

  function isUserLoggedIn() {
    return localStorage.getItem("user") !== null;
  }

  function updateDropdownContent() {
    if (isUserLoggedIn()) {
      const user = JSON.parse(localStorage.getItem("user"));

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
        <li><a href="/favorites"><i class="fas fa-bookmark"></i> My Favorites</a></li>
        <li><a href="/history"><i class="fas fa-history"></i> Reading History</a></li>
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

  window.logout = function () {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    updateDropdownContent();
    window.location.href = "/login";
  };

  profile.addEventListener("click", () => {
    dropdown.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#userProfile") &&
      !e.target.closest("#userDropdown")
    ) {
      dropdown.classList.remove("show");
    }
  });

  updateDropdownContent();
  window.addEventListener("storage", (e) => {
    if (e.key === "user") {
      updateDropdownContent();
    }
  });
}

// Fetch books from API
async function fetchBooks() {
  try {
    const res = await fetch("/books");
    return await res.json();
  } catch (error) {
    console.error("Error fetching books:", error);
    return [];
  }
}

// Search functionality
function setupSearch(books) {
  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("searchSuggestions");

  if (!searchInput || !suggestionsContainer) {
    console.error("Search elements not found");
    return;
  }

  if (!books || books.length === 0) {
    console.warn("Books not loaded yet, search may not work");
  }

  let debounceTimer;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
      suggestionsContainer.style.display = "none";
      return;
    }

    // Check if books are loaded
    if (!books || books.length === 0) {
      suggestionsContainer.innerHTML =
        '<div class="no-suggestions">Loading books...</div>';
      suggestionsContainer.style.display = "block";
      return;
    }

    debounceTimer = setTimeout(() => {
      const matchingBooks = books
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
          .map((book) => {
            const escapedTitle = escapeHtml(book.title);
            const escapedAuthor = escapeHtml(book.author || "Unknown Author");
            // Escape quotes in data attribute
            const safeTitle = (book.title || "").replace(/"/g, "&quot;");
            return `
              <div class="suggestion-item" data-title="${safeTitle}">
                <div class="title">${highlightMatch(
                  escapedTitle,
                  searchTerm
                )}</div>
                <div class="author">by ${escapedAuthor}</div>
              </div>
            `;
          })
          .join("");

        suggestionsContainer.innerHTML = html;

        // Add click handlers to suggestions
        const suggestionItems =
          suggestionsContainer.querySelectorAll(".suggestion-item");
        suggestionItems.forEach((item) => {
          item.addEventListener("click", () => {
            const title = item.dataset.title;
            const selectedBook = matchingBooks.find((b) => b.title === title);
            if (selectedBook) {
              // Store book data to navigate on home page
              localStorage.setItem(
                "navigateToBook",
                JSON.stringify(selectedBook)
              );
              // Navigate to home page
              window.location.href = "/";
            }
          });
        });
      }

      suggestionsContainer.style.display = "block";
    }, 300);
  });

  // Highlight matching text
  function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Escape regex special characters
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Focus event listener
  searchInput.addEventListener("focus", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm.length >= 2) {
      suggestionsContainer.style.display = "block";
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsContainer.style.display = "none";
    }
  });

  // Enter key handler
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const firstSuggestion =
        suggestionsContainer.querySelector(".suggestion-item");
      if (firstSuggestion) {
        const title = firstSuggestion.dataset.title;
        if (books && books.length > 0) {
          const selectedBook = books.find((b) => b.title === title);
          if (selectedBook) {
            // Store book data to navigate on home page
            localStorage.setItem(
              "navigateToBook",
              JSON.stringify(selectedBook)
            );
            // Navigate to home page
            window.location.href = "/";
          }
        }
      }
    }
  });
}

// Scroll animations
function setupScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Observe all sections
  const sections = document.querySelectorAll(".about-section");
  sections.forEach((section) => {
    section.style.opacity = "0";
    section.style.transform = "translateY(30px)";
    section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(section);
  });
}
