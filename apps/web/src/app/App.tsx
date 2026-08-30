import { AppRoutes } from "../routes/AppRoutes";
import { AppShell } from "./AppShell";

export default function App() {
  return <AppShell><AppRoutes/></AppShell>;
}
