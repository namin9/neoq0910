import { useEffect, useMemo, useState } from "react";

type Addr = {
  x: string;
  y: string;
  roadAddress?: string;
  jibunAddress?: string;
};

type AddressSuggestion = Addr & { label: string };

type AddressAutocompleteProps = {
  label: string;
  placeholder: string;
  selected: Addr | null;
  onSelect: (addr: Addr | null) => void;
};

const labelOf = (addr: Addr | null) =>
  addr?.roadAddress || addr?.jibunAddress || (addr ? `${addr.y}, ${addr.x}` : "");

async function geocode(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const addresses: Addr[] = data.addresses || [];
  return addresses.map((addr) => ({ ...addr, label: labelOf(addr) }));
}

function AddressAutocomplete({ label, placeholder, selected, onSelect }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState<string>(labelOf(selected));
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(labelOf(selected));
  }, [selected]);

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = window.setTimeout(() => {
      geocode(inputValue)
        .then((list) => {
          if (!cancelled) {
            setSuggestions(list);
          }
        })
        .catch(() => {
          if (!cancelled) setError("주소를 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [inputValue]);

  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (selected) onSelect(null);
          }}
        />
      </label>
      {selected && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setInputValue("");
            onSelect(null);
          }}
        >
          선택 해제
        </button>
      )}
      {loading && <p className="hint">검색 중...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((sug, idx) => (
            <li key={`${sug.x}-${sug.y}-${idx}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(sug);
                  setInputValue(sug.label);
                  setSuggestions([]);
                }}
              >
                {sug.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const km = (la1: number, lo1: number, la2: number, lo2: number) => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(la2 - la1);
  const dLon = toRad(lo2 - lo1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateFare = (distanceKm: number) => 3800 + Math.max(0, distanceKm - 1.6) * 1000 * (100 / 132);

export default function Taxi() {
  const [pickup, setPickup] = useState<Addr | null>(null);
  const [dropoff, setDropoff] = useState<Addr | null>(null);
  const [rideDateTime, setRideDateTime] = useState<string>("");
  const [passengers, setPassengers] = useState<string>("1");
  const [memo, setMemo] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<{ distance: number; fare: number } | null>(null);

  const formattedPickup = useMemo(() => labelOf(pickup), [pickup]);
  const formattedDropoff = useMemo(() => labelOf(dropoff), [dropoff]);

  const validate = () => {
    const validationErrors: string[] = [];
    if (!pickup) validationErrors.push("출발지를 선택하세요.");
    if (!dropoff) validationErrors.push("도착지를 선택하세요.");
    if (!rideDateTime) validationErrors.push("탑승 일시를 입력하세요.");
    const passengerNumber = Number(passengers);
    if (!passengers || Number.isNaN(passengerNumber) || passengerNumber < 1) {
      validationErrors.push("탑승 인원을 1명 이상으로 입력하세요.");
    } else if (passengerNumber > 10) {
      validationErrors.push("탑승 인원은 10명을 초과할 수 없습니다.");
    }
    if (memo.length > 200) validationErrors.push("메모는 200자 이내로 작성해주세요.");
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleEstimate = () => {
    const hasAddressErrors = [] as string[];
    if (!pickup) hasAddressErrors.push("출발지를 선택하세요.");
    if (!dropoff) hasAddressErrors.push("도착지를 선택하세요.");
    if (hasAddressErrors.length) {
      setErrors(hasAddressErrors);
      setEstimate(null);
      return;
    }
    if (!pickup || !dropoff) return;
    const distance = km(+pickup.y, +pickup.x, +dropoff.y, +dropoff.x);
    const fare = estimateFare(distance);
    setEstimate({ distance, fare });
    setErrors([]);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (!pickup || !dropoff) return;
    const passengerNumber = Number(passengers);
    const summary = [
      `📍 출발지: ${formattedPickup}`,
      `🏁 도착지: ${formattedDropoff}`,
      `🕒 일시: ${new Date(rideDateTime).toLocaleString()}`,
      `🧑‍🤝‍🧑 인원: ${passengerNumber}명`,
      memo ? `📝 메모: ${memo}` : null,
      estimate
        ? `💰 예상 요금: 약 ${Math.round(estimate.fare).toLocaleString()}원 (거리 ${estimate.distance.toFixed(1)}km)`
        : "💬 예상 요금 버튼으로 대략적인 요금을 확인할 수 있어요.",
    ]
      .filter(Boolean)
      .join("\n");
    window.alert(`예약 요청(데모)\n\n${summary}`);
  };

  return (
    <div className="page taxi-page">
      <h1>예약 택시</h1>
      <div className="form">
        <AddressAutocomplete
          label="출발지"
          placeholder="건물명, 도로명, 지번 등"
          selected={pickup}
          onSelect={setPickup}
        />
        <AddressAutocomplete
          label="도착지"
          placeholder="목적지 검색"
          selected={dropoff}
          onSelect={setDropoff}
        />
        <div className="field">
          <label>
            <span>탑승 일시</span>
            <input
              type="datetime-local"
              value={rideDateTime}
              onChange={(e) => setRideDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </label>
        </div>
        <div className="field">
          <label>
            <span>탑승 인원</span>
            <input
              type="number"
              min={1}
              max={10}
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
            />
          </label>
        </div>
        <div className="field">
          <label>
            <span>요청 메모</span>
            <textarea
              placeholder="기사님께 전달할 내용을 작성하세요 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </label>
          <p className="hint">{memo.length}/200</p>
        </div>
        <div className="actions">
          <button type="button" onClick={handleEstimate}>
            요금 대략 보기
          </button>
          <button type="button" className="primary" onClick={handleSubmit}>
            예약 요청(데모)
          </button>
        </div>
        {errors.length > 0 && (
          <div className="error-box" role="alert">
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {estimate && (
          <div className="card estimate">
            <h2>예상 요금 안내</h2>
            <p>
              거리 약 <strong>{estimate.distance.toFixed(1)} km</strong>
            </p>
            <p>
              요금 약 <strong>{Math.round(estimate.fare).toLocaleString()}원</strong>
            </p>
            <p className="hint">실제 요금은 교통 상황 및 요금 정책에 따라 달라질 수 있어요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
