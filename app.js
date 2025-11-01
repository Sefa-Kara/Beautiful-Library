// 1. Add dotenv at the very top so env vars are available
require("dotenv").config();

const express = require("express");
const { get } = require("http");
const app = express();
const mongoose = require("mongoose");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const path = require("path");
const authRoutes = require("./routes/auth");
const favoritesRoutes = require("./routes/favorites");
const reviewsRoutes = require("./routes/reviews");
const { initializeBooks } = require("./services/books");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes); // Bu satırı ekleyin
app.use("/api/favorites", require("./routes/favorites"));
app.use("/api/reviews", reviewsRoutes);

app.use(express.static("./Public"));
app.use(express.static("./Public/Login"));
app.use(express.static("./Public/About"));
app.use(express.static("./Public/Contact"));

// initializeBooks now provided by services/books

app.get("/", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.sendFile(path.join(__dirname, "Public", "index.html"));
  res.end();
});

// app.js
app.get("/books", async (req, res) => {
  const books = await initializeBooks();
  res.json(books);
});

app.get("/about", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.sendFile(path.join(__dirname, "Public", "About", "index.html"));
  res.end();
});
app.get("/contact", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.sendFile(path.join(__dirname, "Public", "Contact", "contact.html"));
  res.end();
});
app.get("/reviews", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.sendFile(path.join(__dirname, "Public", "Reviews", "index.html"));
  res.end();
});
app.get("/favorites", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.send("favorites");
  res.end();
});
app.get("/login", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.sendFile(path.join(__dirname, "Public", "Login", "index.html"));
  res.end();
});
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "Register", "index.html"));
});
app.use((req, res) => {
  console.log(req.route);
  res.status(404);
  res.send("No File Found");
  res.end();
});

// MongoDB bağlantısını en üste taşıyalım ve async/await kullanalım
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "Node-API",
    });
    console.log("Connected to MongoDB");

    // Start server only after DB connected
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Uygulama başlamadan önce veritabanına bağlan
connectDB();

// No exports from app.js; services/books provides initializeBooks
