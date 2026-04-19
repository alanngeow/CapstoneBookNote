// ─── Dependencies ───────────────────────────────────────────────────────────
import express from "express";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config(); // loads DATABASE_URL etc from .env

const app = express();
const PORT = 3000;

// ─── Database connection ─────────────────────────────────────────────────────
// pg.Client connects to your local PostgreSQL instance using credentials
// stored safely in .env (never hardcode passwords in your code!)
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "Liondance4life%",
  port: 5432,
});
db.connect();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true })); // parses HTML form data
app.use(express.static("public"));               // serves your CSS/JS files
app.set("view engine", "ejs");                   // tells Express to use EJS

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET / — show all books, support sorting via query param e.g. /?sort=rating
app.get("/", async (req, res) => {
  const sort = req.query.sort || "date_read"; // default sort
  
  // Build a safe ORDER BY clause (only allow known columns to prevent SQL injection)
  const allowed = ["rating", "date_read", "title"];
  const orderBy = allowed.includes(sort) ? sort : "date_read";
  
  try {
    const result = await db.query(`SELECT * FROM books ORDER BY ${orderBy} DESC`);
    // For each book, build the Open Library cover URL using its ISBN
    const books = result.rows.map((book) => ({
      ...book,
      coverUrl: book.isbn
        ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`
        : "/public/no-cover.png", // fallback if no ISBN
    }));
    res.render("index", { books, currentSort: sort });
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).send("Something went wrong fetching your books.");
  }
});

// GET /add — show the add book form
app.get("/add", (req, res) => {
  res.render("add");
});

// POST /add — save a new book to the database
app.post("/add", async (req, res) => {
  const { title, author, rating, date_read, notes, isbn } = req.body;
  try {
    await db.query(
      "INSERT INTO books (title, author, rating, date_read, notes, isbn) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, author, rating, date_read, notes, isbn]
    );
    res.redirect("/"); // after adding, go back home
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(500).send("Could not save the book. Please try again.");
  }
});

// GET /edit/:id — show the edit form pre-filled with existing data
app.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
    res.render("edit", { book: result.rows[0] });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Could not load the book for editing.");
  }
});

// POST /edit/:id — update the book in the database
app.post("/edit/:id", async (req, res) => {
    const id = req.params.id;
    const rating  = req.body.updatedRating;
    const notes = req.body.updatedNotes;
  
  try {
    await db.query("UPDATE books SET rating = $1, notes = $2 WHERE id = $3", [rating, notes, id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// POST /delete/:id — remove a book from the database
app.post("/delete/:id", async (req, res) => {
  // TODO: You fill this in! Use DELETE FROM books WHERE id = $1
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));