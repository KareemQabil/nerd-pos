import { create } from 'zustand';

type SessionContextState = {
  activeSessionId?: string;
  terminalId?: string;
  setActiveSessionId: (sessionId?: string) => void;
  setTerminalId: (terminalId?: string) => void;
};

export const useSessionContextStore = create<SessionContextState>((set) => ({
  activeSessionId: undefined,
  terminalId: undefined,
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setTerminalId: (terminalId) => set({ terminalId }),
}));
