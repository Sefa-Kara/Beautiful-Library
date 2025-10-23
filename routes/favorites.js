const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

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

    // Popülerliğe göre sırala ve ilk 25'i al
    const popularBooks = Object.values(bookPopularity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map((book) => ({
        title: book.title,
        author: book.author,
        bookId: book.bookId,
        favoriteCount: book.count,
      }));

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

module.exports = router;
