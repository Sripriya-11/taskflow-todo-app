require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch((e) => console.error("DB connection failed:", e.message));

const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}));

const Task = mongoose.model("Task", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  dueDate: Date,
}, { timestamps: true }));

// wraps async handlers so errors return JSON instead of crashing
const h = (fn) => (req, res) =>
  fn(req, res).catch((e) => res.status(500).json({ msg: e.message }));

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

app.get("/", (req, res) => res.json({ msg: "Todo API running" }));

app.post("/api/auth/register", h(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ msg: "Name, email and a 6+ character password are required" });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(400).json({ msg: "Email already used" });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user), name: user.name });
}));

app.post("/api/auth/login", h(async (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ msg: "Invalid credentials" });
  res.json({ token: sign(user), name: user.name });
}));

app.get("/api/tasks", auth, h(async (req, res) =>
  res.json(await Task.find({ user: req.userId }).sort({ createdAt: -1 }))));

app.post("/api/tasks", auth, h(async (req, res) => {
  const { title, priority, dueDate } = req.body;
  if (!title?.trim()) return res.status(400).json({ msg: "Title is required" });
  res.json(await Task.create({ title, priority, dueDate: dueDate || undefined, user: req.userId }));
}));

app.put("/api/tasks/:id", auth, h(async (req, res) => {
  const { title, completed, priority, dueDate } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { title, completed, priority, dueDate },
    { new: true, omitUndefined: true }
  );
  if (!task) return res.status(404).json({ msg: "Task not found" });
  res.json(task);
}));

app.delete("/api/tasks/:id", auth, h(async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  res.json({ msg: "Deleted" });
}));

app.listen(process.env.PORT || 5000, () => console.log("Server running"));
