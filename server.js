const express = require("express");
const cookieSession = require("cookie-session");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_USER = process.env.ADMIN_USER || "apontadora";
const ADMIN_PASS = process.env.ADMIN_PASS || "troque-esta-senha";
const FOREMAN_USER = process.env.FOREMAN_USER || "encarregado";
const FOREMAN_PASS = process.env.FOREMAN_PASS || "troque-esta-senha";
const SESSION_SECRET = process.env.SESSION_SECRET || "troque-esta-chave";

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS workdays (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      workday_id INTEGER NOT NULL REFERENCES workdays(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      service TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(workday_id, employee_id)
    );
  `);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieSession({
  name: "apontamento_session",
  keys: [SESSION_SECRET],
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000
}));

app.use(express.static(path.join(__dirname, "public")));

function auth(role) {
  return (req, res, next) => {
    if (req.session?.role !== role) {
      return res.status(401).json({ error: "Não autorizado." });
    }
    next();
  };
}

app.post("/api/login", (req, res) => {
  const user = String(req.body.user || "");
  const password = String(req.body.password || "");

  if (user === ADMIN_USER && password === ADMIN_PASS) {
    req.session = { role: "admin" };
    return res.json({ role: "admin" });
  }

  if (user === FOREMAN_USER && password === FOREMAN_PASS) {
    req.session = { role: "foreman" };
    return res.json({ role: "foreman" });
  }

 
