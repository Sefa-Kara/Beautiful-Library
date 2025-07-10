// Book data
const books = [
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    genre: "Classic Literature",
    color: "book-brown",
    summary:
      "Set in the fictional town of Maycomb, Alabama, during the 1930s, this novel follows young Scout Finch as she witnesses her father Atticus defend a black man falsely accused of rape. Through Scout's innocent eyes, we see the complexities of human nature, the importance of moral courage, and the deep-rooted prejudices of the American South. The story explores themes of racial injustice, moral growth, and the loss of innocence. As Scout and her brother Jem navigate their childhood, they learn valuable lessons about empathy, understanding, and standing up for what is right, even when it's difficult.",
  },
  {
    title: "1984",
    author: "George Orwell",
    genre: "Dystopian Fiction",
    color: "book-red",
    summary:
      "In a totalitarian society where Big Brother watches every move, Winston Smith works at the Ministry of Truth, rewriting history to fit the Party's narrative. Winston begins to question the oppressive system and falls in love with Julia, an act of rebellion in itself. The novel explores themes of surveillance, propaganda, and the manipulation of truth. Orwell's masterpiece serves as a warning about the dangers of totalitarianism and the importance of individual freedom and critical thinking. The story follows Winston's journey from conformity to rebellion to ultimate defeat.",
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    genre: "Romance",
    color: "book-purple",
    summary:
      "Elizabeth Bennet, a spirited and independent young woman, navigates the complex social world of 19th-century England. When she meets the proud and seemingly arrogant Mr. Darcy, their initial dislike gradually transforms into understanding and love. The novel explores themes of first impressions, social class, and the importance of looking beyond surface appearances. Through wit, humor, and keen social observation, Austen creates a timeless story about love, family, and personal growth. Elizabeth's journey teaches us about the dangers of prejudice and the rewards of keeping an open mind.",
  },
];

// Global variables
let currentPage = 0;
let totalPages = 29;
let isDragging = false;
let startY = 0;
let scrollY = 0;
let currentShelfScroll = 0;
let isShelfDragging = false;

// Initialize the gallery
function initializeGallery() {
  const track = document.getElementById("track");
  track.innerHTML = "";

  // Create 29 pages
  for (let i = 0; i < totalPages; i++) {
    const page = document.createElement("div");
    page.className = "gallery-page";
    page.innerHTML = `
            <div class="page-number">Page ${i + 1}</div>
            <div class="bookshelf-container">
                <div class="bookshelf-track" id="shelf-track-${i}">
                    ${generateBookshelfGrids()}
                </div>
            </div>
        `;
    track.appendChild(page);
  }

  updatePageStates();
  initializeShelfDragging();
}

// Generate bookshelf grids (4 grids per page for vertical scrolling)
function generateBookshelfGrids() {
  let grids = "";
  for (let grid = 0; grid < 4; grid++) {
    grids += `
            <div class="bookshelf-grid">
                ${generateShelfRows()}
            </div>
        `;
  }
  return grids;
}

// Generate shelf rows (4 rows per grid)
function generateShelfRows() {
  let rows = "";
  for (let row = 0; row < 4; row++) {
    rows += `
            <div class="shelf-row">
                ${generateBooks()}
            </div>
        `;
  }
  return rows;
}

// Generate books for each shelf
function generateBooks() {
  let booksHtml = "";
  const booksPerShelf = 35;

  for (let i = 0; i < booksPerShelf; i++) {
    const book = books[i % books.length];
    const bookId = `book-${Math.random().toString(36).substr(2, 9)}`;

    booksHtml += `
            <div class="book ${book.color}" onclick="openBookModal('${book.title}', '${book.author}', '${book.genre}', '${book.summary}')" data-book-id="${bookId}">
                <div class="book-spine">${book.title}</div>
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">by ${book.author}</div>
                    <div class="book-genre">${book.genre}</div>
                </div>
            </div>
        `;
  }

  return booksHtml;
}

// Initialize shelf dragging functionality
function initializeShelfDragging() {
  const bookshelfContainers = document.querySelectorAll(".bookshelf-container");

  bookshelfContainers.forEach((container, pageIndex) => {
    const track = container.querySelector(".bookshelf-track");
    let isDragging = false;
    let startY = 0;
    let scrollTop = 0;
    let currentScroll = 0;

    // Mouse events
    container.addEventListener("mousedown", (e) => {
      // Don't start dragging if clicking on a book
      if (e.target.closest(".book")) return;

      isDragging = true;
      startY = e.clientY;
      scrollTop = currentScroll;
      container.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaY = e.clientY - startY;
      currentScroll = scrollTop + deltaY;

      // Limit scrolling
      const maxScroll = 0;
      const minScroll = -(track.offsetHeight - container.offsetHeight);
      currentScroll = Math.max(minScroll, Math.min(maxScroll, currentScroll));

      track.style.transform = `translateY(${currentScroll}px)`;
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = "grab";
      }
    });

    // Touch events for mobile
    container.addEventListener("touchstart", (e) => {
      if (e.target.closest(".book")) return;

      isDragging = true;
      startY = e.touches[0].clientY;
      scrollTop = currentScroll;
      e.preventDefault();
    });

    container.addEventListener("touchmove", (e) => {
      if (!isDragging) return;

      const deltaY = e.touches[0].clientY - startY;
      currentScroll = scrollTop + deltaY;

      const maxScroll = 0;
      const minScroll = -(track.offsetHeight - container.offsetHeight);
      currentScroll = Math.max(minScroll, Math.min(maxScroll, currentScroll));

      track.style.transform = `translateY(${currentScroll}px)`;
      e.preventDefault();
    });

    container.addEventListener("touchend", () => {
      isDragging = false;
    });
  });
}

