interface MeterOdometerProps {
  compact?: boolean;
  digitCount: number;
  label?: string;
  value: number;
}

interface MeterOdometerInputProps extends MeterOdometerProps {
  disabled?: boolean;
  onChange: (value: number) => void;
}

const digitOptions = Array.from({ length: 10 }, (_, index) => index);

export function clampMeterDigitCount(value: number): number {
  return Math.min(8, Math.max(3, Math.round(value || 5)));
}

export function maximumMeterReading(digitCount: number): number {
  return 10 ** clampMeterDigitCount(digitCount) - 0.1;
}

export function clampMeterReading(value: number, digitCount: number): number {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.min(maximumMeterReading(digitCount), Math.max(0, Math.round(safeValue * 10) / 10));
}

function readingDigits(value: number, digitCount: number) {
  const safeDigitCount = clampMeterDigitCount(digitCount);
  const safeValue = clampMeterReading(value, safeDigitCount);
  const whole = Math.floor(safeValue).toString().padStart(safeDigitCount, "0").slice(-safeDigitCount);
  const decimal = Math.round((safeValue - Math.floor(safeValue)) * 10) % 10;
  return { decimal, whole: whole.split("").map(Number) };
}

export function MeterOdometer({ compact = false, digitCount, label = "Meter reading", value }: MeterOdometerProps) {
  const digits = readingDigits(value, digitCount);
  return (
    <div aria-label={`${label}: ${clampMeterReading(value, digitCount).toFixed(1)} cubic metres`} className={`meter-odometer${compact ? " meter-odometer--compact" : ""}`} role="img">
      <div className="meter-odometer__wheels">
        {digits.whole.map((digit, index) => <span className="meter-odometer__wheel" key={`${index}-${digit}`}>{digit}</span>)}
        <i aria-hidden="true">.</i>
        <span className="meter-odometer__wheel meter-odometer__wheel--decimal">{digits.decimal}</span>
      </div>
      <span className="meter-odometer__unit">m³</span>
    </div>
  );
}

export function MeterOdometerInput({ compact = false, digitCount, disabled = false, label = "Meter reading", onChange, value }: MeterOdometerInputProps) {
  const safeDigitCount = clampMeterDigitCount(digitCount);
  const digits = readingDigits(value, safeDigitCount);

  function updateWholeDigit(index: number, digit: number) {
    const nextWhole = [...digits.whole];
    nextWhole[index] = digit;
    onChange(clampMeterReading(Number(nextWhole.join("")) + digits.decimal / 10, safeDigitCount));
  }

  function updateDecimal(digit: number) {
    onChange(clampMeterReading(Number(digits.whole.join("")) + digit / 10, safeDigitCount));
  }

  return (
    <div className="field field--wide meter-odometer-control">
      <span className="meter-odometer-control__label">{label}</span>
      <div className={`meter-odometer meter-odometer--input${compact ? " meter-odometer--compact" : ""}`}>
        <div className="meter-odometer__wheels">
          {digits.whole.map((digit, index) => (
            <select aria-label={`${label}, whole-number digit ${index + 1} of ${safeDigitCount}`} className="meter-odometer__wheel" disabled={disabled} key={index} onChange={(event) => updateWholeDigit(index, Number(event.target.value))} value={digit}>
              {digitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ))}
          <i aria-hidden="true">.</i>
          <select aria-label={`${label}, red decimal digit`} className="meter-odometer__wheel meter-odometer__wheel--decimal" disabled={disabled} onChange={(event) => updateDecimal(Number(event.target.value))} value={digits.decimal}>
            {digitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <span className="meter-odometer__unit">m³</span>
      </div>
      <small className="field-hint">Set each wheel to match the physical meter. The red wheel records tenths of a cubic metre.</small>
    </div>
  );
}
