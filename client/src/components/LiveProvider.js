import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { eventsUrl } from '../api';
import { formatDate, formatTime } from '../lib/format';
import { useToast } from './ui/Toast';

const LiveContext = createContext({ status: 'offline', subscribe: () => () => {} });

const EVENTS = ['appointment', 'slots', 'directory'];

/**
 * Holds one Server-Sent Events connection for the signed-in person and lets
 * any component subscribe to `appointment`, `slots`, `directory` and
 * `reconnected` events. EventSource reconnects on its own after drops.
 */
export function LiveProvider({ token, children }) {
  const [status, setStatus] = useState('offline');
  const listeners = useRef(new Map());

  const emit = useCallback((event, data) => {
    listeners.current.get(event)?.forEach((handler) => handler(data));
  }, []);

  useEffect(() => {
    if (!token || typeof window.EventSource === 'undefined') {
      setStatus('offline');
      return undefined;
    }

    let source = null;
    let connectedBefore = false;

    const onReady = () => {
      setStatus('live');
      // After a drop, data may have changed while offline: let pages refetch.
      if (connectedBefore) emit('reconnected', null);
      connectedBefore = true;
    };
    const handlers = EVENTS.map((event) => [
      event,
      (message) => {
        let data = null;
        try {
          data = JSON.parse(message.data);
        } catch {
          data = null;
        }
        emit(event, data);
      },
    ]);

    const open = () => {
      const stream = new window.EventSource(eventsUrl(token));
      stream.addEventListener('ready', onReady);
      handlers.forEach(([event, handler]) => stream.addEventListener(event, handler));
      stream.onerror = () => {
        setStatus(stream.readyState === window.EventSource.CLOSED ? 'offline' : 'connecting');
      };
      source = stream;
      setStatus('connecting');
    };

    const close = () => {
      if (!source) return;
      source.close();
      source = null;
    };

    // Browsers allow only six connections per site over HTTP/1.1. Close the
    // stream as soon as the page is hidden so pages kept in the back/forward
    // cache don't hold connections open, and reopen it if the page comes back.
    const onPageHide = () => close();
    const onPageShow = (event) => {
      if (event.persisted && !source) open();
    };

    open();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      close();
    };
  }, [token, emit]);

  const subscribe = useCallback((event, handler) => {
    const set = listeners.current.get(event) || new Set();
    set.add(handler);
    listeners.current.set(event, set);
    return () => set.delete(handler);
  }, []);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}

/** Run `handler` whenever `event` arrives. The latest handler is always used. */
export function useLiveEvent(event, handler) {
  const { subscribe } = useLive();
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => subscribe(event, (data) => saved.current(data)), [event, subscribe]);
}

/** A small "Updates live" marker so people know they don't need to refresh. */
export function LiveStatus({ className = '' }) {
  const { status } = useLive();
  const label = { live: 'Updates live', connecting: 'Connecting…', offline: 'Live updates off' }[status];
  const dot = { live: 'bg-confirmed', connecting: 'bg-pending', offline: 'bg-cancelled' }[status];
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-semibold text-ink-muted ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function when(appointment) {
  return `${formatDate(appointment.date, 'EEE d MMM')} at ${formatTime(appointment.time)}`;
}

/** Turn appointment changes made by someone else into toasts for the person they affect. */
export function LiveNotifications({ user }) {
  const { notify } = useToast();

  useLiveEvent('appointment', (event) => {
    if (!user || !event?.appointment) return;
    const { action, actor, appointment } = event;
    if (actor && String(actor.id) === String(user.id)) return;

    const doctorName = appointment.doctor?.name || 'The doctor';
    const patientName = appointment.user?.name || 'A patient';
    const isPatient = String(appointment.user?._id || appointment.user) === String(user.id);

    if (isPatient) {
      if (action === 'confirmed') notify({ title: `${doctorName} confirmed your appointment`, description: when(appointment) });
      else if (action === 'cancelled') notify({ tone: 'error', title: `Your appointment with ${doctorName} was cancelled`, description: when(appointment) });
      else if (action === 'completed') notify({ tone: 'info', title: `Your visit with ${doctorName} is marked completed` });
      return;
    }

    if (user.role === 'doctor') {
      if (action === 'booked') notify({ title: `New request from ${patientName}`, description: when(appointment) });
      else if (action === 'rescheduled') notify({ tone: 'info', title: `${patientName} moved their appointment`, description: `Now ${when(appointment)}` });
      else if (action === 'cancelled' && actor?.role === 'user') notify({ tone: 'info', title: `${patientName} cancelled`, description: when(appointment) });
      return;
    }

    if (user.role === 'admin' && action === 'booked') {
      notify({ tone: 'info', title: `New booking: ${patientName} with ${doctorName}`, description: when(appointment) });
    }
  });

  return null;
}
