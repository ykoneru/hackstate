import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SharedApp } from "./share/SharedApp";
import "./styles.css";

const shared = window.location.pathname.match(/^\/s\/([\w-]+)\/?$/);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{shared ? <SharedApp id={shared[1]} /> : <App />}</StrictMode>,
);
