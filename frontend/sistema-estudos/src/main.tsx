import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <OnboardingProvider>
          <App />
        </OnboardingProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);
