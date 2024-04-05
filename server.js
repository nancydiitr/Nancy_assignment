const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/cricbuzz", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

// Models
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: String, // 'admin' or 'guest'
  })
);

const Match = mongoose.model(
  "Match",
  new mongoose.Schema({
    team_1: String,
    team_2: String,
    date: Date,
    venue: String,
    status: String,
    squads: {
      team_1: [
        {
          player_id: String,
          name: String,
        },
      ],
      team_2: [
        {
          player_id: String,
          name: String,
        },
      ],
    },
  })
);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token)
    return res.status(401).json({ status: "Unauthorized", status_code: 401 });

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err)
      return res.status(403).json({ status: "Forbidden", status_code: 403 });

    req.user = decoded;
    next();
  });
};

// Routes
app.post("/api/admin/signup", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      email,
      role: "admin",
    });
    await user.save();
    res.json({
      status: "Admin Account successfully created",
      status_code: 200,
      user_id: user._id,
    });
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res
        .status(401)
        .json({
          status: "Incorrect username/password provided. Please retry",
          status_code: 401,
        });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res
        .status(401)
        .json({
          status: "Incorrect username/password provided. Please retry",
          status_code: 401,
        });

    const token = jwt.sign({ id: user._id, role: user.role }, "secretkey");
    res.json({
      status: "Login successful",
      status_code: 200,
      user_id: user._id,
      access_token: token,
    });
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.post("/api/matches", verifyToken, async (req, res) => {
  try {
    const { team_1, team_2, date, venue } = req.body;
    const match = new Match({
      team_1,
      team_2,
      date,
      venue,
      status: "upcoming",
      squads: { team_1: [], team_2: [] },
    });
    await match.save();
    res.json({ message: "Match created successfully", match_id: match._id });
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const matches = await Match.find({}, "-_id -__v");
    res.json({ matches });
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.get("/api/matches/:match_id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.match_id, "-_id -__v");
    res.json(match);
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.post("/api/teams/:team_id/squad", verifyToken, async (req, res) => {
  try {
    const { name, role } = req.body;
    const player_id = new mongoose.Types.ObjectId();
    const player = { player_id, name, role };
    // Assuming team_id is valid and team is present in the database
    // For simplicity, not implementing team management in this example
    res.json({ message: "Player added to squad successfully", player_id });
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

app.get("/api/players/:player_id/stats", verifyToken, async (req, res) => {
  try {
    // Fetch player stats from database based on player_id
    // Dummy data for demonstration
    const playerStats = {
      player_id: req.params.player_id,
      name: "Virat Kohli",
      matches_played: 200,
      runs: 12000,
      average: 59.8,
      strike_rate: 92.5,
    };
    res.json(playerStats);
  } catch (error) {
    res.status(500).json({ status: "Internal Server Error", status_code: 500 });
  }
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
