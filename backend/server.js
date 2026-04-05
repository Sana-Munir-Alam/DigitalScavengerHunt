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

  // Boss level timing
  BossStartTime: { type: Number, default: null },   // elapsed seconds when boss was unlocked
  BossCompleteTime: { type: Number, default: null }, // elapsed seconds when boss was solved

  Penalty: { type: Number, default: 0 },
  TotalScore: { type: Number, default: 0 },
  FinalSubmissionTime: { type: Number, default: null },
  Status: { type: String, default: "active" },
});

const User = mongoose.model("User", userSchema);

// ─────────────────────────────────────────────
// NEW: Puzzle Schema (questions on DB)
// ─────────────────────────────────────────────
const puzzleSchema = new mongoose.Schema({
  PuzzleName: { type: String, required: true },
  TrailColor: { type: String, enum: ["Red", "Green", "Blue"], required: true },
  TrailType: { type: String, enum: ["Tech", "Physical"], required: true },
  PuzzleIndex: { type: Number, required: true }, // 0-based index within trail+type
  Description: { type: String, required: true },
  Link: { type: String, default: "" },
  Answer: { type: String, required: true },
  Clue: { type: String, required: true },
});

const Puzzle = mongoose.model("Puzzle", puzzleSchema);

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
  Trail1Description: String,
  Trail2Description: String,
  Trail3Description: String,
});

const Boss = mongoose.model("Boss", bossSchema);

