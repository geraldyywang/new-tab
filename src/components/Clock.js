import { useState, useEffect } from "react";

const Clock = () => {
  const [time, setTime] = useState(new Date());

  const refreshTime = () => {
    setTime(new Date());
  };

  useEffect(() => {
    const clockID = setInterval(refreshTime, 1000);
    return () => {
      clearInterval(clockID);
    };
  }, []);

  return (
    <div>
      <p className="font-bold">{time.toLocaleString("en-US")}</p>
    </div>
  );
};

export default Clock;
