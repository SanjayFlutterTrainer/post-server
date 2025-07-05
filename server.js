const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 3000;
const JWT_SECRET = "your_jwt_secret_key";

app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = "mongodb+srv://user:fluttertrainer%401234@cluster0.6da5u.mongodb.net/myDatabase?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  stock: Number,
  imageUrl: String,
});
const Product = mongoose.model("Product", productSchema);

// Cart Schema
const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
});
const CartItem = mongoose.model("CartItem", cartItemSchema);

// Middleware for JWT
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
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await new User({ username, password: hashed }).save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Product Routes
app.post("/products", authenticateToken, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ message: "Product added", product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart Routes
app.post("/cart", authenticateToken, async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;
  try {
    let cartItem = await CartItem.findOne({ userId, productId });
    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cartItem = new CartItem({ userId, productId, quantity });
    }
    await cartItem.save();
    res.status(201).json({ message: "Item added to cart", cartItem });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/cart", authenticateToken, async (req, res) => {
  try {
    const cart = await CartItem.find({ userId: req.user.userId }).populate("productId");
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/cart/:id", authenticateToken, async (req, res) => {
  const { quantity } = req.body;
  try {
    const cartItem = await CartItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { quantity },
      { new: true }
    );
    if (!cartItem) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Cart updated", cartItem });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/cart/:id", authenticateToken, async (req, res) => {
  try {
    const result = await CartItem.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!result) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ---------------------------
// ✅ PUBLIC ROUTES (No Token)
// ---------------------------

// Public GET products (same as /products, just demo)
app.get("/public-products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public POST feedback
app.post("/feedback", async (req, res) => {
  const { username, message } = req.body;
  res.status(200).json({ message: `Thanks ${username}, feedback received.` });
});

// Public PUT to update stock of product (unsafe for real-world!)
app.put("/update-stock/:id", async (req, res) => {
  const { stock } = req.body;
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Stock updated", product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Public DELETE product (unsafe for real-world!)
app.delete("/delete-product/:id", async (req, res) => {
  try {
    const result = await Product.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Start Server
app.listen(PORT, () => console.log(`eShop server running on http://localhost:${PORT}`));
