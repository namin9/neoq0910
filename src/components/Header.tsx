import { useLocation, useNavigate } from "react-router-dom";

const titles: Record<string,string> = {
  "/": "홈",
  "/express": "특송",
  "/taxi": "예약 택시",
  "/quick": "퀵서비스",
  "/bullet": "총알 예매",
};

export default function Header() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Proto";

  const goBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav("/");
  };

  const showBack = pathname !== "/";

  return (
    <header className="app-header">
      <div className="left">
        {showBack ? <button className="icon-btn" onClick={goBack}>←</button> : <span/>}
      </div>
      <div className="center">{title}</div>
      <div className="right">
        <button className="icon-btn" aria-label="설정">⚙️</button>
      </div>
    </header>
  );
}
