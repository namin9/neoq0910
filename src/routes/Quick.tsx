import { useMemo, useState } from "react";

type SizeOption = "small" | "medium" | "large";
type UrgencyLevel = "standard" | "express" | "priority";

type QuickFormState = {
  pickup: string;
  dropoff: string;
  distance: string;
  itemType: string;
  size: SizeOption;
  weight: string;
  urgency: UrgencyLevel;
};

const pickupSuggestions = [
  "서울특별시 중구 세종대로 110",
  "서울특별시 강남구 테헤란로 231",
  "서울특별시 마포구 월드컵북로 400",
  "인천광역시 남동구 정각로 29"
];

const dropoffSuggestions = [
  "경기도 성남시 분당구 불정로 6",
  "경기도 용인시 처인구 중부대로 1199",
  "서울특별시 송파구 올림픽로 300",
  "부산광역시 해운대구 센텀남대로 35"
];

const sizeOptions: Record<SizeOption, { label: string; volumeFactor: number }> = {
  small: { label: "소형 (택배 박스 기준)", volumeFactor: 1 },
  medium: { label: "중형 (소형 가전 포함)", volumeFactor: 1.4 },
  large: { label: "대형 (사무용/가구)", volumeFactor: 2.1 }
};

const urgencyOptions: Record<
  UrgencyLevel,
  { label: string; multiplier: number; description: string }
> = {
  standard: {
    label: "일반",
    multiplier: 1,
    description: "당일 내 상시 배차"
  },
  express: {
    label: "긴급",
    multiplier: 1.35,
    description: "4시간 이내 픽업"
  },
  priority: {
    label: "즉시",
    multiplier: 1.6,
    description: "1시간 이내 즉시 배차"
  }
};

const itemTypes = [
  "서류/문서",
  "식품",
  "전자제품",
  "의류",
  "생활잡화",
  "기타"
];

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW"
});

const calculateEstimate = (
  distanceKm: number,
  size: SizeOption,
  weightKg: number,
  urgency: UrgencyLevel
) => {
  if (!distanceKm || distanceKm <= 0) {
    return 0;
  }

  const baseFare = 6000;
  const distanceFactor = 1200; // km 당 요금
  const weightSurchargePerKg = 250; // kg 당 추가 요금

  const sizeFactor = sizeOptions[size].volumeFactor;
  const urgencyMultiplier = urgencyOptions[urgency].multiplier;

  const distanceCharge = distanceKm * distanceFactor;
  const weightSurcharge = Math.max(weightKg - 5, 0) * weightSurchargePerKg; // 5kg 초과 시 추가 요금

  const estimate = (baseFare + distanceCharge + weightSurcharge) * sizeFactor * urgencyMultiplier;

  return Math.round(estimate / 100) * 100; // 100원 단위 절사
};

const Quick = () => {
  const [form, setForm] = useState<QuickFormState>({
    pickup: "",
    dropoff: "",
    distance: "",
    itemType: itemTypes[0],
    size: "small",
    weight: "1",
    urgency: "standard"
  });

  const [showSummary, setShowSummary] = useState(false);

  const estimatedFare = useMemo(() => {
    const distanceKm = parseFloat(form.distance) || 0;
    const weightKg = parseFloat(form.weight) || 0;

    return calculateEstimate(distanceKm, form.size, weightKg, form.urgency);
  }, [form.distance, form.size, form.weight, form.urgency]);

  const handleChange = (
    key: keyof QuickFormState,
    value: QuickFormState[keyof QuickFormState]
  ) => {
    setShowSummary(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    setShowSummary(true);

    // 확장 대비: API/Webhook 연동 자리
    // example:
    // webhookClient.send({ ...form, estimatedFare });
  };

  return (
    <div className="page">
      <h1>퀵서비스</h1>

      <section className="card">
        <h2>경로 및 화물 정보</h2>
        <div className="form-grid">
          <label className="form-field">
            <span>픽업지</span>
            <input
              type="text"
              value={form.pickup}
              onChange={(event) => handleChange("pickup", event.target.value)}
              placeholder="픽업 주소를 입력하세요"
              list="pickup-suggestions"
            />
            <datalist id="pickup-suggestions">
              {pickupSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </label>

          <label className="form-field">
            <span>도착지</span>
            <input
              type="text"
              value={form.dropoff}
              onChange={(event) => handleChange("dropoff", event.target.value)}
              placeholder="도착지 주소를 입력하세요"
              list="dropoff-suggestions"
            />
            <datalist id="dropoff-suggestions">
              {dropoffSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </label>

          <label className="form-field">
            <span>거리 (km)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.distance}
              onChange={(event) => handleChange("distance", event.target.value)}
              placeholder="예: 12.5"
            />
          </label>

          <label className="form-field">
            <span>물품 종류</span>
            <select
              value={form.itemType}
              onChange={(event) => handleChange("itemType", event.target.value)}
            >
              {itemTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>물품 크기</span>
            <select
              value={form.size}
              onChange={(event) => handleChange("size", event.target.value as SizeOption)}
            >
              {Object.entries(sizeOptions).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>물품 무게 (kg)</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.weight}
              onChange={(event) => handleChange("weight", event.target.value)}
              placeholder="예: 3.5"
            />
          </label>

          <label className="form-field">
            <span>긴급도</span>
            <select
              value={form.urgency}
              onChange={(event) => handleChange("urgency", event.target.value as UrgencyLevel)}
            >
              {Object.entries(urgencyOptions).map(([value, { label, description }]) => (
                <option key={value} value={value}>
                  {label} - {description}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <h2>예상 요금</h2>
        <p>
          거리, 부피, 무게, 긴급도 가중치를 반영한 예상 요금은 아래에서
          확인하세요.
        </p>
        <div className="estimate">
          <span>예상 요금</span>
          <strong>{estimatedFare ? currencyFormatter.format(estimatedFare) : "-"}</strong>
        </div>
      </section>

      <section className="card actions">
        <button type="button" onClick={handleSubmit}>
          접수(데모)
        </button>
      </section>

      {showSummary && (
        <section className="card">
          <h2>접수 정보 요약</h2>
          <ul className="summary">
            <li>
              <strong>경로</strong>: {form.pickup || "(미입력)"} → {form.dropoff || "(미입력)"}
            </li>
            <li>
              <strong>거리</strong>: {form.distance ? `${form.distance} km` : "(미입력)"}
            </li>
            <li>
              <strong>물품 종류</strong>: {form.itemType}
            </li>
            <li>
              <strong>물품 크기</strong>: {sizeOptions[form.size].label}
            </li>
            <li>
              <strong>물품 무게</strong>: {form.weight ? `${form.weight} kg` : "(미입력)"}
            </li>
            <li>
              <strong>긴급도</strong>: {urgencyOptions[form.urgency].label}
            </li>
            <li>
              <strong>예상 요금</strong>: {estimatedFare ? currencyFormatter.format(estimatedFare) : "-"}
            </li>
          </ul>
        </section>
      )}
    </div>
  );
};

export default Quick;
