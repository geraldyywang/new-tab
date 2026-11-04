import {useState} from 'react';
import {FiSettings} from 'react-icons/fi';
import {Clock} from './components/Clock';
import {HelpfulLinks} from './components/HelpfulLinks';
import {Weather} from './components/Weather';
import {Socials} from './components/Socials';
import {SettingsDialog} from './components/settings/SettingsDialog';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* new_tab() title and settings button */}
      <div className="absolute z-20 top-0 left-0 m-3 flex items-stretch gap-2">
        <div className="bg-neutral-900 rounded-xl">
          <h1 className="text-neutral-500 font-bold p-4 text-3xl">new_tab()</h1>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
          className="flex items-center justify-center rounded-xl bg-neutral-900 px-4 text-2xl text-neutral-500 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
        >
          <FiSettings aria-hidden="true" />
        </button>
      </div>

      {/* Main Screen */}
      <div className="flex flex-col min-h-screen justify-center items-center bg-stone-800">
        <div className="max-w-xl">
          <div className="bg-neutral-900 rounded-xl mx-3">
            <Clock />
          </div>

          <div className="bg-neutral-900 rounded-xl px-2.5 mx-3 mt-1">
            <Weather onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        </div>
      </div>

      {/* Quick-access side bar */}
      <HelpfulLinks />

      {/* Socials bottom-left bar */}
      <Socials />

      <p className="absolute z-20 bottom-3 right-24 text-neutral-500 text-sm">
        Made with &#128156; by geraldyywang
      </p>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
