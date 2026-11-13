import { useSyncExternalStore } from 'react';

/** Store mínimo compatível com useSyncExternalStore. */
export class Store<T> {
  private listeners = new Set<() => void>();
  constructor(protected state: T) {}

  getState = (): T => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  protected setState(patch: Partial<T>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
}

export function useStore<T, S>(store: Store<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
