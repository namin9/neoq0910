import { Link } from "react-router-dom";

const Card = ({ to, emoji, title }: {to:string; emoji:string; title:string}) => (
  <Link to={to} className="tile">
    <div className="tile-emoji">{emoji}</div>
    <div className="tile-title">{title}</div>
  </Link>
);

export default function Home() {
  return (
    <div className="grid">
      <Card to="/express" emoji="🚚" title="특송" />
      <Card to="/taxi"    emoji="🚖" title="예약 택시" />
      <Card to="/quick"   emoji="📦" title="퀵서비스" />
      <Card to="/bullet"  emoji="🎟️" title="총알 예매" />
    </div>
  );
}
