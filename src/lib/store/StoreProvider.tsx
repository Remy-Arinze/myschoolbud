'use client';

import { useRef, useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';
import { makeStore, AppStore } from './store';
import type { Persistor } from 'redux-persist';

function SessionBoot() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400" />
    </div>
  );
}

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>();
  const persistorRef = useRef<Persistor | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Only create persistor once on client side
  if (typeof window !== 'undefined' && !persistorRef.current) {
    persistorRef.current = persistStore(storeRef.current);
  }

  if (!isClient || !persistorRef.current) {
    return (
      <Provider store={storeRef.current}>
        <SessionBoot />
      </Provider>
    );
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={<SessionBoot />} persistor={persistorRef.current}>
        {children}
      </PersistGate>
    </Provider>
  );
}
