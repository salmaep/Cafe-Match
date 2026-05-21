import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { commonText, wizardText } from "@shared/i18n";
import {
  useQueryStates,
  parseAsInteger,
  parseAsFloat,
  parseAsString,
  parseAsArrayOf,
} from "nuqs";
import type { WizardPreferences } from "../../types/wizard";
import type { PurposeSlug } from "../../constants/purposes";
import { usePreferences } from "../../context/PreferencesContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { TOTAL_STEPS } from "./wizardData";
import StepPurpose from "./StepPurpose";
import StepLocation from "./StepLocation";
import StepRadius from "./StepRadius";
import StepAmenities from "./StepAmenities";

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function Wizard({ onComplete, onSkip }: Props = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPreferences, setWizardCompleted, serverPurposes } =
    usePreferences();
  const { latitude: userLat, longitude: userLng } = useGeolocation();

  // URL: /discover?step=0&vibe=date&lat=-6.9175&lng=107.6191&r=3&f=Romantic,Quiet&price=$$
  const [params, setParams] = useQueryStates(
    {
      step: parseAsInteger.withDefault(0),
      vibe: parseAsString.withDefault(""),
      lat: parseAsFloat,
      lng: parseAsFloat,
      r: parseAsInteger.withDefault(1),
      f: parseAsArrayOf(parseAsString).withDefault([]),
      price: parseAsString.withDefault(""),
    },
    { history: "push" },
  );

  const purpose = (params.vibe || undefined) as PurposeSlug | undefined;
  const step = params.step;

  const preselectedFromPurpose = useMemo<string[]>(() => {
    if (!purpose) return [];
    const found = serverPurposes.find((p) => p.slug === purpose);
    if (!found?.requirements) return [];
    return found.requirements
      .map((r) => r.feature?.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
  }, [purpose, serverPurposes]);

  useEffect(() => {
    if (preselectedFromPurpose.length === 0) return;
    setParams({ f: preselectedFromPurpose });
  }, [preselectedFromPurpose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setParams({ step: step + 1 });
    else handleFinish();
  };
  const handleBack = () => {
    if (step > 0) setParams({ step: step - 1 });
  };

  const handleSkip = () => {
    setPreferences(null);
    setWizardCompleted(true);
    if (onSkip) onSkip();
    else navigate("/", { replace: true });
  };

  const handleFinish = () => {
    const lat = params.lat ?? userLat;
    const lng = params.lng ?? userLng;
    const prefs: WizardPreferences = {
      purpose,
      location: {
        type: params.lat != null ? "custom" : "current",
        latitude: lat,
        longitude: lng,
        label:
          params.lat != null
            ? `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`
            : "Current Location",
      },
      radius: params.r,
      amenities: params.f.length > 0 ? params.f : undefined,
      priceRange: params.price || undefined,
    };
    setPreferences(prefs);
    setWizardCompleted(true);
    if (onComplete) onComplete();
    else navigate("/discover", { replace: true });
  };

  // Block Next on step 1 only when lat/lng completely missing (no geolocation either)
  const isNextDisabled =
    step === 1 &&
    params.lat === null &&
    params.lng === null &&
    userLat === null;

  return (
    <div className="flex flex-col bg-[#FAF9F6] min-h-[calc(100dvh-8rem)] md:min-h-[calc(100vh-4rem)]">
      <header className="flex items-center justify-between px-6 pt-10 pb-3 max-w-2xl w-full mx-auto">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-medium text-[#1C1C1A] w-12 text-left hover:text-amber-600 transition-colors"
          >
            {t(commonText.back)}
          </button>
        ) : (
          <span className="w-12" />
        )}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "bg-amber-600 w-6"
                  : i < step
                    ? "bg-amber-600 w-2"
                    : "bg-gray-200 w-2"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-500 w-12 text-right hover:text-gray-700 transition-colors"
        >
          {t(commonText.skip)}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          {step === 0 && (
            <StepPurpose
              value={purpose}
              onChange={(slug) => setParams({ vibe: slug, step: 1 })}
            />
          )}
          {step === 1 && (
            <StepLocation
              lat={params.lat}
              lng={params.lng}
              userLat={userLat}
              userLng={userLng}
              onChange={(lat, lng) => setParams({ lat, lng })}
            />
          )}
          {step === 2 && (
            <StepRadius
              value={params.r}
              onChange={(v) => setParams({ r: v })}
            />
          )}
          {step === 3 && (
            <StepAmenities
              facilities={params.f}
              onFacilitiesChange={(next) => setParams({ f: next })}
              priceRange={params.price}
              onPriceRangeChange={(v) => setParams({ price: v })}
              autoSelectedKeys={preselectedFromPurpose}
            />
          )}
        </div>
      </main>

      <footer className="px-6 pb-10 pt-4 max-w-2xl w-full mx-auto">
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          className="w-full py-4 bg-[#1C1C1A] hover:bg-black text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1C1C1A]"
        >
          {step === TOTAL_STEPS - 1 ? t(wizardText.findCafes) : t(commonText.next)}
        </button>
      </footer>
    </div>
  );
}
