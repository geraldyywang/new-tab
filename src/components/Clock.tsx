import {useEffect, useState} from 'react';

const Clock = () => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const clockId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center px-5 py-5">
      <p className="font-bold text-7xl text-neutral-500">
        {time.toLocaleString('en-US')}
      </p>
    </div>
  );
};

export default Clock;
