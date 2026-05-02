import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { getCloudSaveSnapshot, subscribeCloudSaveStatus, type CloudSaveSnapshot } from '../services/cloud/firebaseCloud';

const getStatusLabel = (snapshot: CloudSaveSnapshot) => {
  switch (snapshot.status) {
    case 'disabled':
      return '端末内保存';
    case 'connecting':
      return 'クラウド準備中';
    case 'signed-in':
      return 'クラウド接続済み';
    case 'syncing':
      return 'クラウド保存中';
    case 'synced':
      return 'クラウド保存済み';
    case 'error':
      return '端末内保存';
    default:
      return '端末内保存';
  }
};

const getIcon = (snapshot: CloudSaveSnapshot) => {
  if (snapshot.status === 'connecting' || snapshot.status === 'syncing') {
    return <Loader2 size={12} className="animate-spin" />;
  }
  if (snapshot.status === 'disabled' || snapshot.status === 'error') {
    return <CloudOff size={12} />;
  }
  return <Cloud size={12} />;
};

export const CloudSaveStatusBadge = () => {
  const [snapshot, setSnapshot] = useState<CloudSaveSnapshot>(() => getCloudSaveSnapshot());

  useEffect(() => subscribeCloudSaveStatus(setSnapshot), []);

  const label = getStatusLabel(snapshot);
  const isCloudActive = snapshot.status !== 'disabled' && snapshot.status !== 'error';

  return (
    <div
      className={`cloud-save-status-badge fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black shadow-lg backdrop-blur-xl transition ${
        isCloudActive
          ? 'border-indigo-100 bg-white/80 text-indigo-500'
          : 'border-white/60 bg-white/60 text-slate-400'
      }`}
      title={snapshot.errorMessage || label}
    >
      {getIcon(snapshot)}
      <span>{label}</span>
    </div>
  );
};
