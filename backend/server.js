const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// DATABASE CONNECTION
// ─────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ─────────────────────────────────────────────
// SCHEMAS & MODELS
// ─────────────────────────────────────────────

// User Schema
const userSchema = new mongoose.Schema({
  TeamName: { type: String, required: true, unique: true, uppercase: true },
  Password: { type: String, required: true },
  TrailType: { type: String, enum: ["Red", "Green", "Blue"], required: true },

  GameStartStatus: { type: Boolean, default: false },
  SafeStatus: { type: Boolean, default: false },
  GameStartTime: { type: Date, default: null },

  // 0=Locked, 1=Unlocked, 2=Correct, 3=Wrong
  TechPuzzleStatusArray: { type: [Number], default: [1, 0, 0, 0, 0, 0, 0, 0] },
  TechPuzzleAnswerArray: { type: [String], default: Array(8).fill("") },
  TechPuzzleTime: { type: [Number], default: Array(8).fill(0) },

  PhysicalPuzzleStatus: { type: [Number], default: [0, 0, 0, 0, 0] },
  PhysicalPuzzleArray: { type: [String], default: Array(5).fill("") },
  PhysicalPuzzleTime: { type: [Number], default: Array(5).fill(0) },

  Penalty: { type: Number, default: 0 },
  TotalScore: { type: Number, default: 0 },
  FinalSubmissionTime: { type: Number, default: null },
  Status: { type: String, default: "active" },
});

const User = mongoose.model("User", userSchema);

// Puzzle Answer Schema
const puzzleAnswerSchema = new mongoose.Schema({
  Trail1TechPuzzleArray: { type: [String], default: [] },
  Trail2TechPuzzleArray: { type: [String], default: [] },
  Trail3TechPuzzleArray: { type: [String], default: [] },
  Trail1PhysicalPuzzleArray: { type: [String], default: [] },
  Trail2PhysicalPuzzleArray: { type: [String], default: [] },
  Trail3PhysicalPuzzleArray: { type: [String], default: [] },
});

const PuzzleAnswer = mongoose.model("PuzzleAnswer", puzzleAnswerSchema);

// Flag Schema
const flagSchema = new mongoose.Schema({
  Trail1TechFlagString: String,
  Trail2TechFlagString: String,
  Trail3TechFlagString: String,
  Trail1PhysicalFlagString: String,
  Trail2PhysicalFlagString: String,
  Trail3PhysicalFlagString: String,
});

const Flag = mongoose.model("Flag", flagSchema);

// Boss Level Schema
const bossSchema = new mongoose.Schema({
  Trail1Answer: String,
  Trail2Answer: String,
  Trail3Answer: String,
});

const Boss = mongoose.model("Boss", bossSchema);

// Global game state schema
const gameStateSchema = new mongoose.Schema({
  GameActive: { type: Boolean, default: false },
  GameStartTime: { type: Date, default: null },
  GameDuration: { type: Number, default: 7200 }, // 2 hours in seconds
});

const GameState = mongoose.model("GameState", gameStateSchema);

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function getTrailIndex(trailType) {
  if (trailType === "Red") return 1;
  if (trailType === "Green") return 2;
  if (trailType === "Blue") return 3;
  return null;
}

async function getAnswers(trailType) {
  const answers = await PuzzleAnswer.findOne();
  if (!answers) return null;
  const idx = getTrailIndex(trailType);
  return {
    tech: answers[`Trail${idx}TechPuzzleArray`],
    physical: answers[`Trail${idx}PhysicalPuzzleArray`],
  };
}

async function getFlags(trailType) {
  const flags = await Flag.findOne();
  if (!flags) return null;
  const idx = getTrailIndex(trailType);
  return {
    tech: flags[`Trail${idx}TechFlagString`],
    physical: flags[`Trail${idx}PhysicalFlagString`],
  };
}

function calculateElapsedSeconds(gameStartTime) {
  return Math.floor((Date.now() - new Date(gameStartTime).getTime()) / 1000);
}

