import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const saved = localStorage.getItem("theme");
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.setAttribute("data-theme", saved ?? (prefersDark ? "dark" : "light"));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App/></React.StrictMode>
)