// Gallery navigation functions
function updatePageStates() {
  const pages = document.querySelectorAll(".gallery-page");
  const track = document.getElementById("track");

  track.style.transform = `translateX(-${currentPage * 100}vw)`;

  pages.forEach((page, index) => {
    page.classList.remove("active", "next-preview", "prev-preview");

    if (index === currentPage) {
      page.classList.add("active");
    } else if (index === currentPage + 1) {
      page.classList.add("next-preview");
    } else if (index === currentPage - 1) {
      page.classList.add("prev-preview");
    }
  });

  updateControls();
}

function updateControls() {
  const position = document.getElementById("position");
  const progress = document.getElementById("progress");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  position.textContent = `Page ${currentPage + 1} of ${totalPages}`;
  progress.style.width = `${((currentPage + 1) / totalPages) * 100}%`;

  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage === totalPages - 1;
}

function goToPage(pageIndex) {
  if (pageIndex >= 0 && pageIndex < totalPages) {
    currentPage = pageIndex;
    updatePageStates();
  }
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    currentPage++;
    updatePageStates();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    updatePageStates();
  }
}

// Book modal functions
function openBookModal(title, author, genre, summary) {
  const modal = document.getElementById("bookModal");
  const modalTitle = document.getElementById("modalBookTitle");
  const modalContent = document.getElementById("modalBookContent");

  modalTitle.textContent = title;
  modalContent.innerHTML = `
        <p><strong>Author:</strong> ${author}</p>
        <p><strong>Genre:</strong> ${genre}</p>
        <br>
        <p><strong>Summary:</strong></p>
        <p>${summary}</p>
    `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeBookModal() {
  const modal = document.getElementById("bookModal");
  modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

// Home button functionality
function goHome() {
  currentPage = 0;
  updatePageStates();

  // Reset all shelf scrolls
  const tracks = document.querySelectorAll(".bookshelf-track");
  tracks.forEach((track) => {
    track.style.transform = "translateY(0)";
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeGallery();

  // Navigation buttons
  document.getElementById("prevBtn").addEventListener("click", prevPage);
  document.getElementById("nextBtn").addEventListener("click", nextPage);

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevPage();
    } else if (e.key === "ArrowRight") {
      nextPage();
    }
  });

  // Mouse wheel navigation
  const gallery = document.getElementById("gallery");
  gallery.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      if (e.deltaY > 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
    e.preventDefault();
  });

  // Close modal when clicking outside
  document.getElementById("bookModal").addEventListener("click", (e) => {
    if (e.target.id === "bookModal") {
      closeBookModal();
    }
  });

  // Hide scroll hint after 5 seconds
  setTimeout(() => {
    const scrollHint = document.getElementById("scrollHint");
    if (scrollHint) {
      scrollHint.style.display = "none";
    }
  }, 5000);

  // Search functionality
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.querySelector(".search-btn");

  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      searchBooks(query);
    }
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        searchBooks(query);
      }
    }
  });
});

// Search function
function searchBooks(query) {
  const allBooks = document.querySelectorAll(".book");
  const lowerQuery = query.toLowerCase();
  let found = false;

  allBooks.forEach((book) => {
    const title = book.querySelector(".book-spine").textContent.toLowerCase();
    const info = book.querySelector(".book-info");
    const author = info.querySelector(".book-author").textContent.toLowerCase();
    const genre = info.querySelector(".book-genre").textContent.toLowerCase();

    if (
      title.includes(lowerQuery) ||
      author.includes(lowerQuery) ||
      genre.includes(lowerQuery)
    ) {
      book.style.boxShadow = "0 0 20px #D2B48C";
      book.style.transform = "translateY(-5px) scale(1.02)";

      if (!found) {
        // Navigate to the page containing this book
        const page = book.closest(".gallery-page");
        const pageIndex = Array.from(page.parentNode.children).indexOf(page);
        goToPage(pageIndex);
        found = true;
      }
    } else {
      book.style.boxShadow = "";
      book.style.transform = "";
    }
  });

  if (!found) {
    alert("No books found matching your search.");
  }

  // Reset search highlighting after 3 seconds
  setTimeout(() => {
    allBooks.forEach((book) => {
      book.style.boxShadow = "";
      book.style.transform = "";
    });
  }, 3000);
}