// Global game state schema
const gameStateSchema = new mongoose.Schema({
  GameActive: { type: Boolean, default: false },
  GameEnded: { type: Boolean, default: false },   // NEW: tracks if admin ended game
  GameStartTime: { type: Date, default: null },
  GameDuration: { type: Number, default: 10800 }, // 3 hours in seconds
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

async function getFlags(trailType) {
  const flags = await Flag.findOne();
  if (!flags) return null;
  const idx = getTrailIndex(trailType);
  return {
    tech: flags[`Trail${idx}TechFlagString`],
    physical: flags[`Trail${idx}PhysicalFlagString`],
  };
}

// ─────────────────────────────────────────────
// API TESTING ROUTE
// ─────────────────────────────────────────────
// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Digital Scavenger Hunt API is running!' });
});

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
    // Seed Puzzles collection
    await Puzzle.deleteMany({});
    const puzzleSeed = [
      // RED TECH
      { PuzzleName: "The Signal Log", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 0, Description: "A corrupted signal log has been recovered from the missing developer's trail. The sequence inside it is not random — each number hides part of a word buried inside nearby Upside Down records. Decode the pattern, trace the letters, and recover the first waypoint in the investigation.", Link: "https://drive.google.com/drive/folders/1iBX-NKxUwXOv9223dovslnzf5Qjut4n3", Answer: "TELEPATHY", Clue: "🔴R" },
      { PuzzleName: "Upside Down QR Signal Recovery", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 1, Description: "A corrupted signal from the Upside Down has been discovered. The transmission was divided into multiple fragments hidden across a digital investigation system. Teams must explore, reconstruct the signal, and decode the final message to continue the search.", Link: "https://github.com/SyedMuzammil2028/upside-down-signals", Answer: "QR_SIGNAL_RESTORED", Clue: "🔴3" },
      { PuzzleName: "Digital Footprint Trace", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 2, Description: "After restoring the corrupted transmission, investigators discovered traces of the missing developer's activity across multiple public platforms. Teams must follow the developer's digital footprint, recover the hidden key fragments, and reconstruct the next signal.", Link: "", Answer: "Th3_d3v3l0p3r_is_tr4c3d", Clue: "🔴V" },
      { PuzzleName: "Layered Transmission Recovery", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 3, Description: "After tracing the missing developer's digital footprint, investigators recovered a deeper transmission hidden beneath multiple layers of encoding. Decode the transmission, unlock the protected archive, and uncover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/folders/1YI_k12_aZv9kAv0-ZoISFh86YXiyfGqH", Answer: "LAYERED_TRANSMISSION_RESTORED", Clue: "🔴7" },
      { PuzzleName: "Dual Signal Recovery", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 4, Description: "Investigators recovered two different traces left behind by the missing developer — one hidden in an audio transmission and the other embedded in a strange score-like document. Decode both traces and combine them to recover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/folders/15KsJNdjq_qrxLgR8FUGqPP2eXNri4NEr", Answer: "RESONANCE_TRACE_RECOVERED", Clue: "🔴X" },
      { PuzzleName: "Signal Layer Inspection", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 5, Description: "Investigators have reached a partially restored recovery terminal linked to the missing developer's recorded system activity. At first glance, the interface appears stable, but the signal has been fractured across different technical layers of the page. Each team has been assigned a specific coloured trail, and each trail leads to a different layer of the system. The traces are encoded, so inspect carefully before deciding what belongs to your path.\n\nFollow only your assigned signal colour and inspect the correct layer carefully:\n- Starting trail is hidden in the layer that controls how the interface behaves\n- Middle trail is hidden in the layer that controls how the interface looks\n- Ending trail is hidden in the layer that defines how the interface is structured\n\nDo not drift into another trail's path. False fragments are present, and recovering the wrong one will result in a large negative point penalty.", Link: "https://upside-down-lab.onrender.com", Answer: "THE_GATEWAY_IS_GETTING_NEAR", Clue: "🔴4" },
      { PuzzleName: "Vanished Route", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 6, Description: "A recovered internal document points investigators toward a public identity connected to the missing developer. What first appears to be an ordinary file quickly expands into a wider digital trail involving a public profile, a travel clue, and one final residential lead. Teams must inspect the recovered files carefully, follow the public footprint step by step, decode the fragments they uncover, and reconstruct the next key.", Link: "https://drive.google.com/drive/folders/1wpvaXZdR3v9yp7JtBwATjzVXgsI48_gq", Answer: "L4$T_KN0WN_TR4IL", Clue: "🔴L" },
      { PuzzleName: "Gateway Signal Reconstruction", TrailColor: "Red", TrailType: "Tech", PuzzleIndex: 7, Description: "The missing developer's last signal was split across two corrupted files: an image fragment and an audio dump. One hides data beneath the surface. The other reveals its secret only when the signal is visualized. Recover both hidden fragments and combine them to reconstruct the final transmission key.", Link: "https://drive.google.com/drive/folders/1Uwx_6Brs-9LN5gzG8HpM1jVToZWxKHVU", Answer: "SPECTRUM_SUPER_SECRET_MESSAGE", Clue: "🔴9" },
      
      // RED PHYSICAL
      { PuzzleName: "The Maze", TrailColor: "Red", TrailType: "Physical", PuzzleIndex: 0, Description: "Find the board that displays the maze of the event venue. The shape it forms is the answer.", Link: "", Answer: "LABYRINTH", Clue: "🔴 K" },
      { PuzzleName: "Direction Finder", TrailColor: "Red", TrailType: "Physical", PuzzleIndex: 1, Description: "A navigational tool always pointing north. Find the physical one hidden in your zone.", Link: "", Answer: "COMPASS", Clue: "🔴 2" },
      { PuzzleName: "Zero Longitude", TrailColor: "Red", TrailType: "Physical", PuzzleIndex: 2, Description: "An imaginary line running through the poles. The longitude of zero degrees.", Link: "", Answer: "MERIDIAN", Clue: "🔴 D" },
      { PuzzleName: "Sky meets Earth", TrailColor: "Red", TrailType: "Physical", PuzzleIndex: 3, Description: "Where the sky meets the earth visually. Find the marked zone that represents this boundary.", Link: "", Answer: "HORIZON", Clue: "🔴 8" },
      { PuzzleName: "Blocked Sun", TrailColor: "Red", TrailType: "Physical", PuzzleIndex: 4, Description: "When the moon blocks the sun. A clue hidden in the astronomy exhibit.", Link: "", Answer: "ECLIPSE", Clue: "🔴 Q" },

      // GREEN TECH (UPDATED)
      { PuzzleName: "The Signal Log", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 0, Description: "A corrupted signal log has been recovered from the missing developer's trail. The sequence inside it is not random — each number hides part of a word buried inside nearby Upside Down records. Decode the pattern, trace the letters, and recover the first waypoint in the investigation.", Link: "https://drive.google.com/drive/folders/1iBX-NKxUwXOv9223dovslnzf5Qjut4n3", Answer: "TELEPATHY", Clue: "🟢T" },
      { PuzzleName: "Upside Down QR Signal Recovery", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 1, Description: "A corrupted signal from the Upside Down has been discovered. The transmission was divided into multiple fragments hidden across a digital investigation system. Teams must explore, reconstruct the signal, and decode the final message to continue the search.", Link: "https://github.com/Adil2723", Answer: "QR_SIGNAL_MERGED", Clue: "🟢3" },
      { PuzzleName: "Digital Footprint Trace", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 2, Description: "After restoring the corrupted transmission, investigators discovered traces of the missing developer's activity across multiple public platforms. Teams must follow the developer's digital footprint, recover the hidden key fragments, and reconstruct the next signal.", Link: "", Answer: "Th3_1nv3st1g4t0r_h4s_f0und", Clue: "🟢C" },
      { PuzzleName: "Layered Transmission Recovery", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 3, Description: "After tracing the missing developer's digital footprint, investigators recovered a deeper transmission hidden beneath multiple layers of encoding. Decode the transmission, unlock the protected archive, and uncover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/folders/1YI_k12_aZv9kAv0-ZoISFh86YXiyfGqH", Answer: "LAYERED_SIGNAL_RESTORED", Clue: "🟢H" },
      { PuzzleName: "Dual Signal Recovery", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 4, Description: "Investigators recovered two different traces left behind by the missing developer — one hidden in an audio transmission and the other embedded in a strange score-like document. Decode both traces and combine them to recover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/u/2/folders/1DFj8zGRHJ8pHNU6FQ6dTlaSmxolEdAyv", Answer: "HARMONY_TRACE_RECOVERED", Clue: "🟢F" },
      { PuzzleName: "Signal Layer Inspection", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 5, Description: "Investigators have reached a partially restored recovery terminal linked to the missing developer's recorded system activity. At first glance, the interface appears stable, but the signal has been fractured across different technical layers of the page. Each team has been assigned a specific coloured trail, and each trail leads to a different layer of the system. The traces are encoded, so inspect carefully before deciding what belongs to your path.\n\nFollow only your assigned signal colour and inspect the correct layer carefully:\n- Starting trail is hidden in the layer that controls how the interface behaves\n- Middle trail is hidden in the layer that controls how the interface looks\n- Ending trail is hidden in the layer that defines how the interface is structured\n\nDo not drift into another trail's path. False fragments are present, and recovering the wrong one will result in a large negative point penalty.", Link: "https://upside-down-lab.onrender.com", Answer: "THE_PATH_TO_HIM_IS_CLEARING", Clue: "🟢L" },
      { PuzzleName: "Vanished Route", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 6, Description: "A recovered internal document points investigators toward a public identity connected to the missing developer. What first appears to be an ordinary file quickly expands into a wider digital trail involving a public profile, a travel clue, and one final residential lead. Teams must inspect the recovered files carefully, follow the public footprint step by step, decode the fragments they uncover, and reconstruct the next key.", Link: "https://drive.google.com/drive/folders/1wpvaXZdR3v9yp7JtBwATjzVXgsI48_gq", Answer: "L4$T_KN0WN_TR4IL", Clue: "🟢4" },
      { PuzzleName: "Gateway Signal Reconstruction", TrailColor: "Green", TrailType: "Tech", PuzzleIndex: 7, Description: "The missing developer's last signal was split across two corrupted files: an image fragment and an audio dump. One hides data beneath the surface. The other reveals its secret only when the signal is visualized. Recover both hidden fragments and combine them to reconstruct the final transmission key.", Link: "https://drive.google.com/drive/folders/1Uwx_6Brs-9LN5gzG8HpM1jVToZWxKHVU", Answer: "SPECTRUM_Super_Secret_Message", Clue: "🟢J" },

      // GREEN PHYSICAL (UNCHANGED)
      { PuzzleName: "Height Above Sea", TrailColor: "Green", TrailType: "Physical", PuzzleIndex: 0, Description: "A measurement of height above sea level. Find the sign showing this metric in the stairwell.", Link: "", Answer: "ALTITUDE", Clue: "🟢 F" },
      { PuzzleName: "Cross Terrain", TrailColor: "Green", TrailType: "Physical", PuzzleIndex: 1, Description: "To move across a terrain — a hiking or mapping term. Find the physical route marked in your zone.", Link: "", Answer: "TRAVERSE", Clue: "🟢 4" },
      { PuzzleName: "Summit Point", TrailColor: "Green", TrailType: "Physical", PuzzleIndex: 2, Description: "The highest point of a mountain or achievement. Look for the marked summit illustration.", Link: "", Answer: "PINNACLE", Clue: "🟢 V" },
      { PuzzleName: "Going Down", TrailColor: "Green", TrailType: "Physical", PuzzleIndex: 3, Description: "Moving downward from a height. Find the descending arrow path in the physical zone.", Link: "", Answer: "DESCENT", Clue: "🟢 S" },
      { PuzzleName: "The Guardian", TrailColor: "Green", TrailType: "Physical", PuzzleIndex: 4, Description: "A watchful guardian or guard post. Find the standing figure or marked post in your zone.", Link: "", Answer: "SENTINEL", Clue: "🟢 9" },

      // BLUE TECH (UPDATED)
      { PuzzleName: "The Signal Log", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 0, Description: "A corrupted signal log has been recovered from the missing developer's trail. The sequence inside it is not random — each number hides part of a word buried inside nearby Upside Down records. Decode the pattern, trace the letters, and recover the first waypoint in the investigation.", Link: "https://drive.google.com/drive/folders/1iBX-NKxUwXOv9223dovslnzf5Qjut4n3", Answer: "TELEPATHY", Clue: "🔵N" },
      { PuzzleName: "Upside Down QR Signal Recovery", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 1, Description: "A corrupted signal from the Upside Down has been discovered. The transmission was divided into multiple fragments hidden across a digital investigation system. Teams must explore, reconstruct the signal, and decode the final message to continue the search.", Link: "https://github.com/Os-droid-hash", Answer: "QR_SIGNAL_TRANSMITTED", Clue: "🔵3" },
      { PuzzleName: "Digital Footprint Trace", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 2, Description: "After restoring the corrupted transmission, investigators discovered traces of the missing developer's activity across multiple public platforms. Teams must follow the developer's digital footprint, recover the hidden key fragments, and reconstruct the next signal.", Link: "", Answer: "Th3_d3c0d3r_1s_unl0ck1ng", Clue: "T" },
      { PuzzleName: "Layered Transmission Recovery", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 3, Description: "After tracing the missing developer's digital footprint, investigators recovered a deeper transmission hidden beneath multiple layers of encoding. Decode the transmission, unlock the protected archive, and uncover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/folders/1WbpV4vE7L3lO_rl2CWGDwzTB3dXFMuW7", Answer: "LAYERED_EVIDENCE_RESTORED", Clue: "🔵P" },
      { PuzzleName: "Dual Signal Recovery", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 4, Description: "Investigators recovered two different traces left behind by the missing developer — one hidden in an audio transmission and the other embedded in a strange score-like document. Decode both traces and combine them to recover the next breakthrough in the investigation.", Link: "https://drive.google.com/drive/folders/15KsJNdjq_qrxLgR8FUGqPP2eXNri4NEr", Answer: "IMPULSE_TRACE_RECOVERED", Clue: "🔵1" },
      { PuzzleName: "Signal Layer Inspection", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 5, Description: "Investigators have reached a partially restored recovery terminal linked to the missing developer's recorded system activity. At first glance, the interface appears stable, but the signal has been fractured across different technical layers of the page. Each team has been assigned a specific coloured trail, and each trail leads to a different layer of the system. The traces are encoded, so inspect carefully before deciding what belongs to your path.\n\nFollow only your assigned signal colour and inspect the correct layer carefully:\n- Starting trail is hidden in the layer that controls how the interface behaves\n- Middle trail is hidden in the layer that controls how the interface looks\n- Ending trail is hidden in the layer that defines how the interface is structured\n\nDo not drift into another trail's path. False fragments are present, and recovering the wrong one will result in a large negative point penalty.", Link: "https://upside-down-lab.onrender.com", Answer: "THE_DEVELOPER_LEFT_A_TRACE", Clue: "🔵P" },
      { PuzzleName: "Vanished Route", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 6, Description: "A recovered internal document points investigators toward a public identity connected to the missing developer. What first appears to be an ordinary file quickly expands into a wider digital trail involving a public profile, a travel clue, and one final residential lead. Teams must inspect the recovered files carefully, follow the public footprint step by step, decode the fragments they uncover, and reconstruct the next key.", Link: "https://drive.google.com/drive/folders/1wpvaXZdR3v9yp7JtBwATjzVXgsI48_gq", Answer: "L4$T_KN0WN_TR4IL", Clue: "🔵3" },
      { PuzzleName: "Gateway Signal Reconstruction", TrailColor: "Blue", TrailType: "Tech", PuzzleIndex: 7, Description: "The missing developer's last signal was split across two corrupted files: an image fragment and an audio dump. One hides data beneath the surface. The other reveals its secret only when the signal is visualized. Recover both hidden fragments and combine them to reconstruct the final transmission key.", Link: "https://drive.google.com/drive/folders/1Uwx_6Brs-9LN5gzG8HpM1jVToZWxKHVU", Answer: "SPECTRUM_Super_Secret_Message", Clue: "🔵R" },

      // BLUE PHYSICAL (UNCHANGED)
      { PuzzleName: "Air Spiral", TrailColor: "Blue", TrailType: "Physical", PuzzleIndex: 0, Description: "A violent rotating column of air. Find the spiral diagram in your physical zone.", Link: "", Answer: "VORTEX", Clue: "🔵 N" },
      { PuzzleName: "The Ghost", TrailColor: "Blue", TrailType: "Physical", PuzzleIndex: 1, Description: "Something that appears without a clear source — ghostly. Find the hidden marker in your zone.", Link: "", Answer: "PHANTOM", Clue: "🔵 4" },
      { PuzzleName: "Connection Hub", TrailColor: "Blue", TrailType: "Physical", PuzzleIndex: 2, Description: "A central hub where systems or networks connect. Find the physical connection point in your zone.", Link: "", Answer: "NEXUS", Clue: "🔵 C" },
      { PuzzleName: "Light Range", TrailColor: "Blue", TrailType: "Physical", PuzzleIndex: 3, Description: "The range of colors of light. Find the prism or color strip displayed in your zone.", Link: "", Answer: "SPECTRUM", Clue: "🔵 1" },
      { PuzzleName: "Reaction Trigger", TrailColor: "Blue", TrailType: "Physical", PuzzleIndex: 4, Description: "An agent that triggers a reaction without being consumed. Find the chemical symbol display.", Link: "", Answer: "CATALYST", Clue: "🔵 P" },
    ];
    await Puzzle.insertMany(puzzleSeed);

    // Seed flags
    await Flag.deleteMany({});
    await Flag.create({
      Trail1TechFlagString: "R3V7X4L9",
      Trail2TechFlagString: "T3CHFL4J",
      Trail3TechFlagString: "N3TP1P3R",
      Trail1PhysicalFlagString: "K2D8Q",
      Trail2PhysicalFlagString: "F4VS9",
      Trail3PhysicalFlagString: "N4C1P",
    });

    // Seed boss answers
    await Boss.deleteMany({});
    await Boss.create({
      Trail1Answer: "REDPHOENIX",
      Trail2Answer: "GREENDRAGON",
      Trail3Answer: "BLUEFALCON",
      Trail1Description: "FINAL DIRECTIVE — RED TRAIL: A digital phoenix rises from encrypted ashes. Your trail has led you through ciphers, networks, and physical landmarks. The final answer is the mythical creature reborn from fire that guides the Red Trail. Provide the codename: [Trailname]+[Creature].",
      Trail2Description: "FINAL DIRECTIVE — GREEN TRAIL: Ancient serpents guard the secrets of the deep digital forest. Your trail has woven through binary forests and physical summits. The answer is your trail color followed by the legendary serpentine beast.",
      Trail3Description: "FINAL DIRECTIVE — BLUE TRAIL: A master of the skies, swift and precise. Your trail soared through packets and spectral wonders. The final code is your trail color followed by the aerial predator.",
    });

    // Ensure a global GameState doc exists
    const existing = await GameState.findOne();
    if (!existing) {
      await GameState.create({ GameActive: false, GameEnded: false, GameStartTime: null });
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
    const existing = await User.findOne({ TeamName: teamName.toUpperCase() });
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
      { GameActive: true, GameEnded: false, GameStartTime: now },
      { upsert: true }
    );
    await User.updateMany({}, { GameStartStatus: true });
    res.json({ message: "Game started", startTime: now });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deactivate game (disable start button AND entering mission)
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

