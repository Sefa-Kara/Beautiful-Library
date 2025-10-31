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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes); // Bu satırı ekleyin
app.use("/api/favorites", require("./routes/favorites"));

app.use(express.static("./Public"));
app.use(express.static("./Public/Login"));

// For cache
var bookCache;

// Fetch book from api
async function getTrending(type, limit = 100) {
  const url =
    "https://openlibrary.org/trending/" +
    type +
    ".json?details=false&limit=" +
    limit +
    "&offset=0";
  console.log(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch trending ${type} books`);
  const data = await res.json();
  return data.works;
}

// trending api doesn't provide page numbers, so we need to fetch them separately
// bibkeys allow us to fetch multiple books at once
async function fetchPages(editionKeys, start) {
  const chunk = editionKeys.slice(start, start + 100);
  const bibkeys = chunk
    .map((k) => `OLID:${k.replace("/books/", "")}`)
    .join(",");
  const url = `https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch batch pages via api/books");
  const data = await res.json();

  const results = [];
  for (const key in data) {
    results.push({
      edition: key,
      pages: data[key].number_of_pages || null,
    });
  }
  return results;
}

async function fetchAllPages(editionKeys, chunkSize = 100) {
  const tasks = [];
  for (let i = 0; i < editionKeys.length; i += chunkSize) {
    tasks.push(fetchPages(editionKeys, i));
  }
  const results = await Promise.all(tasks);
  return results.flat();
}

// Initialize Books fonksiyonu
async function initializeBooks() {
  if (bookCache) {
    return bookCache;
  }
  [foreverBooks, yearlyBooks] = await Promise.all([
    getTrending("alltime", 100),
    getTrending("yearly", 100),
  ]);
  // instead of using promise we could use await in combined
  const combined = [...foreverBooks, ...yearlyBooks];
  const editionKeys = combined
    .map((b) => b.editions?.docs?.[0]?.key)
    .filter(Boolean);

  const pagesApiBooks = await fetchAllPages(editionKeys);

  //const pagesApiBooks = [...first, ...second];
  const books = combined.map((book) => {
    const editionKey = book.editions?.docs?.[0]?.key;

    const fromApiBooks = pagesApiBooks.find((p) =>
      editionKey ? p.edition.includes(editionKey.replace("/books/", "")) : false
    );
    return {
      title: book.title || null,
      author: book.author_name || null,
      year: book.first_publish_year || null,
      pages: fromApiBooks ? fromApiBooks.pages : null,
    };
  });
  bookCache = books;
  return books;
}

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
  res.json("about");
  res.end();
});
app.get("/contact", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.send("contact");
  res.end();
});
app.get("/reviews", (req, res) => {
  console.log(req.route);
  res.status(200);
  res.send("reviews");
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

module.exports = { initializeBooks };
