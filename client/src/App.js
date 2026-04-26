import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LoadingPage1 from "./components/LoadingPage1";
import LoadingPage2 from "./components/LoadingPage2";
import LoginPage from "./components/LoginPage";
import HomePage from "./components/HomePage";
import PuzzleRoom from "./components/PuzzleRoom";
import BossLevel from "./components/BossLevel";
import SuccessPage from "./components/SuccessPage";
import FailurePage from "./components/FailurePage";
import LeaderBoard from "./components/LeaderBoard";
import AdminPanelPage from "./components/AdminPanelPage";

const participantToken = sessionStorage.getItem("participantToken");
if (participantToken) {
  axios.defaults.headers.common.Authorization = `Bearer ${participantToken}`;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoadingPage1 />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/loading" element={<LoadingPage2 />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/puzzle-room" element={<PuzzleRoom />} />
        <Route path="/boss-level" element={<BossLevel />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/failure" element={<FailurePage />} />
        <Route path="/leaderboard" element={<LeaderBoard />} />
        <Route path="/admin" element={<AdminPanelPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;