import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { deviceNotificationStatus, sendDeviceTestNotification } from "../../lib/deviceNotifications";

export function DeviceNotificationTest() {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState("");
  const status = deviceNotificationStatus();

  async function sendTest() {
    setIsSending(true);
    setResult("");
    try {
      await sendDeviceTestNotification();
      setResult("Test sent to this device only. Check your notifications.");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "The test notification could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="settings-section settings-section--compact">
      <header>
        <div><span className="settings-icon"><Icon name="bell" /></span><div><h2>Device Notifications</h2><p>Test the new alert experience without contacting another user.</p></div></div>
      </header>
      <div className="info-box device-notification-status">
        <strong>{status.label}</strong>
        <p>{status.detail}</p>
      </div>
      <button className="legacy-action-button legacy-action-button--green btn btn-green btn-sm" disabled={isSending} onClick={() => void sendTest()} type="button">
        {isSending ? "Sending test…" : "Enable & Send Test"}
      </button>
      {result && <p aria-live="polite" className="device-notification-result">{result}</p>}
    </article>
  );
}
