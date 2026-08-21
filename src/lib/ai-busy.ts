
const EVENT_NAME = "ki-glossar:ai-busy";

let busy = false;

export function setAiBusy(value: boolean) {
  busy = value;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
  }
}

export function isAiBusy() {
  return busy;
}

export function onAiBusyChange(handler: (value: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    handler((event as CustomEvent<boolean>).detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
