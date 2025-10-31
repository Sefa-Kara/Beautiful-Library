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
  const [foreverBooks, yearlyBooks] = await Promise.all([
    getTrending("alltime", 100),
    getTrending("yearly", 100),
  ]);
  const combined = [...foreverBooks, ...yearlyBooks];
  const editionKeys = combined
    .map((b) => b.editions?.docs?.[0]?.key)
    .filter(Boolean);

  const pagesApiBooks = await fetchAllPages(editionKeys);

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

module.exports = { initializeBooks };


