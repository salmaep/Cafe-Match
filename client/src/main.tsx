import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import { HelmetProvider } from "react-helmet-async";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ShortlistProvider } from "./context/ShortlistContext";
import { initGA } from "./utils/analytics";
import "./i18n";
import "./index.css";
import App from "./App.tsx";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

initGA();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
        <BrowserRouter>
          <NuqsAdapter>
            <AuthProvider>
              <PreferencesProvider>
                <ShortlistProvider>
                  <App />
                </ShortlistProvider>
              </PreferencesProvider>
            </AuthProvider>
          </NuqsAdapter>
        </BrowserRouter>
      </APIProvider>
    </HelmetProvider>
  </StrictMode>,
);
