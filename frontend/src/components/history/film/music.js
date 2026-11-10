/**
 * Generative background score (Web Audio) — no audio files needed:
 *   • a soft tanpura-like drone on Sa and Pa,
 *   • gentle plucked notes from raag Bhupali (Sa Re Ga Pa Dha),
 *   • a quiet dholki-style pulse.
 * `output` can be routed to the speakers and/or a MediaStream (for the video download).
 */
const SA = 138.59; // C#3
const BHUPALI = [0, 2, 4, 7, 9]; // semitones above Sa
const hz = (semi, oct = 0) => SA * Math.pow(2, semi / 12 + oct);

export function createScore(ac) {
  const output = ac.createGain();
  output.gain.value = 0.9;

  // gentle echo for plucks
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.36;
  const fb = ac.createGain();
  fb.gain.value = 0.28;
  const wet = ac.createGain();
  wet.gain.value = 0.35;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(output);

  // drone
  const droneGain = ac.createGain();
  droneGain.gain.value = 0;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.connect(droneGain).connect(output);
  const drones = [hz(0, -1), hz(7, -1), hz(0), hz(0, 0) * 1.003].map((f) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.value = 0.045;
    o.connect(g).connect(lp);
    o.start();
    return o;
  });
  // slow swell of the drone (like a tanpura cycle)
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.18;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(droneGain.gain);
  lfo.start();

  let timer = null;
  let next = 0;
  let step = 0;
  let prev = 2;

  function pluck(time, freq, vol = 0.16) {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, time + 1.6);
    o.connect(g);
    g.connect(output);
    g.connect(delay);
    o.start(time);
    o.stop(time + 1.7);
  }

  function drum(time, low = true) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(low ? 110 : 190, time);
    o.frequency.exponentialRampToValueAtTime(low ? 55 : 120, time + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(low ? 0.22 : 0.08, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + 0.25);
    o.connect(g).connect(output);
    o.start(time);
    o.stop(time + 0.3);
  }

  function schedule() {
    while (next < ac.currentTime + 0.4) {
      const beat = step % 8;
      if (beat === 0 || beat === 3 || beat === 6) drum(next, beat !== 3);
      if (step % 2 === 0 && Math.random() < 0.75) {
        // melodic walk on Bhupali, mostly stepwise
        const moveBy = [-1, 1, 1, -1, 2, -2, 0][Math.floor(Math.random() * 7)];
        prev = Math.max(0, Math.min(9, prev + moveBy));
        const semi = BHUPALI[prev % 5] + (prev >= 5 ? 12 : 0);
        pluck(next, hz(semi, 1), 0.12 + Math.random() * 0.05);
      }
      next += 0.32;
      step++;
    }
  }

  return {
    output,
    start() {
      droneGain.gain.cancelScheduledValues(ac.currentTime);
      droneGain.gain.setTargetAtTime(0.5, ac.currentTime, 1.2);
      next = ac.currentTime + 0.1;
      clearInterval(timer);
      timer = setInterval(schedule, 120);
      schedule();
    },
    pause() {
      clearInterval(timer);
      droneGain.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    },
    dispose() {
      clearInterval(timer);
      drones.forEach((o) => o.stop());
      lfo.stop();
      output.disconnect();
    },
  };
}
