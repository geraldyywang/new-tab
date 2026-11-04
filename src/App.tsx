import Clock from "./components/Clock";
import HelpfulLinks from "./components/HelpfulLinks";
import Weather from "./components/Weather";
import Socials from "./components/Socials";

function App() {
  return (
    <>
      {/* new_tab() title */}
      <div className="absolute z-20 top-0 left-0 bg-neutral-900 rounded-xl m-3">
        <h1 className="text-neutral-500 font-bold p-4 text-3xl">new_tab()</h1>
      </div>

      {/* Main Screen */}
      <div className="flex flex-col min-h-screen justify-center items-center bg-stone-800">
        <div className="max-w-xl">
          <div className="bg-neutral-900 rounded-xl mx-3">
            <Clock />
          </div>

          <div className="bg-neutral-900 rounded-xl px-2.5 mx-3 mt-1">
            <Weather />
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
    </>
  );
}

export default App;
