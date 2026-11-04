import {useEffect, useState} from 'react';

/** Large clock showing the local date and time, updated every second. */
export function Clock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const clockId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center px-5 py-5">
      <p className="font-bold text-7xl text-fg-subtle">
        {time.toLocaleString('en-US')}
      </p>
    </div>
  );
}
