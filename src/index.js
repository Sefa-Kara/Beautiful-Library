import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // .env içindeki PORT vb. okunur

// __dirname eşdeğeri (ES Modules kullanırken)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express uygulamasını oluştur
const app = express();

// PUBLIC klasörünü statik olarak servis et
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📚  Library site running at http://localhost:${PORT}`);
});
