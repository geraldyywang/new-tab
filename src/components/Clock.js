import { useState, useEffect } from "react";

const Clock = () => {
  // State to keep track of the current local time
  const [time, setTime] = useState(new Date());

  // Function to update the time
  const refreshTime = () => {
    setTime(new Date());
  };

  // Set an interval to update time
  useEffect(() => {
    const clockID = setInterval(refreshTime, 1000);
    return () => {
      clearInterval(clockID);
    };
  }, []);

  return (
    <div className="flex flex-col justify-center items-center px-5 py-5 max-w-xl">
      <p className="font-bold text-7xl text-neutral-500">
        {time.toLocaleString("en-US")}
      </p>
    </div>
  );
};

export default Clock;
