import {useState} from 'react';
import {FiSettings} from 'react-icons/fi';
import {BackgroundLayer} from '../features/background/BackgroundLayer';
import {Clock} from '../features/clock/Clock';
import {HelpfulLinks} from '../features/links/HelpfulLinks';
import {Weather} from '../features/weather/Weather';
import {Socials} from '../features/links/Socials';
import {ThemeSync} from '../features/appearance/ThemeSync';
import {SettingsDialog} from '../settings/SettingsDialog';
import {Card} from '../ui/Card';
import {focusRingClass, surfaceAttributes} from '../ui/styles';

/** The new tab page. */
export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <BackgroundLayer />

      {/* new_tab() title and settings button */}
      <div className="absolute z-20 top-0 left-0 m-3 flex items-stretch gap-2">
        <Card>
          <h1 className="text-fg-subtle font-bold p-4 text-3xl">new_tab()</h1>
        </Card>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
          {...surfaceAttributes(
            'solid',
            `flex items-center justify-center px-4 text-2xl text-fg-subtle hover:text-fg-faint ${focusRingClass}`,
          )}
        >
          <FiSettings aria-hidden="true" />
        </button>
      </div>

      {/* Main Screen */}
      <div className="flex flex-col min-h-screen justify-center items-center">
        <div className="max-w-xl">
          <Card className="mx-3">
            <Clock />
          </Card>

          <Card className="px-2.5 mx-3 mt-1">
            <Weather onOpenSettings={() => setSettingsOpen(true)} />
          </Card>
        </div>
      </div>

      {/* Quick-access side bar */}
      <HelpfulLinks />

      {/* Socials bottom-left bar */}
      <Socials />

      <p className="absolute z-20 bottom-3 right-24 text-fg-subtle text-sm text-shadow-sm text-shadow-dim/60">
        Made with &#128156; by geraldyywang
      </p>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ThemeSync />
    </>
  );
}
