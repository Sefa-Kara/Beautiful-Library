const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const { initializeBooks } = require("../services/books");

// Add a review (one per user per book)
router.post("/", auth, async (req, res) => {
  try {
    const { bookId, title, review, rating } = req.body;
    if (!bookId || !title || !review) {
      return res.status(400).json({ message: "bookId, title and review are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadyReviewed = user.reviews?.some((r) => r.bookId === bookId);
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already reviewed this book" });
    }

    const reviewerName = `${user.name} ${user.surname}`;
    user.reviews.push({
      bookId,
      title,
      review,
      reviewerName,
      rating: typeof rating === "number" ? rating : undefined,
      dateReviewed: new Date(),
    });
    await user.save();

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check if current user has reviewed this book
router.post("/check", auth, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ message: "bookId is required" });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isReviewed = user.reviews?.some((r) => r.bookId === bookId) || false;
    res.json({ isReviewed });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all reviews (newest first)
router.get("/", async (_req, res) => {
  try {
    // Aggregate reviews from all users
    const users = await User.find({}, "name surname reviews");
    const allReviews = [];

    // Home list meta (author/year/pages)
    const homeBooks = await initializeBooks();
    const byTitle = new Map();
    homeBooks.forEach((b) => {
      if (b && b.title) {
        if (!byTitle.has(b.title)) byTitle.set(b.title, b);
      }
    });
    users.forEach((u) => {
      (u.reviews || []).forEach((r) => {
        const meta = byTitle.get(r.title) || {};
        allReviews.push({
          bookId: r.bookId,
          title: r.title,
          review: r.review,
          reviewerName: r.reviewerName || `${u.name} ${u.surname}`,
          dateReviewed: r.dateReviewed,
          rating: r.rating,
          author: meta.author || null,
          year: meta.year || null,
          pages: meta.pages || null,
        });
      });
    });

    allReviews.sort((a, b) => new Date(b.dateReviewed) - new Date(a.dateReviewed));
    res.json(allReviews);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;


