"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TimeData {
  id: number;
  date: string;
  seconds: number;
}

export default function Home(): JSX.Element {
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [maxSeconds, setMaxSeconds] = useState<number>(0);
  const [minSeconds, setMinSeconds] = useState<number>(0);
  const [avgSeconds, setAvgSeconds] = useState<number>(0);
  const [goodDataCount, setGoodDataCount] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://localhost:9000/time-data");
        const responseData = await response.json();
        const data: TimeData[] = responseData.data.map((item: TimeData) => ({
          ...item,
          date: formatDate(item.date),
        }));
        console.log("Data from backend:", data);
        setTimeData(data);
        calculateStatistics(data);
        countGoodData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Function to format date to dd/mm/yyyy
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Function to calculate maximum, minimum, and average seconds
  const calculateStatistics = (data: TimeData[]) => {
    const secondsArray = data.map((item) => item.seconds);
    const max = Math.max(...secondsArray);
    const min = Math.min(...secondsArray);
    const avg =
      secondsArray.reduce((acc, val) => acc + val, 0) / secondsArray.length;
    setMaxSeconds(max);
    setMinSeconds(min);
    setAvgSeconds(avg);
  };

  // Function to count good data (time greater than 300 seconds)
  const countGoodData = (data: TimeData[]) => {
    const goodData = data.filter((item) => item.seconds > 300);
    setGoodDataCount(goodData.length);
  };

  return (
    <div className="h-screen flex flex-col bg-white p-5">
      <div className="flex flex-row w-fit text-black font-bold text-[20px] items-center p-1 rounded-lg text-black font-semibold hover:bg-gray-300">
        <Link href="camera">Camera</Link>
        <span className="material-symbols-outlined">double_arrow</span>
      </div>

      <div className="flex flex-row gap-10 my-5">
        <div className="w-1/2 bg-green-200 p-4 rounded-lg text-center">
          <h2 className="text-green-800 font-bold text-lg">
            Good Data: {goodDataCount}
          </h2>
        </div>
        <div className="w-1/2 bg-red-200 p-4 rounded-lg text-center">
          <h2 className="text-red-800 font-bold text-lg">
            Not Good Data: {timeData.length - goodDataCount}
          </h2>
        </div>
      </div>

      <div className="gap-10 my-5 md:flex md:flex-row xs:flex">
        <div className="flex flex-col w-full sm:w-1/2 gap-2 bg-blue-200 p-4 rounded-lg text-center">
          <div className="text-black flex flex-row gap-2 justify-center ">
            <div className="font-bold text-md">Max:</div> {maxSeconds}
          </div>
          <div className="text-black flex flex-row gap-2 justify-center">
            <div className="font-bold text-md">Min:</div> {minSeconds}
          </div>
          <div className="text-black flex flex-row gap-2 justify-center">
            <div className="font-bold text-md ">Average:</div>{" "}
            {avgSeconds.toFixed(2)}
          </div>
        </div>

        <div className="w-full sm:w-1/2 bg-gray-200 p-4 rounded-lg text-center mt-5 sm:mt-0">
          <div className="text-black mb-2 font-bold text-lg">All Recorded</div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <ul className="text-black flex flex-col">
              {timeData.map((item: TimeData) => (
                <li
                  className="flex flex-row gap-[25px] justify-left items-center md:justify-center"
                  key={item.id}
                >
                  <div>{item.id}</div>
                  <div>Date: {item.date}</div>
                  <div>Time: {item.seconds} seconds</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
