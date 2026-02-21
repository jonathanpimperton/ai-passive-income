import { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, RefreshCw, Check, Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, RotateCcw } from 'lucide-react';

/* ── Character Sets ───────────────────────────────────────── */
const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

const AMBIGUOUS_CHARS = /[0OoIl1|]/g;

/* ── Strength Levels ──────────────────────────────────────── */
interface StrengthLevel {
  label: string;
  colorClass: string;
  barColor: string;
  percent: number;
}

function getStrengthLevel(entropy: number): StrengthLevel {
  if (entropy < 28) {
    return { label: 'Weak', colorClass: 'text-negative-600', barColor: 'bg-negative-500', percent: 15 };
  }
  if (entropy < 36) {
    return { label: 'Fair', colorClass: 'text-warning-600', barColor: 'bg-warning-500', percent: 35 };
  }
  if (entropy < 60) {
    return { label: 'Good', colorClass: 'text-amber-600', barColor: 'bg-amber-500', percent: 55 };
  }
  if (entropy < 128) {
    return { label: 'Strong', colorClass: 'text-accent-600', barColor: 'bg-accent-500', percent: 80 };
  }
  return { label: 'Very Strong', colorClass: 'text-accent-700', barColor: 'bg-accent-700', percent: 100 };
}

/* ── Crypto-safe random int ───────────────────────────────── */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/* ── Password generation logic ────────────────────────────── */
interface GenerateOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  excludeAmbiguous: boolean;
}

function generatePassword(options: GenerateOptions): string {
  let charset = '';
  const requiredChars: string[] = [];

  if (options.uppercase) {
    let set = CHAR_SETS.uppercase;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charset += set;
    if (set.length > 0) requiredChars.push(set[secureRandomInt(set.length)]);
  }
  if (options.lowercase) {
    let set = CHAR_SETS.lowercase;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charset += set;
    if (set.length > 0) requiredChars.push(set[secureRandomInt(set.length)]);
  }
  if (options.numbers) {
    let set = CHAR_SETS.numbers;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charset += set;
    if (set.length > 0) requiredChars.push(set[secureRandomInt(set.length)]);
  }
  if (options.special) {
    let set = CHAR_SETS.special;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charset += set;
    if (set.length > 0) requiredChars.push(set[secureRandomInt(set.length)]);
  }

  if (charset.length === 0) return '';

  // Fill remaining length with random chars from the full charset
  const remaining = Math.max(0, options.length - requiredChars.length);
  const randomChars: string[] = [];
  for (let i = 0; i < remaining; i++) {
    randomChars.push(charset[secureRandomInt(charset.length)]);
  }

  // Combine required + random and shuffle using Fisher-Yates
  const allChars = [...requiredChars, ...randomChars];
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  return allChars.join('');
}

function calculateEntropy(options: GenerateOptions): number {
  let charsetSize = 0;
  if (options.uppercase) {
    let set = CHAR_SETS.uppercase;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charsetSize += set.length;
  }
  if (options.lowercase) {
    let set = CHAR_SETS.lowercase;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charsetSize += set.length;
  }
  if (options.numbers) {
    let set = CHAR_SETS.numbers;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charsetSize += set.length;
  }
  if (options.special) {
    let set = CHAR_SETS.special;
    if (options.excludeAmbiguous) set = set.replace(AMBIGUOUS_CHARS, '');
    charsetSize += set.length;
  }
  if (charsetSize === 0) return 0;
  return options.length * Math.log2(charsetSize);
}

/* ── Toggle Switch ────────────────────────────────────────── */
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
        <label htmlFor={id} className={`block text-sm font-medium ${disabled ? 'text-neutral-400' : 'text-neutral-700'}`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-0.5 leading-relaxed ${disabled ? 'text-neutral-300' : 'text-neutral-400'}`}>
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
          ${checked ? 'bg-primary-500' : 'bg-neutral-300'}`}
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

/* ── Main Component ───────────────────────────────────────── */
const DEFAULTS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
  excludeAmbiguous: false,
};

