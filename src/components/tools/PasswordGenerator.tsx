import { useState, useCallback, useEffect } from 'react';
import { Copy, RefreshCw, Check, Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, RotateCcw, Hash, Shuffle } from 'lucide-react';
import {
  generatePassword,
  entropyBits,
  poolSize,
  strengthFor,
  crackSeconds,
  formatDuration,
  parseLength,
  CHAR_SETS,
  MIN_LENGTH,
  MAX_LENGTH,
  type PasswordOptions,
  type StrengthTone,
} from '../../lib/dev-tools/password';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';

const BULLET = String.fromCharCode(0x2022);

/* Strength styling (labels and thresholds live in lib/dev-tools/password.ts) */
const TONE_STYLES: Record<StrengthTone, { text: string; bar: string }> = {
  'very-weak': { text: 'text-red-700', bar: 'bg-red-600' },
  weak: { text: 'text-red-700', bar: 'bg-red-500' },
  moderate: { text: 'text-neutral-800', bar: 'bg-amber-500' },
  strong: { text: 'text-success-700', bar: 'bg-success-500' },
  'very-strong': { text: 'text-success-700', bar: 'bg-success-600' },
};

/* Toggle Switch */
interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ id, label, description, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className={`block text-sm font-medium ${disabled ? 'text-neutral-500' : 'text-neutral-700'}`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-0.5 leading-relaxed ${disabled ? 'text-neutral-300' : 'text-neutral-500'}`}>
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary-500/40 focus-visible:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${checked ? 'bg-primary-600' : 'bg-neutral-300'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md
            ring-0 transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/* Main Component */
const DEFAULTS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
  excludeAmbiguous: false,
};

export default function PasswordGenerator() {
  const [length, setLength] = useState(DEFAULTS.length);
  // While the length box is being edited it holds the raw text; it is clamped on blur or Enter.
  const [lengthText, setLengthText] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(DEFAULTS.uppercase);
  const [lowercase, setLowercase] = useState(DEFAULTS.lowercase);
  const [numbers, setNumbers] = useState(DEFAULTS.numbers);
  const [special, setSpecial] = useState(DEFAULTS.special);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(DEFAULTS.excludeAmbiguous);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();

  const options: PasswordOptions = { length, uppercase, lowercase, numbers, special, excludeAmbiguous };
  const entropy = entropyBits(options);
  const strength = strengthFor(entropy);
  const tone = TONE_STYLES[strength.tone];
  const pool = poolSize(options);
  const hasAnyCharset = uppercase || lowercase || numbers || special;
  const crackTime = formatDuration(crackSeconds(entropy));

  /* Generate on mount + any option change */
  const generate = useCallback(() => {
    setPassword(generatePassword({ length, uppercase, lowercase, numbers, special, excludeAmbiguous }));
  }, [length, uppercase, lowercase, numbers, special, excludeAmbiguous]);

  useEffect(() => {
    generate();
  }, [generate]);

  /* Reset to defaults */
  const handleReset = useCallback(() => {
    setLength(DEFAULTS.length);
    setLengthText(null);
    setUppercase(DEFAULTS.uppercase);
    setLowercase(DEFAULTS.lowercase);
    setNumbers(DEFAULTS.numbers);
    setSpecial(DEFAULTS.special);
    setExcludeAmbiguous(DEFAULTS.excludeAmbiguous);
  }, []);

  /* Ensure at least one charset is always selected */
  const handleToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean, others: boolean[]) => {
      // If turning off and all others are also off, don't allow it
      if (current && others.every((o) => !o)) return;
      setter(!current);
    },
    []
  );

  /* Length box: free typing while focused, clamped on blur/Enter (DEVTOOLS-16) */
  const commitLength = () => {
    if (lengthText === null) return;
    const parsed = parseLength(lengthText);
    if (parsed !== null) setLength(parsed);
    setLengthText(null);
  };
  const pendingLength = lengthText !== null ? parseLength(lengthText) : length;
  const lengthHint =
    lengthText !== null && pendingLength !== null && String(pendingLength) !== lengthText.replace(/[^0-9]/g, '')
      ? `Will be set to ${pendingLength} (allowed ${MIN_LENGTH}-${MAX_LENGTH})`
      : `${MIN_LENGTH} to ${MAX_LENGTH} characters`;

  const StrengthIcon = entropy < 60 ? ShieldAlert : entropy < 80 ? Shield : ShieldCheck;
  const crackPhrase = crackTime === 'less than a second' ? crackTime : `about ${crackTime}`;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">

        {/* Options Panel */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Options</h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 min-h-[40px] px-3 -mr-3 text-sm text-neutral-500 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
              aria-label="Reset to defaults"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            {/* Password Length */}
            <div>
              <label htmlFor="pw-length" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password Length
              </label>
              <div className="relative">
                <input
                  id="pw-length"
                  type="text"
                  inputMode="numeric"
                  value={lengthText ?? String(length)}
                  onChange={(e) => setLengthText(e.target.value)}
                  onBlur={commitLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitLength();
                    if (e.key === 'Escape') setLengthText(null);
                  }}
                  aria-describedby="pw-length-hint"
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base tabular-nums
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                    pl-3 pr-24"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs pointer-events-none">
                  characters
                </span>
              </div>
              <p id="pw-length-hint" className="text-xs text-neutral-500 mt-1">{lengthHint}</p>
              <input
                type="range"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                step={1}
                value={length}
                onChange={(e) => {
                  setLength(parseInt(e.target.value, 10));
                  setLengthText(null);
                }}
                style={{ background: `linear-gradient(to right, var(--color-primary-500) 0%, var(--color-primary-500) ${((length - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 100}%, var(--color-neutral-200) ${((length - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 100}%, var(--color-neutral-200) 100%)` }}
                className="w-full h-2 mt-2.5 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                  [&::-webkit-slider-thumb:hover]:scale-110 [&::-webkit-slider-thumb:active]:scale-95
                  [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
                  [&::-moz-range-thumb]:shadow-md
                  [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full"
                aria-label="Password length slider"
                aria-valuetext={`${length} characters`}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-500 tabular-nums">{MIN_LENGTH}</span>
                <span className="text-xs text-neutral-500 tabular-nums">{MAX_LENGTH}</span>
              </div>
            </div>

            <div className="h-px bg-neutral-200/80" />

            {/* Character Toggles */}
            <ToggleSwitch
              id="pw-uppercase"
              label="Uppercase (A-Z)"
              checked={uppercase}
              onChange={() => handleToggle(setUppercase, uppercase, [lowercase, numbers, special])}
            />
            <ToggleSwitch
              id="pw-lowercase"
              label="Lowercase (a-z)"
              checked={lowercase}
              onChange={() => handleToggle(setLowercase, lowercase, [uppercase, numbers, special])}
            />
            <ToggleSwitch
              id="pw-numbers"
              label="Numbers (0-9)"
              checked={numbers}
              onChange={() => handleToggle(setNumbers, numbers, [uppercase, lowercase, special])}
            />
            <ToggleSwitch
              id="pw-special"
              label="Special Characters"
              description={CHAR_SETS.special}
              checked={special}
              onChange={() => handleToggle(setSpecial, special, [uppercase, lowercase, numbers])}
            />

            <div className="h-px bg-neutral-200/80" />

            <ToggleSwitch
              id="pw-ambiguous"
              label="Exclude Ambiguous"
              description="Remove 0, O, o, I, l, 1, |"
              checked={excludeAmbiguous}
              onChange={setExcludeAmbiguous}
            />
          </div>
        </div>

        {/* Results Panel (first on phones so the password is in view) */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 order-1 lg:order-2">
          {/* Generated Password Display */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1" id="pw-output-label">Generated Password</p>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 sm:p-5 relative group">
              <div className="flex items-start gap-3">
                <p
                  className={`flex-1 font-mono text-lg sm:text-xl break-all leading-relaxed text-neutral-900 tabular-nums
                    ${!showPassword ? 'select-none' : ''}`}
                  aria-labelledby="pw-output-label"
                >
                  {!hasAnyCharset ? (
                    <span className="text-neutral-500 font-sans text-base">Select at least one character type</span>
                  ) : showPassword ? (
                    password
                  ) : (
                    BULLET.repeat(password.length)
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex-shrink-0 p-2.5 -m-1 rounded-lg text-neutral-500 hover:text-neutral-600 hover:bg-neutral-100
                    transition-all duration-150"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Strength Meter */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StrengthIcon size={16} className={tone.text} aria-hidden="true" />
                <span className={`text-sm font-semibold ${tone.text}`}>
                  {hasAnyCharset ? strength.label : 'None'}
                </span>
              </div>
              <span className="text-xs text-neutral-500 tabular-nums">
                {hasAnyCharset ? `${Math.round(entropy)} bits of entropy` : '0 bits'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${hasAnyCharset ? tone.bar : 'bg-neutral-300'}`}
                style={{ width: `${hasAnyCharset ? strength.percent : 0}%` }}
                role="progressbar"
                aria-valuenow={Math.round(entropy)}
                aria-valuemin={0}
                aria-valuemax={128}
                aria-valuetext={`${strength.label}, ${Math.round(entropy)} bits`}
                aria-label="Password strength"
              />
            </div>
            {/* Announces the rating, never the password itself. */}
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed" aria-live="polite">
              {hasAnyCharset
                ? `${strength.meaning}. Trying every combination would take ${crackPhrase} at 100 billion guesses per second.`
                : 'Enable at least one character type to generate a password.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              type="button"
              onClick={() => copy(password)}
              disabled={!password}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150 bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-800
                disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              {copiedKey ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  {failedKey ? 'Copy failed: select it and copy' : 'Copy to Clipboard'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={!hasAnyCharset}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                border border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100
                disabled:border-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Generate New
            </button>
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Hash size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Character Pool</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{pool}</p>
                <p className="text-xs text-neutral-500">unique characters</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Shuffle size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Combinations</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {hasAnyCharset ? (
                    entropy > 100 ? (
                      <>10<sup className="text-xs">{Math.round(entropy * Math.LOG10E)}+</sup></>
                    ) : (
                      `~${(2 ** entropy).toExponential(1)}`
                    )
                  ) : '0'}
                </p>
                <p className="text-xs text-neutral-500">possible passwords</p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 p-4 bg-primary-50/50 rounded-xl border border-primary-200/40">
            <p className="text-xs text-primary-700 leading-relaxed">
              <strong>Privacy:</strong> Passwords are generated entirely in your browser using the Web Crypto API. No data is sent to any server or stored anywhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
