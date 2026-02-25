import { AppShell } from "./components/layout/AppShell";
import { useThemeInit } from "./hooks/useTheme";

function App() {
  useThemeInit();
  return <AppShell />;
}

export default App;
