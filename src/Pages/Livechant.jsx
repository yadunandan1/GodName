import { useRef, useState, useEffect } from "react";

const GODS = ["Shree radha", "Shree krishna", "Shree ram", "Shree shiva", "Shree hanuman", "Shree hari"];

export default function LiveChant() {
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const pendingRef = useRef(0);
  const animRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [selectedGod, setSelectedGod] = useState("ram");

  const [totalCount, setTotalCount] = useState(0);
  const [malaCount, setMalaCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const bellRef = useRef(new Audio("/bell.mp3"));

  /* 🌸 Petals */
  const createPetals = () => {
    for (let i = 0; i < 12; i++) {
      const petal = document.createElement("div");
      petal.className = "petal";
      petal.innerText = "🌸";
      petal.style.left = Math.random() * 100 + "%";
      document.body.appendChild(petal);
      setTimeout(() => petal.remove(), 2500);
    }
  };

  /* 🔊 START */
  const startListening = async () => {
    if (connected) return;

    const ws = new WebSocket("wss://godname-backend.onrender.com/ws/audio");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "config", selectedGod }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data?.count) {
        pendingRef.current += data.count; // queue only
      }
    };

    ws.onclose = () => stopListening();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== 1) return;

      const input = e.inputBuffer.getChannelData(0);

      // 🔇 Noise gate
      let max = 0;
      for (let i = 0; i < input.length; i++) {
        max = Math.max(max, Math.abs(input[i]));
      }
      if (max < 0.02) return;

      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, input[i])) * 32767;
      }

      wsRef.current.send(pcm.buffer);
    };
  };

  /* ⛔ STOP */
  const stopListening = () => {
    wsRef.current?.close();
    wsRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    pendingRef.current = 0;
    cancelAnimationFrame(animRef.current);

    setConnected(false);
  };

  /* 🔥 ULTRA SMOOTH UI (1 count per frame) */
  useEffect(() => {
    const animate = () => {
      if (pendingRef.current > 0) {
        pendingRef.current -= 1;

        setTotalCount(t => t + 1);

        setProgress(p => {
          const next = p + 1;
          if (next >= 108) {
            bellRef.current.currentTime = 0;
            bellRef.current.play();
            createPetals();
            setMalaCount(m => m + 1);
            return next % 108;
          }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  /* 🔄 Reset */
  const resetAll = () => {
    pendingRef.current = 0;
    setProgress(0);
  };

  /* 🟡 Circle math */
  const radius = 110;
  const stroke = 12;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 108) * circ;

  return (
    <div
      className="min-h-screen text-white flex"
      style={{
        background: "radial-gradient(circle at top, #2b1600 0%, #070300 70%)"
      }}
    >
      {/* 🧿 SIDE SELECT */}
      <div className="w-48 p-4 flex flex-col gap-3 border-r border-yellow-600">
        {GODS.map(g => (
          <button
            key={g}
            onClick={() => {
              setSelectedGod(g);
              if (connected) {
                wsRef.current?.send(
                  JSON.stringify({ type: "config", selectedGod: g })
                );
              }
            }}
            className={`capitalize py-2 rounded transition ${
              selectedGod === g
                ? "bg-yellow-500 text-black font-bold shadow-lg"
                : "bg-gray-700"
            }`}
          >
            {g}
          </button>
        ))}

        <button
          onClick={resetAll}
          className="mt-auto bg-red-700 py-2 rounded shadow-lg"
        >
          Reset
        </button>
      </div>

      {/* 🔱 CENTER */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative temple-glow rounded-full p-8">
          <svg width="260" height="260">
            <circle
              r={radius}
              cx="130"
              cy="130"
              stroke="#333"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              r={radius}
              cx="130"
              cy="130"
              stroke="gold"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 130 130)"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-yellow-400">
              {progress}
            </div>
            <div className="absolute text-[480px] opacity-10 text-yellow-500">
              ॐ
            </div>
            <div className="text-sm tracking-widest">/ 108</div>
          </div>
        </div>

        <div className="flex gap-6 mt-6">
          <div className="bg-gray-800 px-6 py-3 rounded">
            Mala: <span className="text-yellow-400">{malaCount}</span>
          </div>
          <div className="bg-gray-800 px-6 py-3 rounded">
            Total: <span className="text-green-400">{totalCount}</span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          {!connected && (
            <button
              onClick={startListening}
              className="bg-green-600 px-8 py-3 rounded text-lg shadow-lg hover:bg-green-700 transition"
            >
              Start
            </button>
          )}

          {connected && (
            <button
              onClick={stopListening}
              className="bg-red-600 px-8 py-3 rounded text-lg shadow-lg hover:bg-red-700 transition"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
