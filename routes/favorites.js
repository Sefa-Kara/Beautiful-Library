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
    const { bookId, title, author, dateAdded } = req.body;

    // Kitap zaten favorilerde mi kontrol et
    if (user.favorites.some((fav) => fav.bookId === bookId)) {
      return res.status(400).json({ message: "Book already in favorites" });
    }

    user.favorites.push({ bookId, title, author, dateAdded });
    await user.save();

    res.status(201).json({ message: "Added to favorites" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
