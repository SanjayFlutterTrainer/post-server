const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "your_jwt_secret_key"; // Replace with a strong secret

// Middleware
app.use(bodyParser.json());
const cors = require("cors");
app.use(cors());

// MongoDB Connection
const MONGO_URI = "mongodb+srv://user:fluttertrainer%401234@cluster0.6da5u.mongodb.net/myDatabase?retryWrites=true&w=majority"; // Update with your MongoDB connection string
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Task Schema and Model (formerly "notes")
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
});

const Task = mongoose.model("Task", taskSchema);

// Post Schema and Model
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
});

const Post = mongoose.model("Post", postSchema);

// JWT Middleware for Authentication
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access Denied" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid Token" });
    req.user = user;
    next();
  });
};

// Routes
// 1. User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 2. User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// TASK ROUTES
// 3. Create Task
app.post("/tasks", authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.userId;

  try {
    const task = new Task({ userId, title, description });
    await task.save();
    res.status(201).json({ message: "Task created successfully", task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Get Tasks (by User ID)
app.get("/tasks", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const tasks = await Task.find({ userId });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Update Task
app.put("/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const userId = req.user.userId;

  try {
    const task = await Task.findOneAndUpdate({ _id: id, userId }, { title, description }, { new: true });
    if (!task) return res.status(404).json({ error: "Task not found or not authorized" });
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Delete Task
app.delete("/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) return res.status(404).json({ error: "Task not found or not authorized" });
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST ROUTES
// 7. Create Post
app.post("/posts", authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user.userId;

  try {
    const post = new Post({ userId, title, content });
    await post.save();
    res.status(201).json({ message: "Post created successfully", post });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Get Posts (by User ID)
app.get("/posts", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const posts = await Post.find({ userId });
    res.status(200).json(posts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Update Post
app.put("/posts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user.userId;

  try {
    const post = await Post.findOneAndUpdate({ _id: id, userId }, { title, content }, { new: true });
    if (!post) return res.status(404).json({ error: "Post not found or not authorized" });
    res.status(200).json({ message: "Post updated successfully", post });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Delete Post
app.delete("/posts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const post = await Post.findOneAndDelete({ _id: id, userId });
    if (!post) return res.status(404).json({ error: "Post not found or not authorized" });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
