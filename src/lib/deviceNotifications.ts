interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export interface DeviceNotificationStatus {
  detail: string;
  label: string;
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
}

export function deviceNotificationStatus(): DeviceNotificationStatus {
  if (!window.isSecureContext) return { detail: "Notifications require the secure live Firebase address.", label: "Live site required" };
  if (isIosDevice() && !isStandaloneApp()) return { detail: "On iPhone, open the live app in Safari and choose Share → Add to Home Screen first.", label: "Install on Home Screen" };
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return { detail: "This browser does not support web notifications.", label: "Not supported here" };
  if (Notification.permission === "granted") return { detail: "This device has already allowed MyProperty notifications.", label: "Notifications enabled" };
  if (Notification.permission === "denied") return { detail: "Notifications are blocked in this device's browser settings.", label: "Permission blocked" };
  return { detail: "Only this device will receive the test after you approve the permission prompt.", label: "Ready for a private test" };
}

export async function sendDeviceTestNotification(): Promise<void> {
  const status = deviceNotificationStatus();
  if (!window.isSecureContext) throw new Error(status.detail);
  if (isIosDevice() && !isStandaloneApp()) throw new Error(status.detail);
  if (!("serviceWorker" in navigator) || !("Notification" in window)) throw new Error(status.detail);

  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") throw new Error("Notification permission was not granted. You can enable it later in your device settings.");

  const registration = await navigator.serviceWorker.register("/notification-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  await registration.showNotification("MyProperty 2.0 is ready", {
    body: "The updated dashboard, rooms, payments, water and property tools are now live. Tap to open MyProperty.",
    data: { url: "/" },
    icon: "/myproperty-icon.svg",
    tag: "myproperty-v2-device-test",
  });
}
