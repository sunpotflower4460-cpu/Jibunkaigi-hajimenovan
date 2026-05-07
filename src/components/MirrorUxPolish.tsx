import { useEffect, useState } from 'react';
import { Compass, Droplets, Sparkles } from 'lucide-react';
import { loadState } from '../services/storage';

const cues = [
  {
    icon: <Droplets size={12} />,
    label: '言葉を置く',
    detail: 'まずは整えず、そのまま水面へ',
  },
  {
    icon: <Sparkles size={12} />,
    label: '5つの鏡が映す',
    detail: '情熱・感情・構造・盲点・声',
  },
  {
    icon: <Compass size={12} />,
    label: '最後は自分に返る',
    detail: '答えではなく、配置を見る',
  },
];

export const MirrorUxPolish = () => {
  const [accepted, setAccepted] = useState(false);
  const [cueIndex, setCueIndex] = useState(0);

  useEffect(() => {
    const sync = () => {
      try {
        setAccepted(Boolean(loadState().settings.termsAccepted));
      } catch {
        setAccepted(false);
      }
    };

    sync();
    const interval = window.setInterval(sync, 1400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCueIndex(index => (index + 1) % cues.length);
    }, 5200);
    return () => window.clearInterval(interval);
  }, []);

  if (!accepted) return null;

  const cue = cues[cueIndex];

  return (
    <div className="mirror-ux-polish" aria-hidden="true">
      <div className="mirror-ux-orb" />
      <div className="mirror-ux-cue">
        <span className="mirror-ux-cue-icon">{cue.icon}</span>
        <span className="mirror-ux-cue-main">{cue.label}</span>
        <span className="mirror-ux-cue-divider" />
        <span className="mirror-ux-cue-detail">{cue.detail}</span>
      </div>
    </div>
  );
};