// ─────────────────────────────────────────────
// INITIALIZATION ROUTE (seed DB)
// ─────────────────────────────────────────────
app.post("/api/admin/initialize", async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Seed puzzle answers (realistic tech puzzle answers + scavenger words)
    await PuzzleAnswer.deleteMany({});
    await PuzzleAnswer.create({
      Trail1TechPuzzleArray: [
        "CIPHER",
        "NETWORK",
        "PROTOCOL",
        "FIREWALL",
        "ENCRYPT",
        "PAYLOAD",
        "ROOTKIT",
        "SANDBOX",
      ],
      Trail2TechPuzzleArray: [
        "BINARY",
        "KERNEL",
        "DAEMON",
        "SOCKET",
        "BUFFER",
        "MALLOC",
        "THREAD",
        "VECTOR",
      ],
      Trail3TechPuzzleArray: [
        "PACKET",
        "ROUTER",
        "SUBNET",
        "GATEWAY",
        "COOKIE",
        "SCRIPT",
        "ZOMBIE",
        "TROJAN",
      ],
      Trail1PhysicalPuzzleArray: [
        "LABYRINTH",
        "COMPASS",
        "MERIDIAN",
        "HORIZON",
        "ECLIPSE",
      ],
      Trail2PhysicalPuzzleArray: [
        "ALTITUDE",
        "TRAVERSE",
        "PINNACLE",
        "DESCENT",
        "SENTINEL",
      ],
      Trail3PhysicalPuzzleArray: [
        "VORTEX",
        "PHANTOM",
        "NEXUS",
        "SPECTRUM",
        "CATALYST",
      ],
    });

    // Seed flags (13-character strings)
    await Flag.deleteMany({});
    await Flag.create({
      Trail1TechFlagString: "R3D_T3CH_FL4G",
      Trail2TechFlagString: "GR33N_T3CH_FL4",
      Trail3TechFlagString: "BLU3_T3CH_FL4G",
      Trail1PhysicalFlagString: "R3D_PHY_FL4G_1",
      Trail2PhysicalFlagString: "GRN_PHY_FL4G_2",
      Trail3PhysicalFlagString: "BLU_PHY_FL4G_3",
    });

    // Seed boss answers
    await Boss.deleteMany({});
    await Boss.create({
      Trail1Answer: "REDPHOENIX",
      Trail2Answer: "GREENDRAGON",
      Trail3Answer: "BLUEFALCON",
    });

    // Ensure a global GameState doc exists
    const existing = await GameState.findOne();
    if (!existing) {
      await GameState.create({ GameActive: false, GameStartTime: null });
    }

    res.json({ message: "Game initialized successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────

// Admin login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Received:", JSON.stringify(username), JSON.stringify(password));
  console.log("Expected:", JSON.stringify(process.env.AdminUsername), JSON.stringify(process.env.AdminPassword));
  if (
    username === process.env.AdminUsername &&
    password === process.env.AdminPassword
  ) {
    return res.json({ success: true, role: "admin" });
  }
  res.status(401).json({ message: "Invalid admin credentials" });
});

// Create user
app.post("/api/admin/create-user", async (req, res) => {
  const { username, password, teamName, userPassword, trailType } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existing = await User.findOne({
      TeamName: teamName.toUpperCase(),
    });
    if (existing) {
      return res.status(400).json({ message: "Team name already exists" });
    }

    const hashedPwd = await bcrypt.hash(userPassword, 10);
    const newUser = await User.create({
      TeamName: teamName.toUpperCase(),
      Password: hashedPwd,
      TrailType: trailType,
    });

    res.json({ message: "User created", teamName: newUser.TeamName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start game (activate start button for all participants)
app.post("/api/admin/start-game", async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const now = new Date();
    await GameState.findOneAndUpdate(
      {},
      { GameActive: true, GameStartTime: now },
      { upsert: true }
    );
    // Allow all users to start
    await User.updateMany({}, { GameStartStatus: true });
    res.json({ message: "Game started", startTime: now });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deactivate start game
app.post("/api/admin/deactivate-game", async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await GameState.findOneAndUpdate({}, { GameActive: false });
    await User.updateMany({}, { GameStartStatus: false });
    res.json({ message: "Game deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// End game
app.post("/api/admin/end-game", async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await GameState.findOneAndUpdate(
      {},
      { GameActive: false, GameStartTime: null }
    );
    await User.updateMany({}, { GameStartStatus: false, GameStartTime: null });
    res.json({ message: "Game ended" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset timer
app.post("/api/admin/reset-timer", async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const now = new Date();
    await GameState.findOneAndUpdate({}, { GameStartTime: now });
    await User.updateMany({ GameStartTime: { $ne: null } }, { GameStartTime: now });
    res.json({ message: "Timer reset", startTime: now });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset all user progress (keep accounts, wipe game state)
app.post("/api/admin/reset-game", async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.AdminUsername || password !== process.env.AdminPassword) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await User.updateMany({}, {
      GameStartStatus: false,
      SafeStatus: false,
      GameStartTime: null,
      TechPuzzleStatusArray: [1, 0, 0, 0, 0, 0, 0, 0],
      TechPuzzleAnswerArray: Array(8).fill(""),
      TechPuzzleTime: Array(8).fill(0),
      PhysicalPuzzleStatus: [0, 0, 0, 0, 0],
      PhysicalPuzzleArray: Array(5).fill(""),
      PhysicalPuzzleTime: Array(5).fill(0),
      Penalty: 0,
      TotalScore: 0,
      FinalSubmissionTime: null,
    });
    await GameState.findOneAndUpdate({}, { GameActive: false, GameStartTime: null });
    res.json({ message: "All user progress reset" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete everything from DB
app.post("/api/admin/delete-everything", async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.AdminUsername || password !== process.env.AdminPassword) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await User.deleteMany({});
    await PuzzleAnswer.deleteMany({});
    await Flag.deleteMany({});
    await Boss.deleteMany({});
    await GameState.deleteMany({});
    res.json({ message: "Database wiped" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (admin panel)
app.get("/api/admin/users", async (req, res) => {
  const { username, password } = req.query;
  if (
    username !== process.env.AdminUsername ||
    password !== process.env.AdminPassword
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const users = await User.find({}, { Password: 0 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get game state
app.get("/api/game-state", async (req, res) => {
  try {
    const state = await GameState.findOne();
    res.json(state || { GameActive: false, GameStartTime: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// USER AUTH
// ─────────────────────────────────────────────

app.post("/api/login", async (req, res) => {
  const { teamName, password } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(401).json({ message: "Team not found" });

    const match = await bcrypt.compare(password, user.Password);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    res.json({
      success: true,
      teamName: user.TeamName,
      trailType: user.TrailType,
      gameStartStatus: user.GameStartStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// USER DATA ENDPOINTS
// ─────────────────────────────────────────────

// Get user data
app.get("/api/user/:teamName", async (req, res) => {
  try {
    const user = await User.findOne(
      { TeamName: req.params.teamName.toUpperCase() },
      { Password: 0 }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const gameState = await GameState.findOne();
    const now = Date.now();
    let timeRemaining = 7200;

    if (gameState && gameState.GameStartTime && gameState.GameActive) {
      const elapsed = Math.floor(
        (now - new Date(gameState.GameStartTime).getTime()) / 1000
      );
      timeRemaining = Math.max(0, 7200 - elapsed);
    }

    res.json({ ...user.toObject(), timeRemaining });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start game for individual user
app.post("/api/user/start-game", async (req, res) => {
  const { teamName } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.GameStartStatus) {
      return res.status(400).json({ message: "Game not activated by admin" });
    }

    if (user.GameStartTime) {
      return res.json({ message: "Game already started", user });
    }

    const gameState = await GameState.findOne();
    const startTime = gameState?.GameStartTime || new Date();

    user.GameStartTime = startTime;
    await user.save();

    res.json({ message: "Game started for team", startTime });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// PUZZLE SUBMISSION
// ─────────────────────────────────────────────

// Submit Tech Puzzle Answer
app.post("/api/puzzle/tech/submit", async (req, res) => {
  const { teamName, puzzleIndex, answer } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.TechPuzzleStatusArray[puzzleIndex] === 2) {
      return res.json({ result: "already_solved", message: "Already solved correctly" });
    }

    if (user.TechPuzzleStatusArray[puzzleIndex] !== 1) {
      return res.status(400).json({ message: "Puzzle is locked" });
    }

    const trailAnswers = await getAnswers(user.TrailType);
    if (!trailAnswers) return res.status(500).json({ message: "Answers not found" });

    const correctAnswer = trailAnswers.tech[puzzleIndex];
    const isCorrect =
      answer.trim().toUpperCase() === correctAnswer.toUpperCase();

    const gameState = await GameState.findOne();
    const elapsed = gameState?.GameStartTime
      ? Math.floor(
          (Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000
        )
      : 0;

    // Calculate time since last puzzle solved
    let timeSinceLast = elapsed;
    if (puzzleIndex > 0) {
      timeSinceLast = elapsed - (user.TechPuzzleTime[puzzleIndex - 1] || 0);
    }

    if (isCorrect) {
      user.TechPuzzleStatusArray[puzzleIndex] = 2;
      user.TechPuzzleAnswerArray[puzzleIndex] = answer.trim().toUpperCase();
      user.TechPuzzleTime[puzzleIndex] = elapsed;
      user.TotalScore += 10;

      // Unlock next tech puzzle
      if (puzzleIndex < 7) {
        user.TechPuzzleStatusArray[puzzleIndex + 1] = 1;
      }

      // Unlock scavenger hunt after puzzle index 2 (3rd puzzle)
      if (puzzleIndex === 2) {
        user.PhysicalPuzzleStatus[0] = 1;
      }

      user.markModified("TechPuzzleStatusArray");
      user.markModified("TechPuzzleAnswerArray");
      user.markModified("TechPuzzleTime");
      user.markModified("PhysicalPuzzleStatus");
      await user.save();

      return res.json({ result: "correct", score: user.TotalScore, timeSinceLast });
    } else {
      user.TechPuzzleStatusArray[puzzleIndex] = 3;
      user.Penalty += 0.1;
      user.TotalScore = Math.max(0, user.TotalScore - 0.1);
      user.markModified("TechPuzzleStatusArray");
      await user.save();

      return res.json({ result: "incorrect", penalty: user.Penalty, score: user.TotalScore });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Re-attempt tech puzzle after wrong answer
app.post("/api/puzzle/tech/retry", async (req, res) => {
  const { teamName, puzzleIndex } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.TechPuzzleStatusArray[puzzleIndex] === 3) {
      user.TechPuzzleStatusArray[puzzleIndex] = 1;
      user.markModified("TechPuzzleStatusArray");
      await user.save();
    }

    res.json({ message: "Puzzle unlocked for retry" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit Physical Puzzle Answer
app.post("/api/puzzle/physical/submit", async (req, res) => {
  const { teamName, puzzleIndex, answer } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.PhysicalPuzzleStatus[puzzleIndex] === 2) {
      return res.json({ result: "already_solved" });
    }

    if (user.PhysicalPuzzleStatus[puzzleIndex] !== 1) {
      return res.status(400).json({ message: "Puzzle is locked" });
    }

    const trailAnswers = await getAnswers(user.TrailType);
    if (!trailAnswers) return res.status(500).json({ message: "Answers not found" });

    const correctAnswer = trailAnswers.physical[puzzleIndex];
    const isCorrect =
      answer.trim().toUpperCase() === correctAnswer.toUpperCase();

    const gameState = await GameState.findOne();
    const elapsed = gameState?.GameStartTime
      ? Math.floor(
          (Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000
        )
      : 0;

    if (isCorrect) {
      user.PhysicalPuzzleStatus[puzzleIndex] = 2;
      user.PhysicalPuzzleArray[puzzleIndex] = answer.trim().toUpperCase();
      user.PhysicalPuzzleTime[puzzleIndex] = elapsed;
      user.TotalScore += 10;

      if (puzzleIndex < 4) {
        user.PhysicalPuzzleStatus[puzzleIndex + 1] = 1;
      }

      user.markModified("PhysicalPuzzleStatus");
      user.markModified("PhysicalPuzzleArray");
      user.markModified("PhysicalPuzzleTime");
      await user.save();

      return res.json({ result: "correct", score: user.TotalScore });
    } else {
      user.PhysicalPuzzleStatus[puzzleIndex] = 3;
      user.Penalty += 0.1;
      user.TotalScore = Math.max(0, user.TotalScore - 0.1);
      user.markModified("PhysicalPuzzleStatus");
      await user.save();

      return res.json({ result: "incorrect", penalty: user.Penalty, score: user.TotalScore });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Re-attempt physical puzzle
app.post("/api/puzzle/physical/retry", async (req, res) => {
  const { teamName, puzzleIndex } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.PhysicalPuzzleStatus[puzzleIndex] === 3) {
      user.PhysicalPuzzleStatus[puzzleIndex] = 1;
      user.markModified("PhysicalPuzzleStatus");
      await user.save();
    }

    res.json({ message: "Puzzle unlocked for retry" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// BOSS LEVEL
// ─────────────────────────────────────────────

// Verify combined flag
app.post("/api/boss/verify-flag", async (req, res) => {
  const { teamName, flagInput } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const flags = await getFlags(user.TrailType);
    if (!flags) return res.status(500).json({ message: "Flags not configured" });

    // The combined flag is tech flag + physical flag concatenated
    const combinedFlag = flags.tech + flags.physical;

    if (flagInput.trim() === combinedFlag) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "Trail corrupted. You lost your path, officer." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit boss answer
app.post("/api/boss/submit", async (req, res) => {
  const { teamName, answer } = req.body;

  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const bossAnswers = await Boss.findOne();
    if (!bossAnswers) return res.status(500).json({ message: "Boss answers not configured" });

    const idx = getTrailIndex(user.TrailType);
    const correctAnswer = bossAnswers[`Trail${idx}Answer`];
    const isCorrect =
      answer.trim().toUpperCase() === correctAnswer.toUpperCase();

    if (isCorrect) {
      const gameState = await GameState.findOne();
      const elapsed = gameState?.GameStartTime
        ? Math.floor(
            (Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000
          )
        : 0;

      user.SafeStatus = true;
      user.FinalSubmissionTime = elapsed;
      user.TotalScore += 50; // Boss level bonus
      await user.save();

      return res.json({
        success: true,
        finalScore: user.TotalScore,
        submissionTime: elapsed,
      });
    } else {
      user.Penalty += 0.1;
      user.TotalScore = Math.max(0, user.TotalScore - 0.1);
      await user.save();

      return res.json({ success: false, message: "Boss answer incorrect" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────

app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await User.find({}, { Password: 0 });

    const ranked = users
      .map((u) => {
        const techSolved = u.TechPuzzleStatusArray.filter((s) => s === 2).length;
        const physicalSolved = u.PhysicalPuzzleStatus.filter((s) => s === 2).length;
        const totalSolved = techSolved + physicalSolved + (u.SafeStatus ? 1 : 0);
        return {
          teamName: u.TeamName,
          trailType: u.TrailType,
          totalSolved,
          totalScore: parseFloat(u.TotalScore.toFixed(2)),
          finalSubmissionTime: u.FinalSubmissionTime,
          safeStatus: u.SafeStatus,
        };
      })
      .sort((a, b) => {
        if (b.totalSolved !== a.totalSolved) return b.totalSolved - a.totalSolved;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (a.finalSubmissionTime !== null && b.finalSubmissionTime !== null) {
          return a.finalSubmissionTime - b.finalSubmissionTime;
        }
        if (a.finalSubmissionTime !== null) return -1;
        if (b.finalSubmissionTime !== null) return 1;
        return 0;
      });

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// SERVER START
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 DSH Server running on port ${PORT}`);
});