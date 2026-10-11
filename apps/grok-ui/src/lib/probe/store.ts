import { create } from "zustand";
import type { FleetSearch } from "./filters";
import { mockProbeSource } from "./source";

interface ProbeState {
  step: number;
  phase: "ready" | "syncing";
  booted: boolean;
  timer: number | null;
  fleetSearch: FleetSearch | null;
  setFleetSearch: (search: FleetSearch) => void;
  boot: () => void;
  halt: () => void;
  sync: () => Promise<void>;
}

export const useProbe = create<ProbeState>((set, get) => ({
  step: 0,
  phase: "ready",
  booted: false,
  timer: null,
  fleetSearch: null,
  setFleetSearch: (fleetSearch) => set({ fleetSearch }),
  boot: () => {
    if (get().timer != null) return;
    const timer = window.setInterval(() => {
      if (get().phase === "ready") {
        set((state) => ({ step: state.step + 1 }));
      }
    }, 2500);
    set({ booted: true, timer });
  },
  halt: () => {
    const timer = get().timer;
    if (timer != null) window.clearInterval(timer);
    set({ timer: null });
  },
  sync: async () => {
    if (get().phase === "syncing") return;
    set({ phase: "syncing" });
    await mockProbeSource.load();
    set((state) => ({ phase: "ready", step: state.step + 1 }));
  },
}));
