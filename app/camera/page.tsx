"use client";
import { useEffect, useRef, useState } from "react";
import { useAnimationFrame } from "@/lib/hooks/useAnimationFrame";
import { drawHands } from "@/lib/utils";
import {
  createDetector,
  SupportedModels,
} from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
import Link from "next/link";

import axios from 'axios';

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm`
);

async function setupVideo(): Promise<HTMLVideoElement | undefined> {
  if (
    typeof window === "undefined" ||
    !window.navigator ||
    !window.navigator.mediaDevices
  ) {
    return undefined;
  }

  const video: HTMLVideoElement = document.getElementById(
    "video"
  ) as HTMLVideoElement;
  const stream: MediaStream = await window.navigator.mediaDevices.getUserMedia({
    video: true,
  });

  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      resolve();
    };
  });
  video.play();

  video.width = video.videoWidth;
  video.height = video.videoHeight;

  return video;
}

async function setupHandDetector(): Promise<any> {
  const model = SupportedModels.MediaPipeHands;
  const detector = await createDetector(model, {
    runtime: "mediapipe",
    maxHands: 2,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
  });
  return detector;
}

async function setupCanvas(video: {
  width: number;
  height: number;
}): Promise<CanvasRenderingContext2D | undefined> {
  if (!video) {
    return undefined;
  }

  const canvas: HTMLCanvasElement = document.getElementById(
    "canvas"
  ) as HTMLCanvasElement;
  const ctx: CanvasRenderingContext2D | any = canvas.getContext("2d");

  canvas.width = video.width;
  canvas.height = video.height;

  return ctx;
}

export default function CombinedDetection() {
  const handDetectorRef = useRef<any>();
  const videoRef = useRef<HTMLVideoElement>();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | undefined>();
  const [handInfo, setHandInfo] = useState<string>("");
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const updateTimer = () => {
    setTimer((prevTimer) => prevTimer + 1);
  };

  useEffect(() => {
    async function initialize() {
      videoRef.current = await setupVideo();
      if (!videoRef.current) return;
      const ctx = await setupCanvas(videoRef.current);
      handDetectorRef.current = await setupHandDetector();

      setCtx(ctx);
    }

    initialize();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timerRunning) {
        updateTimer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    let timerStopTimeout: NodeJS.Timeout;

    if (timer !== 0 && !timerRunning) {
      timerStopTimeout = setTimeout(() => {
        console.log("Timer stopped for 5 seconds");

        sendTimerToBackend(timer);

        setTimer(0);
      }, 5000);
    }

    return () => clearTimeout(timerStopTimeout);
  }, [timer, timerRunning]);

  const sendTimerToBackend = async (timerValue: number) => {
    try {
      // Make an HTTP POST request to the backend endpoint
      await axios.post('http://localhost:9000/time-data', { seconds: timerValue });
      console.log("Timer value sent to the backend:", timerValue);
    } catch (error) {
      console.error("Error sending timer value to backend:", error);
    }
  };

  useAnimationFrame(async () => {
    if (ctx && videoRef.current && handDetectorRef.current) {
      const [hands] = await Promise.all([
        handDetectorRef.current.estimateHands(videoRef.current),
      ]);

      ctx.clearRect(
        0,
        0,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );
      ctx.drawImage(videoRef.current, 0, 0);

      if (hands.length === 2) {
        setHandInfo("Both Hands Detected");
        setTimerRunning(true);
      } else if (hands.length === 1) {
        const handLabel =
          hands[0].handedness === "Right"
            ? "Left Hand Detected"
            : "Right Hand Detected";
        setHandInfo(handLabel);
        setTimerRunning(true);
      } else {
        setHandInfo("No Hands Detected");
        setTimerRunning(false);
      }

      drawHands(hands, ctx);
    }
  }, !!handDetectorRef.current && !!videoRef.current && !!ctx);

  return (
    <div className="h-screen flex flex-col bg-white p-5">
      <div className="flex flex-row text-black font-bold text-[20px] items-center hover:bg-gray-300 hover: w-fit p-1 rounded-lg">
        <span className="material-symbols-outlined ">
          keyboard_double_arrow_left
        </span>
        
        <Link className="text-black font-semibold" href="/">
          Dashboard
        </Link>
      </div>
      <div className="flex flex-col gap-12 w-fit m-auto relative">
        <div className="text-black font-bold text-[24px] text-center mb-2">
          Camera 1
        </div>
        <canvas
          style={{
            transform: "scaleX(-1)",
            zIndex: 1,
            borderRadius: "1rem",
            boxShadow: "0 3px 10px rgb(0 0 0)",
            width: "100%",
            height: "auto",
          }}
          id="canvas"
        ></canvas>
        <video
          style={{
            visibility: "hidden",
            transform: "scaleX(-1)",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "auto",
          }}
          id="video"
          playsInline
        ></video>
        <div className="text-black text-center">
          {handInfo} - Timer: {formatTime(timer)}
        </div>
      </div>
    </div>
  );
}

const formatTime = (time: any) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");
  return `${formattedMinutes}:${formattedSeconds}`;
};