// End game — sets GameEnded flag, redirects all users to success/failure
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
      { GameActive: false, GameEnded: true, GameStartTime: null }
    );
    await User.updateMany({}, { GameStartStatus: false });
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

// Reset all user progress
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
      BossStartTime: null,
      BossCompleteTime: null,
      Penalty: 0,
      TotalScore: 0,
      FinalSubmissionTime: null,
    });
    await GameState.findOneAndUpdate({}, { GameActive: false, GameEnded: false, GameStartTime: null });
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
    await Puzzle.deleteMany({});
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

    // Sort: 1) TotalScore desc, 2) puzzles solved desc, 3) FinalSubmissionTime asc (earlier = better)
    const sorted = users.sort((a, b) => {
      // 1. Score — higher is better
      if (b.TotalScore !== a.TotalScore) return b.TotalScore - a.TotalScore;

      // 2. Total puzzles solved — higher is better
      const aSolved = a.TechPuzzleStatusArray.filter(s => s === 2).length
                    + a.PhysicalPuzzleStatus.filter(s => s === 2).length;
      const bSolved = b.TechPuzzleStatusArray.filter(s => s === 2).length
                    + b.PhysicalPuzzleStatus.filter(s => s === 2).length;
      if (bSolved !== aSolved) return bSolved - aSolved;

      // 3. Final submission time — earlier is better (null = not submitted, goes last)
      if (a.FinalSubmissionTime !== null && b.FinalSubmissionTime !== null)
        return a.FinalSubmissionTime - b.FinalSubmissionTime;
      if (a.FinalSubmissionTime !== null) return -1;
      if (b.FinalSubmissionTime !== null) return 1;
      return 0;
    });

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get game state
app.get("/api/game-state", async (req, res) => {
  try {
    const state = await GameState.findOne();
    res.json(state || { GameActive: false, GameEnded: false, GameStartTime: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// PUZZLE CRUD (Admin can manage puzzles)
// ─────────────────────────────────────────────

// Get all puzzles for a trail (used by frontend)
app.get("/api/puzzles/:trailColor", async (req, res) => {
  try {
    const { trailColor } = req.params;
    const techPuzzles = await Puzzle.find({ TrailColor: trailColor, TrailType: "Tech" }).sort({ PuzzleIndex: 1 });
    const physicalPuzzles = await Puzzle.find({ TrailColor: trailColor, TrailType: "Physical" }).sort({ PuzzleIndex: 1 });
    res.json({ tech: techPuzzles, physical: physicalPuzzles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update a puzzle
app.put("/api/admin/puzzle/:id", async (req, res) => {
  const { username, password, ...updates } = req.body;
  if (username !== process.env.AdminUsername || password !== process.env.AdminPassword) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const puzzle = await Puzzle.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(puzzle);
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
    let timeRemaining = 10800;

    if (gameState && gameState.GameStartTime && gameState.GameActive) {
      const elapsed = Math.floor(
        (now - new Date(gameState.GameStartTime).getTime()) / 1000
      );
      timeRemaining = Math.max(0, 10800 - elapsed);
    }

    res.json({
      ...user.toObject(),
      timeRemaining,
      gameEnded: gameState?.GameEnded || false,
      gameActive: gameState?.GameActive || false,
    });
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

    const gameState = await GameState.findOne();

    // Check if game is deactivated
    if (!gameState?.GameActive) {
      return res.status(400).json({ message: "Game is not currently active" });
    }

    if (!user.GameStartStatus) {
      return res.status(400).json({ message: "Game not activated by admin" });
    }

    if (user.GameStartTime) {
      return res.json({ message: "Game already started", user });
    }

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
      // Return the clue for already-solved puzzle
      const puzzle = await Puzzle.findOne({ TrailColor: user.TrailType, TrailType: "Tech", PuzzleIndex: puzzleIndex });
      return res.json({ result: "already_solved", clue: puzzle?.Clue || "" });
    }

    if (user.TechPuzzleStatusArray[puzzleIndex] !== 1) {
      return res.status(400).json({ message: "Puzzle is locked" });
    }

    const puzzle = await Puzzle.findOne({ TrailColor: user.TrailType, TrailType: "Tech", PuzzleIndex: puzzleIndex });
    if (!puzzle) return res.status(500).json({ message: "Puzzle not found" });

    const isCorrect = answer.trim().toUpperCase() === puzzle.Answer.toUpperCase();

    const gameState = await GameState.findOne();
    const elapsed = gameState?.GameStartTime
      ? Math.floor((Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000)
      : 0;

    let timeSinceLast = elapsed;
    if (puzzleIndex > 0) {
      timeSinceLast = elapsed - (user.TechPuzzleTime[puzzleIndex - 1] || 0);
    }

    if (isCorrect) {
      user.TechPuzzleStatusArray[puzzleIndex] = 2;
      user.TechPuzzleAnswerArray[puzzleIndex] = answer.trim().toUpperCase();
      user.TechPuzzleTime[puzzleIndex] = elapsed;
      user.TotalScore += 10;

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

      return res.json({ result: "correct", score: user.TotalScore, timeSinceLast, clue: puzzle.Clue });
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
      const puzzle = await Puzzle.findOne({ TrailColor: user.TrailType, TrailType: "Physical", PuzzleIndex: puzzleIndex });
      return res.json({ result: "already_solved", clue: puzzle?.Clue || "" });
    }

    if (user.PhysicalPuzzleStatus[puzzleIndex] !== 1) {
      return res.status(400).json({ message: "Puzzle is locked" });
    }

    const puzzle = await Puzzle.findOne({ TrailColor: user.TrailType, TrailType: "Physical", PuzzleIndex: puzzleIndex });
    if (!puzzle) return res.status(500).json({ message: "Puzzle not found" });

    const isCorrect = answer.trim().toUpperCase() === puzzle.Answer.toUpperCase();

    const gameState = await GameState.findOne();
    const elapsed = gameState?.GameStartTime
      ? Math.floor((Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000)
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

      return res.json({ result: "correct", score: user.TotalScore, clue: puzzle.Clue });
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

// Get puzzle clue (for already-solved puzzles, re-show clue on click)
app.get("/api/puzzle/clue", async (req, res) => {
  const { teamName, puzzleIndex, type } = req.query;
  try {
    const user = await User.findOne({ TeamName: teamName.toUpperCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const trailType = type === "tech" ? "Tech" : "Physical";
    const puzzle = await Puzzle.findOne({ TrailColor: user.TrailType, TrailType: trailType, PuzzleIndex: parseInt(puzzleIndex) });
    if (!puzzle) return res.status(404).json({ message: "Puzzle not found" });

    res.json({ clue: puzzle.Clue, description: puzzle.Description, puzzleName: puzzle.PuzzleName });
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

    const combinedFlag = flags.tech + flags.physical;

    if (flagInput.trim() === combinedFlag) {
      // Record when boss was unlocked/accessed
      const gameState = await GameState.findOne();
      const elapsed = gameState?.GameStartTime
        ? Math.floor((Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000)
        : 0;
      if (!user.BossStartTime) {
        user.BossStartTime = elapsed;
        await user.save();
      }
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
    const isCorrect = answer.trim().toUpperCase() === correctAnswer.toUpperCase();

    if (isCorrect) {
      const gameState = await GameState.findOne();
      const elapsed = gameState?.GameStartTime
        ? Math.floor((Date.now() - new Date(gameState.GameStartTime).getTime()) / 1000)
        : 0;

      user.SafeStatus = true;
      user.FinalSubmissionTime = elapsed;
      user.BossCompleteTime = elapsed;
      user.TotalScore += 50;
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

// Get boss description for a trail
app.get("/api/boss/description/:trailType", async (req, res) => {
  try {
    const bossAnswers = await Boss.findOne();
    if (!bossAnswers) return res.status(404).json({ message: "Boss not configured" });

    const idx = getTrailIndex(req.params.trailType);
    res.json({ description: bossAnswers[`Trail${idx}Description`] });
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