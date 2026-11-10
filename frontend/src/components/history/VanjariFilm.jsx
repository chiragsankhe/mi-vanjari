import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Icon } from '../ui';
import { H, W } from './film/draw';
import { createScore } from './film/music';
import { TIMELINE, TOTAL, renderFrame, sceneAt } from './film/scenes';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const POSTER_T = 4.2;

/** Best format the browser can record: MP4 (shares on WhatsApp) where supported, else WebM. */
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

/**
 * "आपली गाथा" — animated history film of the Palghar Vanjari community.
 * Drawn live on a canvas (Warli style) with a generative score; can be saved as a video file.
 */
export function VanjariFilm() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tRef = useRef(0);
  const playingRef = useRef(false);
  const audio = useRef(null); // { ac, score, speaker }
  const rec = useRef(null); // { recorder, chunks, dest, cancelled, ext }

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);

  const draw = useCallback((t) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) renderFrame(ctx, t);
  }, []);

  // fonts first, then the poster frame
  useEffect(() => {
    let alive = true;
    Promise.all([
      document.fonts?.load('700 46px "Noto Serif Devanagari"'),
      document.fonts?.load('600 38px "Noto Serif Devanagari"'),
      document.fonts?.load('400 22px Inter'),
      document.fonts?.load('700 22px Inter'),
    ])
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        setReady(true);
        draw(POSTER_T);
      });
    return () => {
      alive = false;
    };
  }, [draw]);

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    const score = createScore(ac);
    const speaker = ac.createGain();
    speaker.gain.value = muted ? 0 : 1;
    score.output.connect(speaker).connect(ac.destination);
    audio.current = { ac, score, speaker };
    return audio.current;
  };

  const finishRecording = () => {
    const r = rec.current;
    if (r && r.recorder.state !== 'inactive') r.recorder.stop();
  };

  const setPlay = (on) => {
    playingRef.current = on;
    setPlaying(on);
    const a = on ? ensureAudio() : audio.current;
    if (!a) return;
    if (on) {
      a.ac.resume();
      a.score.start();
    } else {
      a.score.pause();
      a.ac.suspend();
    }
  };

  // animation loop
  useEffect(() => {
    let raf;
    let last = performance.now();
    let lastUi = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        tRef.current += dt;
        if (tRef.current >= TOTAL) {
          tRef.current = TOTAL - 0.001;
          setPlay(false);
          finishRecording();
        }
        draw(tRef.current);
        if (now - lastUi > 120) {
          lastUi = now;
          setTime(tRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // clean up audio on unmount
  useEffect(
    () => () => {
      rec.current && (rec.current.cancelled = true);
      finishRecording();
      audio.current?.score.dispose();
      audio.current?.ac.close();
    },
    [],
  );

  const seek = (t) => {
    if (recording) return;
    tRef.current = Math.max(0, Math.min(TOTAL - 0.01, t));
    setTime(tRef.current);
    if (!started) setStarted(true);
    draw(tRef.current);
  };

  const toggle = () => {
    if (recording) return;
    if (!started) {
      setStarted(true);
      tRef.current = 0;
    }
    if (tRef.current >= TOTAL - 0.05) tRef.current = 0;
    setPlay(!playingRef.current);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    if (audio.current) audio.current.speaker.gain.value = m ? 0 : 1;
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else el?.requestFullscreen?.();
  };

  const download = () => {
    const mime = pickMime();
    const canvas = canvasRef.current;
    if (!mime || !canvas.captureStream) {
      toast.error('This browser can’t save videos. Please use Chrome, Edge or Firefox on a computer.');
      return;
    }
    const a = ensureAudio();
    const stream = canvas.captureStream(30);
    let dest = null;
    if (a) {
      dest = a.ac.createMediaStreamDestination();
      a.score.output.connect(dest);
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const state = { recorder, chunks: [], dest, cancelled: false, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
    recorder.ondataavailable = (e) => e.data.size && state.chunks.push(e.data);
    recorder.onstop = () => {
      if (dest) a.score.output.disconnect(dest);
      stream.getTracks().forEach((tr) => tr.stop());
      setRecording(false);
      rec.current = null;
      if (state.cancelled) return;
      const blob = new Blob(state.chunks, { type: mime.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mi-vanjari-aapli-gatha.${state.ext}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`Video saved (${(blob.size / 1048576).toFixed(1)} MB) — check your downloads folder`);
    };
    rec.current = state;
    setRecording(true);
    setStarted(true);
    tRef.current = 0;
    draw(0);
    recorder.start(1000);
    setPlay(true);
  };

  const cancelRecording = () => {
    if (!rec.current) return;
    rec.current.cancelled = true;
    finishRecording();
    setPlay(false);
  };

  const current = sceneAt(time);

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className="group relative overflow-hidden rounded-2xl bg-[#2a0f04] shadow-[0_24px_60px_rgba(60,20,5,0.35)] [&:fullscreen]:rounded-none [&:fullscreen]:flex [&:fullscreen]:items-center"
      >
        <canvas ref={canvasRef} width={W} height={H} className="block aspect-video w-full" onClick={toggle} aria-label="Mi Vanjari history film" role="img" />

        {/* poster / big play */}
        <AnimatePresence>
          {(!started || (!playing && !recording)) && (
            <motion.button
              type="button"
              onClick={toggle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn('absolute inset-0', !started && 'bg-[linear-gradient(180deg,rgba(30,8,0,0.1),rgba(30,8,0,0.55))]')}
              aria-label={started ? 'Play' : 'Play the film'}
            >
              <span className={cn('absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-white', started ? 'top-1/2' : 'top-[71%]')}>
                <motion.span whileHover={{ scale: 1.08 }} className="grid size-16 place-items-center rounded-full bg-white/95 text-primary shadow-xl sm:size-20">
                  <svg viewBox="0 0 24 24" className="ml-1 size-7 sm:size-9" fill="currentColor">
                    <path d="M7 4.5v15l13-7.5z" />
                  </svg>
                </motion.span>
                {!started && (
                  <span className="rounded-full bg-black/40 px-4 py-1.5 text-xs font-semibold backdrop-blur sm:text-sm">
                    Watch the film · {fmt(TOTAL)} · with music
                  </span>
                )}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {recording && (
          <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur">
            <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
            Creating video… {Math.round((time / TOTAL) * 100)}% · keep this tab open and visible
            <button type="button" className="font-semibold text-[#f1bf76] underline" onClick={cancelRecording}>
              Cancel
            </button>
          </div>
        )}

        {/* controls */}
        {started && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2 text-white opacity-100 transition sm:px-4 sm:opacity-0 sm:group-hover:opacity-100 sm:has-[:focus-visible]:opacity-100">
            <div className="relative">
              <input
                type="range"
                min={0}
                max={TOTAL}
                step={0.1}
                value={time}
                disabled={recording}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek"
                className="h-1.5 w-full cursor-pointer accent-[#f1bf76]"
              />
              {TIMELINE.slice(1).map((s) => (
                <span key={s.id} className="pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-white/50" style={{ left: `${(s.start / TOTAL) * 100}%` }} />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs sm:gap-3">
              <button type="button" onClick={toggle} disabled={recording} className="grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? (
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
                )}
              </button>
              <button type="button" onClick={toggleMute} className="grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label={muted ? 'Unmute' : 'Mute'}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
                  {muted ? <path d="M17 9l5 6m0-6l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
                </svg>
              </button>
              <span className="tabular-nums">
                {fmt(time)} / {fmt(TOTAL)}
              </span>
              <span className="heading-deva hidden truncate text-white/80 sm:inline">· {current.mr}</span>
              <button type="button" onClick={fullscreen} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label="Full screen">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="heading-deva text-xl font-semibold sm:text-2xl">आपली गाथा · Our story</h2>
          <p className="text-xs text-muted">From the forts of Mewar to the 24 villages of Palghar — drawn in Warli art, the art of our own district.</p>
        </div>
        <button type="button" onClick={download} disabled={recording || !ready} className="btn btn-outline btn-sm shrink-0">
          <Icon name="download" size={16} /> {recording ? 'Creating video…' : 'Download video'}
        </button>
      </div>

      {/* chapters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TIMELINE.map((s, i) => (
          <button
            key={s.id}
            type="button"
            disabled={recording}
            onClick={() => seek(s.start + 0.8)}
            className={cn('chip shrink-0 whitespace-nowrap', current.id === s.id && started && 'chip-on')}
          >
            <span className="mr-1 text-[10px] text-muted tabular-nums">{fmt(s.start)}</span>
            <span className="heading-deva">{i === 0 ? 'सुरुवात' : s.chip}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
