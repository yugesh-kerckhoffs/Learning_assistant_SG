import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscript, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(5).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setAudioLevels(new Array(5).fill(0));
  }, []);

  const startVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      // Sample 5 bands across the frequency spectrum
      const bands = 5;
      const bandSize = Math.floor(dataArray.length / bands);
      const levels = [];
      for (let i = 0; i < bands; i++) {
        let sum = 0;
        for (let j = 0; j < bandSize; j++) {
          sum += dataArray[i * bandSize + j];
        }
        levels.push(sum / bandSize / 255); // normalize 0-1
      }
      setAudioLevels(levels);
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for visualizer
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stopVisualizer();
        setIsProcessing(true);

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];

          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/speech-to-text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                audioData: base64,
                mimeType: mimeType.split(';')[0], // e.g. audio/webm
              }),
            });

            const data = await response.json();

            if (data.text && data.text.trim()) {
              onTranscript(data.text.trim());
            } else if (data.error) {
              console.error('STT error:', data.error);
            }
          } catch (err) {
            console.error('STT request failed:', err);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      startVisualizer();
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopVisualizer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [stopVisualizer]);

  if (isProcessing) {
    return (
      <button
        className="voice-btn voice-processing"
        disabled
        title="Processing your voice..."
      >
        <div className="voice-processing-dots">
          <span className="voice-dot" />
          <span className="voice-dot" />
          <span className="voice-dot" />
        </div>
      </button>
    );
  }

  if (isRecording) {
    return (
      <button
        className="voice-btn voice-recording"
        onClick={stopRecording}
        title="Stop recording"
      >
        <div className="voice-waves">
          {audioLevels.map((level, i) => (
            <span
              key={i}
              className="voice-wave-bar"
              style={{ height: `${Math.max(4, level * 24)}px` }}
            />
          ))}
        </div>
        <span className="voice-stop-icon">■</span>
      </button>
    );
  }

  return (
    <button
      className="voice-btn"
      onClick={startRecording}
      disabled={disabled}
      title="Voice input"
    >
      🎙️
    </button>
  );
};

export default VoiceRecorder;
