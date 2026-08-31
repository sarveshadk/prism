import { Appearance } from 'react-native';
import { create } from 'zustand';
import type { Ecl, RejectReason } from './protocol';

export type Run = {
  id: string;
  at: number;
  kind: 'receive' | 'encode-sweep';
  chunkSize: number;
  fps: number;
  ecl: Ecl;
  shuffled: boolean;
  qrVersion: number;
  chunkCount?: number;
  chunksReceived?: number;
  fileBytes?: number;
  seconds?: number;
  goodputBps?: number;
  duplicates?: number;
  symbolsSeen?: number;
  meanDecodeMs?: number;
  rejects?: Partial<Record<RejectReason, number>>;
  complete?: boolean;
  // sweep only
  encodeMsPerFrame?: number;
  ceilingBps?: number;
};

export type ThemePref = 'Light' | 'Dark';

type State = {
  themePref: ThemePref;
  chunkSize: number;
  fps: number;
  ecl: Ecl;
  shuffled: boolean;
  channel: 'QR' | 'Audio';
  sendState: 'idle' | 'sending';
  recvState: 'idle' | 'receiving' | 'complete' | 'error';
  runs: Run[];
  patch: (p: Partial<State>) => void;
  addRun: (r: Run) => void;
  clearRuns: () => void;
};

export const useStore = create<State>((set) => ({
  // the device scheme seeds the first launch; after that the toggle owns it
  themePref: Appearance.getColorScheme() === 'dark' ? 'Dark' : 'Light',
  chunkSize: 1500,
  fps: 8,
  ecl: 'L',
  shuffled: false,
  channel: 'QR',
  sendState: 'idle',
  recvState: 'idle',
  runs: [],
  patch: (p) => set(p),
  addRun: (r) => set((s) => ({ runs: [r, ...s.runs].slice(0, 200) })),
  clearRuns: () => set({ runs: [] }),
}));
