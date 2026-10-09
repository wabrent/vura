// synthesize a 20.5s dark pulse track -> promo/audio.wav
import { writeFileSync } from "fs";

const SR = 44100, DUR = 20.5, N = Math.round(SR * DUR);
const BPM = 120, BEAT = 60 / BPM;
const L = new Float64Array(N), R = new Float64Array(N);

const NOTE = { A1: 55.0, F1: 43.65, G1: 49.0, A2: 110.0, C3: 130.81, E3: 164.81, D3: 146.83, F2: 87.31 };
let seed = 42;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

/* --- kick: pitch-dropping sine, 4-on-floor from 2.5s (first cut) to 17.5s (outro) --- */
function kick(t0) {
  const dur = 0.3, n = Math.round(dur * SR), s = Math.round(t0 * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    const f = 48 + 90 * Math.exp(-tt / 0.03);
    ph += (2 * Math.PI * f) / SR;
    const amp = Math.exp(-tt / 0.10) * 0.9;
    const v = Math.sin(ph) * amp;
    add(s + i, v, v);
  }
}

/* --- hat: high-passed noise, offbeat 8ths --- */
function hat(t0, open = false) {
  const dur = open ? 0.14 : 0.045, n = Math.round(dur * SR), s = Math.round(t0 * SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    const nz = rnd();
    const hp = nz - prev; prev = nz;
    const amp = Math.exp(-tt / (open ? 0.06 : 0.018)) * (open ? 0.16 : 0.13);
    const v = hp * amp;
    add(s + i, v * 0.9, v);
  }
}

/* --- bass: soft saw with sidechain duck, chord progression --- */
function bassNote(freq, t0, dur) {
  const n = Math.round(dur * SR), s = Math.round(t0 * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR, abs = t0 + tt;
    ph += freq / SR;
    ph %= 1;
    // band-limited-ish saw: sum 6 harmonics
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * ph * h) / h;
    v *= 0.16;
    // envelope
    const env = Math.min(1, tt / 0.01) * Math.min(1, (dur - tt) / 0.05);
    // sidechain: duck during kicks (2.5s..17.5s)
    const sinceKick = ((abs - 2.5) % BEAT + BEAT) % BEAT;
    const duck = abs >= 2.4 && abs <= 17.6 ? 1 - 0.75 * Math.exp(-sinceKick / 0.09) : 1;
    v *= env * duck;
    add(s + i, v, v);
  }
}

/* --- pad: detuned saws through one-pole LP, whole track --- */
function pad(freqs, t0, dur, gain) {
  const n = Math.round(dur * SR), s = Math.round(t0 * SR);
  const ph = freqs.map(() => 0);
  let lpL = 0, lpR = 0;
  const det = [1.0, 1.004, 0.996];
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    let vL = 0, vR = 0;
    for (let k = 0; k < freqs.length; k++) {
      ph[k] = (ph[k] + (freqs[k] * det[k % 3]) / SR) % 1;
      const saw = 2 * ph[k] - 1;
      vL += saw * (k % 2 === 0 ? 1 : 0.7);
      vR += saw * (k % 2 === 0 ? 0.7 : 1);
    }
    vL /= freqs.length * 2; vR /= freqs.length * 2;
    const a = 0.035;
    lpL += a * (vL - lpL); lpR += a * (vR - lpR);
    const env = Math.min(1, tt / 1.2) * Math.min(1, (dur - tt) / 0.8);
    add(s + i, lpL * gain * env, lpR * gain * env);
  }
}

/* --- arrangement --- */
// pad: Am -> F -> G -> Am (minor, dark)
const prog = [
  [NOTE.A2, NOTE.C3, NOTE.E3],
  [NOTE.F2 * 2, NOTE.A2, NOTE.C3],
  [NOTE.G1 * 2, NOTE.D3, NOTE.E3 * 0.995],
  [NOTE.A2, NOTE.C3, NOTE.E3],
];
for (let bar = 0; bar < 6; bar++) {
  const t0 = bar * BEAT * 4;
  pad(prog[bar % 4], t0, BEAT * 4 + 0.3, 0.34);
}

// drums: from first cut (2.5s) to outro (17.5s)
for (let b = 0; b * BEAT < DUR; b++) {
  const t = b * BEAT;
  if (t >= 2.5 && t < 17.5) kick(t);
  if (t >= 2.5 && t < 17.5 && b % 2 === 1) hat(t + BEAT / 2); // offbeat
  if (t >= 8 && t < 17.5 && b % 4 === 2) hat(t + BEAT / 2, true);
}
// extra hats layer: 16th offbeats from 12s
for (let t = 12; t < 17.5; t += BEAT / 2) if (Math.abs((t / (BEAT / 4)) % 2 - 1) < 0.01) hat(t + BEAT / 4, false);

/* --- riser: noise sweep 1.5s -> 2.5s into the first cut --- */
{
  const t0 = 1.5, dur = 1.0, n = Math.round(dur * SR), s = Math.round(t0 * SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR, p = tt / dur;
    const nz = rnd();
    const hp = nz - prev; prev = nz;
    const amp = Math.pow(p, 1.8) * 0.22 * (p > 0.97 ? (1 - p) / 0.03 : 1);
    const v = hp * amp;
    add(s + i, v, v * 0.85);
  }
}

// bass: root per bar, 8th-note pulse from 2.5s
const roots = [NOTE.A1, NOTE.F1, NOTE.G1, NOTE.A1, NOTE.A1, NOTE.F1];
for (let bar = 0; bar < 6; bar++) {
  const t0 = bar * BEAT * 4;
  if (t0 + BEAT * 4 < 2.5 || t0 > 17.5) continue;
  for (let e = 0; e < 8; e++) {
    const t = t0 + e * (BEAT / 2);
    if (t >= 2.5 && t < 17.5) bassNote(roots[bar], t, BEAT / 2 * 0.92);
  }
}

/* --- master: soft clip, fades, normalize --- */
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let fade = 1;
  if (t < 1.5) fade = t / 1.5;
  if (t > DUR - 1.2) fade = Math.max(0, (DUR - t) / 1.2);
  L[i] = Math.tanh(L[i] * 1.4) * fade;
  R[i] = Math.tanh(R[i] * 1.4) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / (peak || 1);

const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * norm * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * norm * 32767))), 44 + i * 4 + 2);
}
writeFileSync(".promo/audio.wav", buf);
console.log("audio.wav written:", (buf.length / 1024 / 1024).toFixed(1), "MB,", DUR, "s");