export default function PasswordGenerator() {
  const [length, setLength] = useState(DEFAULTS.length);
  const [uppercase, setUppercase] = useState(DEFAULTS.uppercase);
  const [lowercase, setLowercase] = useState(DEFAULTS.lowercase);
  const [numbers, setNumbers] = useState(DEFAULTS.numbers);
  const [special, setSpecial] = useState(DEFAULTS.special);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(DEFAULTS.excludeAmbiguous);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const options: GenerateOptions = {
    length,
    uppercase,
    lowercase,
    numbers,
    special,
    excludeAmbiguous,
  };

  const entropy = calculateEntropy(options);
  const strength = getStrengthLevel(entropy);
  const hasAnyCharset = uppercase || lowercase || numbers || special;

  /* ── Generate on mount + any option change ────────────────── */
  const generate = useCallback(() => {
    const opts: GenerateOptions = {
      length,
      uppercase,
      lowercase,
      numbers,
      special,
      excludeAmbiguous,
    };
    const pw = generatePassword(opts);
    setPassword(pw);
    setCopied(false);
  }, [length, uppercase, lowercase, numbers, special, excludeAmbiguous]);

  useEffect(() => {
    generate();
  }, [generate]);

  /* ── Copy to clipboard ─────────────────────────────────────── */
  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = password;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [password]);

  /* ── Reset to defaults ──────────────────────────────────── */
  const handleReset = useCallback(() => {
    setLength(DEFAULTS.length);
    setUppercase(DEFAULTS.uppercase);
    setLowercase(DEFAULTS.lowercase);
    setNumbers(DEFAULTS.numbers);
    setSpecial(DEFAULTS.special);
    setExcludeAmbiguous(DEFAULTS.excludeAmbiguous);
  }, []);

  /* ── Ensure at least one charset is always selected ────────── */
  const handleToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean, others: boolean[]) => {
      // If turning off and all others are also off, don't allow it
      if (current && others.every((o) => !o)) return;
      setter(!current);
    },
    []
  );

  /* ── Length slider handler ──────────────────────────────────── */
  const handleLengthText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) setLength(Math.min(128, Math.max(8, parsed)));
  };

  /* ── Strength icon ──────────────────────────────────────────── */
  const StrengthIcon = entropy < 36 ? ShieldAlert : entropy < 60 ? Shield : ShieldCheck;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">

        {/* ── Options Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Options</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
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
                  value={length}
                  onChange={handleLengthText}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                    pl-3 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none tabular-nums">
                  characters
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={128}
                step={1}
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value, 10))}
                className="w-full h-2 mt-2.5 rounded-full appearance-none cursor-pointer
                  bg-neutral-200 accent-primary-500
                  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md
                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                aria-label="Password length slider"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-400 tabular-nums">8</span>
                <span className="text-xs text-neutral-400 tabular-nums">128</span>
              </div>
            </div>

            {/* Character Set Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

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
              description="!@#$%^&*()_+-=[]{}|;:,.<>?"
              checked={special}
              onChange={() => handleToggle(setSpecial, special, [uppercase, lowercase, numbers])}
            />

            {/* Ambiguous Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <ToggleSwitch
              id="pw-ambiguous"
              label="Exclude Ambiguous"
              description="Remove 0, O, o, I, l, 1, |"
              checked={excludeAmbiguous}
              onChange={setExcludeAmbiguous}
            />
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {/* Generated Password Display */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Generated Password</p>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 sm:p-5 relative group">
              <div className="flex items-start gap-3">
                <p
                  className={`flex-1 font-mono text-lg sm:text-xl break-all leading-relaxed text-neutral-900 tabular-nums
                    ${!showPassword ? 'select-none' : ''}`}
                  aria-label="Generated password"
                >
                  {!hasAnyCharset ? (
                    <span className="text-neutral-400 font-sans text-base">Select at least one character type</span>
                  ) : showPassword ? (
                    password
                  ) : (
                    '\u2022'.repeat(password.length)
                  )}
                </p>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100
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
                <StrengthIcon size={16} className={strength.colorClass} aria-hidden="true" />
                <span className={`text-sm font-semibold ${strength.colorClass}`}>
                  {hasAnyCharset ? strength.label : 'None'}
                </span>
              </div>
              <span className="text-xs text-neutral-400 tabular-nums">
                {hasAnyCharset ? `${Math.round(entropy)} bits of entropy` : '0 bits'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${hasAnyCharset ? strength.barColor : 'bg-neutral-300'}`}
                style={{ width: `${hasAnyCharset ? strength.percent : 0}%` }}
                role="progressbar"
                aria-valuenow={Math.round(entropy)}
                aria-valuemin={0}
                aria-valuemax={200}
                aria-label="Password strength"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              {entropy < 28 && hasAnyCharset && 'Easily cracked — increase length or add more character types.'}
              {entropy >= 28 && entropy < 36 && 'Vulnerable to targeted attacks. Consider a longer password.'}
              {entropy >= 36 && entropy < 60 && 'Reasonable for most accounts. Longer is always better.'}
              {entropy >= 60 && entropy < 128 && 'Resistant to brute-force attacks. Great for important accounts.'}
              {entropy >= 128 && 'Virtually unbreakable by current computing standards.'}
              {!hasAnyCharset && 'Enable at least one character type to generate a password.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleCopy}
              disabled={!password}
              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                ${copied
                  ? 'bg-accent-500 text-white'
                  : 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800'
                }
                disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed`}
            >
              {copied ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              onClick={generate}
              disabled={!hasAnyCharset}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                border border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100
                disabled:border-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Generate New
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Character Pool</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                {(() => {
                  let size = 0;
                  if (uppercase) {
                    let s = CHAR_SETS.uppercase;
                    if (excludeAmbiguous) s = s.replace(AMBIGUOUS_CHARS, '');
                    size += s.length;
                  }
                  if (lowercase) {
                    let s = CHAR_SETS.lowercase;
                    if (excludeAmbiguous) s = s.replace(AMBIGUOUS_CHARS, '');
                    size += s.length;
                  }
                  if (numbers) {
                    let s = CHAR_SETS.numbers;
                    if (excludeAmbiguous) s = s.replace(AMBIGUOUS_CHARS, '');
                    size += s.length;
                  }
                  if (special) {
                    let s = CHAR_SETS.special;
                    if (excludeAmbiguous) s = s.replace(AMBIGUOUS_CHARS, '');
                    size += s.length;
                  }
                  return size;
                })()}
              </p>
              <p className="text-xs text-neutral-400">unique characters</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
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
              <p className="text-xs text-neutral-400">possible passwords</p>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 p-4 bg-accent-100/50 rounded-xl border border-accent-500/10">
            <p className="text-xs text-accent-700 leading-relaxed">
              <strong>Privacy:</strong> Passwords are generated entirely in your browser using the Web Crypto API. No data is sent to any server or stored anywhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
