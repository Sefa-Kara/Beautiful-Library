const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// For cache
let bookCache;

async function getTrending(type, limit = 100) {
  const url =
    "https://openlibrary.org/trending/" +
    type +
    ".json?details=false&limit=" +
    limit +
    "&offset=0";
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

async function initializeBooks() {
  if (bookCache) {
    return bookCache;
  }
  // Fetch 500 books from each source in parallel
  const [foreverBooks, yearlyBooks] = await Promise.all([
    getTrending("alltime", 300),
    getTrending("yearly", 300),
  ]);

  // Use Map to track unique books by work key to avoid duplicates
  const uniqueBooksMap = new Map();

  // Process all books and keep only unique ones (by work key)
  const allBooks = [...foreverBooks, ...yearlyBooks];
  for (const book of allBooks) {
    // Use work key as unique identifier, fallback to title+author if key not available
    const uniqueKey =
      book.key || `${book.title || ""}_${book.author_name?.[0] || ""}`;

    // Only add if we haven't seen this book before
    // Prefer alltime books over yearly if duplicate (alltime comes first in array)
    if (!uniqueBooksMap.has(uniqueKey)) {
      uniqueBooksMap.set(uniqueKey, book);
    }
  }

  // Convert Map values back to array
  const uniqueBooks = Array.from(uniqueBooksMap.values());

  // Extract edition keys for all unique books
  const editionKeys = uniqueBooks
    .map((b) => b.editions?.docs?.[0]?.key)
    .filter(Boolean);

  // Fetch pages for all unique books in parallel batches
  const pagesApiBooks = await fetchAllPages(editionKeys);

  const books = uniqueBooks.map((book) => {
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

module.exports = { initializeBooks };
