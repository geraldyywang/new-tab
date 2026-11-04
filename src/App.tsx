import {useState} from 'react';
import {FiSettings} from 'react-icons/fi';
import {Clock} from './components/Clock';
import {HelpfulLinks} from './components/HelpfulLinks';
import {Weather} from './components/Weather';
import {Socials} from './components/Socials';
import {SettingsDialog} from './components/settings/SettingsDialog';

/** The new tab page. */
export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* new_tab() title and settings button */}
      <div className="absolute z-20 top-0 left-0 m-3 flex items-stretch gap-2">
        <div className="bg-surface rounded-xl">
          <h1 className="text-fg-subtle font-bold p-4 text-3xl">new_tab()</h1>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
          className="flex items-center justify-center rounded-xl bg-surface px-4 text-2xl text-fg-subtle hover:text-fg-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <FiSettings aria-hidden="true" />
        </button>
      </div>

      {/* Main Screen */}
      <div className="flex flex-col min-h-screen justify-center items-center bg-backdrop">
        <div className="max-w-xl">
          <div className="bg-surface rounded-xl mx-3">
            <Clock />
          </div>

          <div className="bg-surface rounded-xl px-2.5 mx-3 mt-1">
            <Weather onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        </div>
      </div>

      {/* Quick-access side bar */}
      <HelpfulLinks />

      {/* Socials bottom-left bar */}
      <Socials />

      <p className="absolute z-20 bottom-3 right-24 text-fg-subtle text-sm">
        Made with &#128156; by geraldyywang
      </p>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
