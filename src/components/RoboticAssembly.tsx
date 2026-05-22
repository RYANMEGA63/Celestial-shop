import React, { useEffect, useState, useRef } from "react";
import { animate, createTimeline, spring } from "animejs";
import { Cpu, Check, Activity, ShieldCheck } from "lucide-react";

interface RoboticAssemblyProps {
  onAssemblyComplete: () => void;
}

export function RoboticAssembly({ onAssemblyComplete }: RoboticAssemblyProps) {
  const [currentStep, setCurrentStep] = useState<string>("INITIALISATION DU SYSTÈME...");
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [sparkPoints, setSparkPoints] = useState<{ x: number; y: number; id: number }[]>([]);
  const sparkIdCounter = useRef(0);

  // References for SVG parts to animate
  const cpuRef = useRef<SVGGElement>(null);
  const ram1Ref = useRef<SVGGElement>(null);
  const ram2Ref = useRef<SVGGElement>(null);
  const gpuRef = useRef<SVGGElement>(null);
  const armSeg1Ref = useRef<SVGGElement>(null);
  const armSeg2Ref = useRef<SVGGElement>(null);
  const armClawRef = useRef<SVGGElement>(null);
  const laserRef = useRef<SVGLineElement>(null);
  const socketGlowRef = useRef<SVRECTElement>(null);
  const ramGlowRef = useRef<SVGGElement>(null);
  const gpuGlowRef = useRef<SVRECTElement>(null);

  // Helper to generate spark particles
  const triggerSparks = (x: number, y: number) => {
    const newSparks = Array.from({ length: 12 }).map(() => ({
      x,
      y,
      id: sparkIdCounter.current++,
    }));
    setSparkPoints((prev) => [...prev, ...newSparks]);

    // Animate sparks
    setTimeout(() => {
      const targetClass = `.spark-${sparkIdCounter.current - 12}`;
      animate(targetClass, {
        translateX: () => Math.random() * 120 - 60,
        translateY: () => Math.random() * 120 - 60,
        scale: [1, 0],
        opacity: [1, 0],
        duration: () => Math.random() * 400 + 600,
        ease: "outExpo",
      });
    }, 10);
  };

  useEffect(() => {
    // Setup Timeline
    const tl = createTimeline({
      autoplay: true,
      onComplete: () => {
        setCurrentStep("SYSTÈME PRÊT - CONFIGURATION DISPONIBLE");
        setStepIndex(4);
        onAssemblyComplete();

        // Idle subtle breath loop after animation
        animate(armSeg1Ref.current, {
          rotate: [-60, -58, -60],
          duration: 4000,
          loop: true,
          ease: "inOutSine"
        });
        animate(armSeg2Ref.current, {
          rotate: [-20, -22, -20],
          duration: 4000,
          loop: true,
          ease: "inOutSine"
        });
      },
    });

    // 1. Initial State & Arm entry
    tl.add(armSeg1Ref.current, {
      rotate: [-70, -40],
      duration: 1200,
      ease: spring({ stiffness: 80, damping: 10 }),
      onBegin: () => {
        setCurrentStep("SCAN DE LA CARTE MÈRE...");
        setStepIndex(0);
      }
    });
    tl.add(armSeg2Ref.current, {
      rotate: [-70, -40],
      duration: 1200,
      ease: spring({ stiffness: 80, damping: 10 })
    }, "<<");

    // 2. Fetch CPU (Arm moves to CPU storage at 95, 105)
    tl.add(armSeg1Ref.current, {
      rotate: -15,
      duration: 1000,
      ease: "inOutQuad",
      onBegin: () => setCurrentStep("PRÉLÈVEMENT DU PROCESSEUR (CPU)..."),
    });
    tl.add(armSeg2Ref.current, {
      rotate: -10,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");

    // Laser connects claw to CPU
    tl.add(laserRef.current, {
      opacity: [0, 0.8],
      duration: 200,
      ease: "outQuad",
      onBegin: () => {
        laserRef.current?.setAttribute("x1", "95");
        laserRef.current?.setAttribute("y1", "105");
        laserRef.current?.setAttribute("x2", "95");
        laserRef.current?.setAttribute("y2", "105");
      }
    });

    // Move arm with CPU to Socket (263, 178)
    tl.add(cpuRef.current, {
      translateX: [0, 168],
      translateY: [0, 73],
      duration: 1200,
      ease: "inOutQuad"
    });
    tl.add(armSeg1Ref.current, {
      rotate: -35,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");
    tl.add(armSeg2Ref.current, {
      rotate: 20,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");
    // Animate laser line to follow to socket target
    tl.add(laserRef.current, {
      x2: 263,
      y2: 178,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");

    // Drop CPU & Spark
    tl.add(laserRef.current, {
      opacity: 0,
      duration: 200,
      ease: "outQuad"
    });
    tl.add(socketGlowRef.current, {
      fill: ["#020617", "#047857"],
      stroke: ["#374151", "#10b981"],
      duration: 600,
      ease: "outQuad",
      onBegin: () => {
        triggerSparks(263, 178);
        setCurrentStep("CPU CONNECTÉ - ANALYSE THERMIQUE OK");
        setStepIndex(1);
      }
    }, "<<");

    // Return Arm to Neutral/Middle
    tl.add(armSeg1Ref.current, {
      rotate: -30,
      duration: 800,
      ease: "inOutQuad"
    });
    tl.add(armSeg2Ref.current, {
      rotate: -15,
      duration: 800,
      ease: "inOutQuad"
    }, "<<");

    // 3. Fetch RAM 1 (Arm moves to RAM 1 storage at 68, 181)
    tl.add(armSeg1Ref.current, {
      rotate: -15,
      duration: 800,
      ease: "inOutQuad",
      onBegin: () => setCurrentStep("PRÉLÈVEMENT DE LA RAM DDR5..."),
    });
    tl.add(armSeg2Ref.current, {
      rotate: -20,
      duration: 800,
      ease: "inOutQuad"
    }, "<<");

    // Laser connects to RAM 1
    tl.add(laserRef.current, {
      opacity: [0, 0.8],
      duration: 200,
      ease: "outQuad",
      onBegin: () => {
        laserRef.current?.setAttribute("x1", "68");
        laserRef.current?.setAttribute("y1", "181");
        laserRef.current?.setAttribute("x2", "68");
        laserRef.current?.setAttribute("y2", "181");
      }
    });

    // Move arm with RAM 1 to Slot 1 (318, 178)
    tl.add(ram1Ref.current, {
      translateX: [0, 250],
      translateY: [0, -3],
      duration: 1000,
      ease: "inOutQuad"
    });
    tl.add(armSeg1Ref.current, {
      rotate: -40,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");
    tl.add(armSeg2Ref.current, {
      rotate: 35,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");
    tl.add(laserRef.current, {
      x2: 318,
      y2: 178,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");

    // Snap RAM 1
    tl.add(laserRef.current, {
      opacity: 0,
      duration: 200,
      ease: "outQuad"
    });
    tl.add(ramGlowRef.current, {
      opacity: [0, 0.5],
      duration: 400,
      ease: "outQuad",
      onBegin: () => {
        triggerSparks(318, 178);
      }
    }, "<<");

    // Return Arm to Neutral/Middle
    tl.add(armSeg1Ref.current, {
      rotate: -30,
      duration: 800,
      ease: "inOutQuad"
    });
    tl.add(armSeg2Ref.current, {
      rotate: -15,
      duration: 800,
      ease: "inOutQuad"
    }, "<<");

    // Fetch RAM 2 (Arm moves to RAM 2 storage at 83, 181)
    tl.add(armSeg1Ref.current, {
      rotate: -15,
      duration: 800,
      ease: "inOutQuad",
    });
    tl.add(armSeg2Ref.current, {
      rotate: -20,
      duration: 800,
      ease: "inOutQuad"
    }, "<<");

    // Laser connects to RAM 2
    tl.add(laserRef.current, {
      opacity: [0, 0.8],
      duration: 200,
      ease: "outQuad",
      onBegin: () => {
        laserRef.current?.setAttribute("x1", "83");
        laserRef.current?.setAttribute("y1", "181");
        laserRef.current?.setAttribute("x2", "83");
        laserRef.current?.setAttribute("y2", "181");
      }
    });

    // Move arm with RAM 2 to Slot 2 (330, 178)
    tl.add(ram2Ref.current, {
      translateX: [0, 247],
      translateY: [0, -3],
      duration: 1000,
      ease: "inOutQuad"
    });
    tl.add(armSeg1Ref.current, {
      rotate: -40,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");
    tl.add(armSeg2Ref.current, {
      rotate: 33,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");
    tl.add(laserRef.current, {
      x2: 330,
      y2: 178,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");

    // Snap RAM 2
    tl.add(laserRef.current, {
      opacity: 0,
      duration: 200,
      ease: "outQuad"
    });
    tl.add(ramGlowRef.current, {
      opacity: [0.5, 1],
      duration: 400,
      ease: "outQuad",
      onBegin: () => {
        triggerSparks(330, 178);
        setCurrentStep("DDR5 DOUBLE CANAL - FREQ 6000MT/s OK");
        setStepIndex(2);
      }
    }, "<<");

    // Return Arm to Neutral/Middle
    tl.add(armSeg1Ref.current, {
      rotate: -30,
      duration: 800,
      ease: "inOutQuad"
    });
    tl.add(armSeg2Ref.current, {
      rotate: -15,
      duration: 800,
      ease: "inOutQuad"
    }, "<<");

    // 4. Fetch GPU (Arm moves to GPU storage at 95, 252)
    tl.add(armSeg1Ref.current, {
      rotate: -10,
      duration: 1000,
      ease: "inOutQuad",
      onBegin: () => setCurrentStep("PRÉLÈVEMENT DE LA CARTE GRAPHIQUE (GPU)..."),
    });
    tl.add(armSeg2Ref.current, {
      rotate: -8,
      duration: 1000,
      ease: "inOutQuad"
    }, "<<");

    // Laser connects to GPU
    tl.add(laserRef.current, {
      opacity: [0, 0.8],
      duration: 200,
      ease: "outQuad",
      onBegin: () => {
        laserRef.current?.setAttribute("x1", "95");
        laserRef.current?.setAttribute("y1", "252");
        laserRef.current?.setAttribute("x2", "95");
        laserRef.current?.setAttribute("y2", "252");
      }
    });

    // Move arm with GPU to Slot (290, 276)
    tl.add(gpuRef.current, {
      translateX: [0, 195],
      translateY: [0, 24],
      duration: 1200,
      ease: "inOutQuad"
    });
    tl.add(armSeg1Ref.current, {
      rotate: -45,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");
    tl.add(armSeg2Ref.current, {
      rotate: 45,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");
    tl.add(laserRef.current, {
      x2: 290,
      y2: 276,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");

    // Snap GPU
    tl.add(laserRef.current, {
      opacity: 0,
      duration: 200,
      ease: "outQuad"
    });
    tl.add(gpuGlowRef.current, {
      fill: ["#020617", "#047857"],
      stroke: ["#374151", "#10b981"],
      duration: 600,
      ease: "outQuad",
      onBegin: () => {
        triggerSparks(290, 276);
        setCurrentStep("GPU RTX CONNECTÉE - ALIMENTATION 12VHPWR OK");
        setStepIndex(3);
      }
    }, "<<");

    // 5. Arm Return to Neutral
    tl.add(armSeg1Ref.current, {
      rotate: -60,
      duration: 1200,
      ease: "inOutQuad"
    });
    tl.add(armSeg2Ref.current, {
      rotate: -20,
      duration: 1200,
      ease: "inOutQuad"
    }, "<<");

    return () => {
      // Revert/pause animations on unmount
      tl.revert();
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Sci-Fi Grid Background */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Cyberpunk Vignette & Radial Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-success/5 pointer-events-none" />

      {/* Main Assembly Viewport */}
      <div className="relative aspect-[4/3] md:aspect-square w-full">
        <svg
          viewBox="0 0 600 500"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Neon Grid Accents */}
          <line x1="50" y1="50" x2="550" y2="50" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
          <line x1="50" y1="450" x2="550" y2="450" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />

          {/* Spark Particles Layer */}
          {sparkPoints.map((pt) => (
            <circle
              key={pt.id}
              cx={pt.x}
              cy={pt.y}
              r={2}
              fill={pt.id % 2 === 0 ? "#10b981" : "#3b82f6"}
              className={`spark-${pt.id} opacity-0 pointer-events-none`}
            />
          ))}

          {/* ============================================================ */}
          {/* STORAGE AREA (Components ready to be picked) */}
          {/* ============================================================ */}
          <g id="storage-bay" transform="translate(0, 0)">
            {/* Storage Bay Shelves/Frames */}
            <rect x="30" y="70" width="130" height="230" rx="6" fill="#030712" stroke="#1f2937" strokeWidth="1.5" />
            <line x1="30" y1="140" x2="160" y2="140" stroke="#1f2937" strokeWidth="1.5" />
            <line x1="30" y1="210" x2="160" y2="210" stroke="#1f2937" strokeWidth="1.5" />
            
            <text x="40" y="60" className="font-mono text-[9px] tracking-wider fill-muted-foreground uppercase">BAIE DE STOCKAGE</text>

            {/* 1. CPU in Storage */}
            <g ref={cpuRef} id="cpu-stock" className="cursor-pointer">
              <rect x="75" y="85" width="40" height="40" rx="3" fill="#111827" stroke="#3b82f6" strokeWidth="1.5" />
              <rect x="83" y="93" width="24" height="24" rx="1" fill="#1f2937" stroke="#4b5563" />
              <path d="M 88 98 L 102 98 M 88 102 L 102 102 M 88 106 L 102 106" stroke="#10b981" strokeWidth="1" />
              {/* CPU Pins / Outer Lines */}
              <rect x="79" y="89" width="32" height="32" rx="2" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
            </g>

            {/* 2. RAM in Storage */}
            <g id="ram-stock">
              <g ref={ram1Ref} id="ram1-part">
                <rect x="65" y="165" width="6" height="32" rx="1" fill="#111827" stroke="#3b82f6" strokeWidth="1" />
                <rect x="67" y="168" width="2" height="12" fill="#10b981" />
                <line x1="65" y1="192" x2="71" y2="192" stroke="#f59e0b" strokeWidth="1" />
              </g>
              <g ref={ram2Ref} id="ram2-part">
                <rect x="80" y="165" width="6" height="32" rx="1" fill="#111827" stroke="#3b82f6" strokeWidth="1" />
                <rect x="82" y="168" width="2" height="12" fill="#10b981" />
                <line x1="80" y1="192" x2="86" y2="192" stroke="#f59e0b" strokeWidth="1" />
              </g>
            </g>

            {/* 3. GPU in Storage */}
            <g ref={gpuRef} id="gpu-stock">
              <rect x="50" y="235" width="90" height="35" rx="4" fill="#111827" stroke="#3b82f6" strokeWidth="1.5" />
              <rect x="58" y="240" width="74" height="25" rx="2" fill="#1f2937" />
              {/* GPU Fans */}
              <circle cx="75" cy="252" r="10" fill="#111827" stroke="#4b5563" />
              <circle cx="75" cy="252" r="3" fill="#10b981" />
              <circle cx="115" cy="252" r="10" fill="#111827" stroke="#4b5563" />
              <circle cx="115" cy="252" r="3" fill="#10b981" />
              {/* PCIe Bracket */}
              <path d="M 46 238 L 50 238 L 50 262 L 46 262 Z" fill="#9ca3af" />
            </g>
          </g>

          {/* ============================================================ */}
          {/* MOTHERBOARD AREA (Assembly Target) */}
          {/* ============================================================ */}
          <g id="motherboard" transform="translate(140, 20)">
            {/* PCB Board */}
            <rect x="40" y="100" width="260" height="240" rx="8" fill="#090d16" stroke="#1e293b" strokeWidth="2" />
            <rect x="48" y="108" width="244" height="224" rx="6" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1.5" />
            
            {/* Tech traces on PCB */}
            <path d="M 60 120 L 100 120 L 120 140 M 60 300 L 150 300 L 180 270" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" fill="none" />
            <path d="M 280 120 L 240 120 L 220 140 M 280 300 L 240 300 L 220 280" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" fill="none" />

            {/* CPU Socket Target */}
            <g id="cpu-socket" transform="translate(100, 135)">
              {/* Outer slot */}
              <rect x="0" y="0" width="46" height="46" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              {/* Glow element */}
              <rect
                ref={socketGlowRef}
                x="3"
                y="3"
                width="40"
                height="40"
                rx="2"
                fill="#020617"
                stroke="#1e293b"
                strokeWidth="1"
              />
              <path d="M 15 15 L 31 15 L 31 31 L 15 31 Z" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" />
            </g>

            {/* RAM Slots Target */}
            <g id="ram-slots" transform="translate(175, 125)">
              {/* RAM 1 Slot */}
              <rect x="0" y="0" width="6" height="66" rx="1" fill="#0f172a" stroke="#1e293b" />
              {/* RAM 2 Slot */}
              <rect x="12" y="0" width="6" height="66" rx="1" fill="#0f172a" stroke="#1e293b" />

              {/* Glowing snapped RAM indicator */}
              <g ref={ramGlowRef} id="ram-snapped-glow" opacity="0">
                <rect x="0" y="0" width="6" height="66" rx="1" fill="#065f46" stroke="#10b981" strokeWidth="1" />
                <rect x="12" y="0" width="6" height="66" rx="1" fill="#065f46" stroke="#10b981" strokeWidth="1" />
                <line x1="3" y1="10" x2="3" y2="56" stroke="#34d399" strokeWidth="2" strokeDasharray="4,4" />
                <line x1="15" y1="10" x2="15" y2="56" stroke="#34d399" strokeWidth="2" strokeDasharray="4,4" />
              </g>
            </g>

            {/* GPU PCIe Slot Target */}
            <g id="gpu-slot" transform="translate(60, 210)">
              <rect x="0" y="40" width="180" height="12" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <rect
                ref={gpuGlowRef}
                x="2"
                y="42"
                width="176"
                height="8"
                rx="1"
                fill="#020617"
                stroke="#1e293b"
                strokeWidth="1"
              />
            </g>
          </g>

          {/* ============================================================ */}
          {/* ROBOTIC ARM SYSTEM */}
          {/* ============================================================ */}
          {/* Laser connection line from claw to active part */}
          <line
            ref={laserRef}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0"
          />

          <g id="robotic-arm">
            {/* Arm Base fixed on right side */}
            <g transform="translate(500, 100)">
              <rect x="-25" y="-10" width="50" height="20" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
              
              {/* Segment 1 (Upper Arm) */}
              <g ref={armSeg1Ref} id="segment-1" transform="rotate(-60)">
                {/* Structural truss of arm 1 */}
                <line x1="0" y1="0" x2="-140" y2="0" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-140" y2="0" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                <circle cx="-70" cy="0" r="4" fill="#3b82f6" />
                
                {/* Joint 2 */}
                <circle cx="-140" cy="0" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                
                {/* Segment 2 (Forearm) */}
                <g ref={armSeg2Ref} id="segment-2" transform="translate(-140, 0) rotate(-20)">
                  <line x1="0" y1="0" x2="-120" y2="0" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
                  <line x1="0" y1="0" x2="-120" y2="0" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Wrist joint */}
                  <circle cx="-120" cy="0" r="8" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
                  
                  {/* Tool Head / Claw assembly */}
                  <g ref={armClawRef} id="tool-head" transform="translate(-120, 0)">
                    {/* Mounting bracket */}
                    <path d="M 0 -8 L -10 -15 L -20 -15 L -20 15 L -10 15 L 0 8 Z" fill="#334155" />
                    
                    {/* Laser lens emitter */}
                    <circle cx="-15" cy="0" r="4" fill="#10b981" />
                    
                    {/* Upper Claw Prong */}
                    <path d="M -20 -8 C -28 -12 -38 -6 -40 0" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Lower Claw Prong */}
                    <path d="M -20 8 C -28 12 -38 6 -40 0" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Glow indicators */}
                    <circle cx="-6" cy="-6" r="1.5" fill="#10b981" />
                    <circle cx="-6" cy="6" r="1.5" fill="#10b981" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>

        {/* Floating Futuristic HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-background/80 backdrop-blur-md px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground shadow-lg">
            <div className="flex items-center gap-1.5 text-primary">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>ROBOTIC_ASSEMBLY_SYS</span>
            </div>
            <div className="text-[9px] opacity-75 mt-1 font-semibold text-foreground">
              {currentStep}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="rounded-lg border border-success/30 bg-success/10 backdrop-blur-md px-3 py-1 font-mono text-[10px] tracking-wider text-success font-semibold shadow-lg flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
              <span>ENG_STATUS: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Steps Check indicator list on bottom-left */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          {[
            { id: 1, label: "INSTALLATION CPU" },
            { id: 2, label: "SYNCHRO CANAL RAM" },
            { id: 3, label: "CONNEXION GPU" },
          ].map((step) => {
            const isCompleted = stepIndex >= step.id;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-widest backdrop-blur-md transition-all duration-500 ${
                  isCompleted
                    ? "border-success/30 bg-success/5 text-success shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                    : "border-border/40 bg-background/50 text-muted-foreground/60"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                )}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Success HUD screen when finished */}
        {stepIndex === 4 && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
            <div className="h-16 w-16 rounded-full border border-success/40 bg-success/10 flex items-center justify-center text-success shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-[bounce_2s_infinite]">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h4 className="mt-4 font-mono text-xs uppercase tracking-widest text-success font-bold">
              ASSEMBLAGE TERMINÉ AVEC SUCCÈS
            </h4>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs font-mono">
              Composants vérifiés. Compatibilité électrique et thermique validée à 100%.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
