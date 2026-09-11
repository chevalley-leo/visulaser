import { CanvasView } from "./components/CanvasView";
import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { SceneList } from "./components/SceneList";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">Visulaser</header>
      <div className="app-body">
        <aside className="left-panel">
          <Toolbar />
        </aside>
        <main className="center-panel">
          <CanvasView />
        </main>
        <aside className="right-panel">
          <PropertiesPanel />
          <SceneList />
        </aside>
      </div>
    </div>
  );
}

export default App;
