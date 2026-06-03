import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket;
  socketId: string;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SocketContextValue | null>(null);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
    const socket = serverUrl
      ? io(serverUrl, { autoConnect: true })
      : io({ autoConnect: true });

    function onConnect() {
      setValue({ socket, socketId: socket.id ?? '' });
    }

    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, []);

  if (!value) {
    return (
      <main className="page">
        <div className="card">
          <p className="joined-line muted">Connecting…</p>
        </div>
      </main>
    );
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}
