import { useNavigate } from 'react-router-dom';
import Wizard from '../components/wizard/Wizard';
import Seo from '../components/seo/Seo';

export default function DiscoverPage() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Discover cafes"
        description="Find cafes that match your mood, budget, and location."
      />
      <Wizard
        onComplete={() => navigate('/discover/swipe', { replace: true })}
        onSkip={() => navigate('/', { replace: true })}
      />
    </>
  );
}
