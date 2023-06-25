import logo from "./logo.svg";
import "./App.css";
import Clock from "./components/Clock";

function App() {
  return (
    <div className="flex flex-col min-h-screen justify-center items-center">
      <div>
        <Clock />
      </div>
    </div>
  );
}

export default App;
