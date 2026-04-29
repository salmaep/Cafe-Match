import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Facility, PurposeLabel, WizardPreferences } from '../../types/wizard';
import { usePreferences } from '../../context/PreferencesContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { TOTAL_STEPS } from './wizardData';
import StepPurpose from './StepPurpose';
import StepLocation from './StepLocation';
import StepRadius from './StepRadius';
import StepAmenities from './StepAmenities';

export default function Wizard() {
  const navigate = useNavigate();
  const { setPreferences, setWizardCompleted } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useGeolocation();

  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<PurposeLabel | undefined>();
  const [locationType, setLocationType] = useState<'current' | 'custom'>('current');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [radiusVal, setRadiusVal] = useState(1);
  const [amenities, setAmenities] = useState<Facility[]>([]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleFinish();
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    setPreferences(null);
    setWizardCompleted(true);
    navigate('/', { replace: true });
  };

  const handleFinish = () => {
    const useCustomCoords = locationType === 'custom' && customLat !== null && customLng !== null;
    const prefs: WizardPreferences = {
      purpose,
      location: {
        type: locationType,
        latitude: useCustomCoords ? customLat : userLat,
        longitude: useCustomCoords ? customLng : userLng,
        label: locationType === 'custom' ? customAddress || 'Custom Destination' : 'Current Location',
      },
      radius: radiusVal,
      amenities: amenities.length > 0 ? amenities : undefined,
    };
    setPreferences(prefs);
    setWizardCompleted(true);
    navigate('/discover', { replace: true });
  };

  const toggleAmenity = (a: Facility) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <header className="flex items-center justify-between px-6 pt-10 pb-3 max-w-2xl w-full mx-auto">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-medium text-[#1C1C1A] w-12 text-left hover:text-amber-600 transition-colors"
          >
            Back
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
                  ? 'bg-amber-600 w-6'
                  : i < step
                    ? 'bg-amber-600 w-2'
                    : 'bg-gray-200 w-2'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-500 w-12 text-right hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          {step === 0 && <StepPurpose value={purpose} onChange={setPurpose} />}
          {step === 1 && (
            <StepLocation
              locationType={locationType}
              customAddress={customAddress}
              onTypeChange={setLocationType}
              onAddressChange={(text) => {
                setCustomAddress(text);
                setCustomLat(null);
                setCustomLng(null);
              }}
              onSuggestionPick={(s) => {
                setCustomAddress(s.label);
                setCustomLat(s.latitude);
                setCustomLng(s.longitude);
              }}
            />
          )}
          {step === 2 && <StepRadius value={radiusVal} onChange={setRadiusVal} />}
          {step === 3 && <StepAmenities value={amenities} onToggle={toggleAmenity} />}
        </div>
      </main>

      <footer className="px-6 pb-10 pt-4 max-w-2xl w-full mx-auto">
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 bg-[#1C1C1A] hover:bg-black text-white font-bold rounded-xl transition-colors"
        >
          {step === TOTAL_STEPS - 1 ? 'Find My Cafe' : 'Next'}
        </button>
      </footer>
    </div>
  );
}
