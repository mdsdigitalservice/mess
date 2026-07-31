'use client';

import { useState } from 'react';
import type { Track } from '@/lib/types';
import TracksTable from './TracksTable';
import UploadPanel from './UploadPanel';

export default function AdminDashboard({ initialTracks }: { initialTracks: Track[] }) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);

  return (
    <div className="space-y-8">
      <UploadPanel onUploaded={(track) => setTracks((prev) => [track, ...prev])} />
      <TracksTable
        tracks={tracks}
        onDeleted={(id) => setTracks((prev) => prev.filter((t) => t.id !== id))}
        onUpdated={(track) => setTracks((prev) => prev.map((t) => (t.id === track.id ? track : t)))}
      />
    </div>
  );
}
