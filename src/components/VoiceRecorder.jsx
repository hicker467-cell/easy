'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle2 } from 'lucide-react';

export default function VoiceRecorder({ onAudioRecorded, label = "Record Voice Note" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioUrl(null);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to Base64 data URL for storage
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          onAudioRecorded(reader.result);
        };

        // Stop media stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or not supported by browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const resetRecording = () => {
    setAudioUrl(null);
    onAudioRecorded(null);
    setRecordingSeconds(0);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
      <div className="flex items-center justify-between gap-3">
        
        {!audioUrl && !isRecording && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
          >
            <Mic className="w-4 h-4 text-indigo-400" />
            <span>{label}</span>
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Recording: {formatTime(recordingSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-600/20 hover:bg-rose-500"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="flex items-center justify-between w-full gap-2">
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Note Ready</span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetRecording}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete Voice Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
