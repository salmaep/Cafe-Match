import { Navigate, useNavigate } from "react-router-dom";
import Wizard from "../components/wizard/Wizard";
import Seo from "../components/seo/Seo";
import { usePreferences } from "../context/PreferencesContext";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { wizardCompleted, preferences } = usePreferences();

  // Wizard runs once per localStorage lifetime. Subsequent visits to
  // /discover go straight to the swipe deck. Resetting via HomePage
  // (clearPreferences) brings the wizard back.
  if (wizardCompleted && preferences) {
    return <Navigate to="/discover/swipe" replace />;
  }

  return (
    <>
      <Seo
        title="Discover cafes"
        description="Find cafes that match your mood, budget, and location."
      />
      <Wizard
        onComplete={() => navigate("/discover/swipe", { replace: true })}
      />
    </>
  );
}
