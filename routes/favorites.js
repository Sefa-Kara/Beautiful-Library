const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const { initializeBooks } = require("../services/books");

// Tüm favorileri getir
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Popüler favorileri getir
router.get("/popular", async (req, res) => {
  try {
    // Tüm kullanıcıların favori kitaplarını al
    const users = await User.find({}, "favorites");

    // Kitapların popülerlik sayısını hesapla
    const bookPopularity = {};
    users.forEach((user) => {
      user.favorites.forEach((favorite) => {
        const bookId = favorite.bookId;
        if (!bookPopularity[bookId]) {
          bookPopularity[bookId] = {
            count: 0,
            title: favorite.title,
            author: favorite.author,
            bookId: favorite.bookId,
          };
        }
        bookPopularity[bookId].count += 1;
      });
    });

    // Home list meta (author/year/pages)
    const homeBooks = await initializeBooks();
    const byTitle = new Map();
    homeBooks.forEach((b) => {
      if (b && b.title) {
        if (!byTitle.has(b.title)) byTitle.set(b.title, b);
      }
    });

    // Popülerliğe göre sırala ve ilk 34'ü al, metadata ile zenginleştir
    const popularBooks = Object.values(bookPopularity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 34)
      .map((book) => {
        const meta = byTitle.get(book.title) || {};
        return {
          title: book.title,
          author: book.author || meta.author || null,
          bookId: book.bookId,
          favoriteCount: book.count,
          year: meta.year || null,
          pages: meta.pages || null,
        };
      });

    res.json(popularBooks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Favori ekleme
router.post("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { bookId, title, author, dateAdded } = req.body;

    // Validate and sanitize input
    const sanitizedBookId = String(bookId || '').trim();
    const sanitizedTitle = String(title || bookId || '').trim();
    
    if (!sanitizedBookId || !sanitizedTitle) {
      return res.status(400).json({ message: "Book ID and title are required" });
    }

    // Kitap zaten favorilerde mi kontrol et
    const existingFavorite = user.favorites.find((fav) => fav.bookId === sanitizedBookId);
    if (existingFavorite) {
      return res.status(400).json({ message: "Book already in favorites" });
    }

    // Ensure dateAdded is a valid date
    let favoriteDate;
    try {
      favoriteDate = dateAdded ? new Date(dateAdded) : new Date();
      if (isNaN(favoriteDate.getTime())) {
        favoriteDate = new Date();
      }
    } catch (e) {
      favoriteDate = new Date();
    }
    
    user.favorites.push({ 
      bookId: sanitizedBookId, 
      title: sanitizedTitle, 
      author: author ? String(author).trim() : null, 
      dateAdded: favoriteDate 
    });
    
    await user.save();

    res.status(201).json({ 
      message: "Added to favorites",
      favorite: {
        bookId: sanitizedBookId,
        title: sanitizedTitle,
        author: author ? String(author).trim() : null
      }
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    console.error("Request body:", req.body);
    console.error("User ID:", req.userId);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Favori silme
router.delete("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { bookId } = req.body;

    user.favorites = user.favorites.filter((fav) => fav.bookId !== bookId);
    await user.save();

    res.json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Favori durumu kontrolü için yeni endpoint
router.post("/check", auth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.userId);

    const isFavorite = user.favorites.some((fav) => fav.bookId === bookId);

    res.json({ isFavorite });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
