import {useEffect, useState} from 'react';
import {usePreviewedSlice} from '../../settings/slicePreview';
import {joinClasses} from '../../ui/styles';
import {CLOCK_FONT_STACKS, formatClock} from './clockFormat';
import {clockSlice} from './settings';

/** Large clock showing the local date and time, updated every second. */
export function Clock() {
  const [time, setTime] = useState(() => new Date());
  const {loaded, value: settings} = usePreviewedSlice(clockSlice);

  useEffect(() => {
    const clockId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center px-5 py-5">
      <p
        // Hidden, but keeping its size, until the saved format is known
        className={joinClasses(
          'font-bold text-7xl text-fg-subtle',
          !loaded && 'invisible',
        )}
        style={{fontFamily: CLOCK_FONT_STACKS[settings.font]}}
      >
        {formatClock(time, settings)}
      </p>
    </div>
  );
}
